import { NextResponse, after } from "next/server";
import { db } from "@/lib/supabase";
import { runAudit } from "@/lib/pipeline";
import { INDUSTRIES } from "@/lib/benchmarks";
import { makeCode, normalizeHandle, normalizePhone, isMapsUrl } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Limits (lifetime). Same handle within 24h just reopens the cached report and doesn't count.
const PER_HANDLE = Number(process.env.AUDIT_LIMIT_PER_HANDLE || 2);
const PER_NUMBER = Number(process.env.AUDIT_LIMIT_PER_NUMBER || 2);
const DAY = 24 * 3600 * 1000;

// Simple in-memory IP limiter (single container). 8 audits / IP / hour.
const hits = new Map();
function ipLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 8;
}

const bad = (msg, status = 400, extra = {}) => NextResponse.json({ error: msg, ...extra }, { status });

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request.");
  }
  if (body.company_website) return bad("Invalid request."); // honeypot

  // Traefik/Nginx set X-Real-IP from the socket
  const ip = req.headers.get("x-real-ip") || (req.headers.get("x-forwarded-for") || "").split(",").pop().trim() || "unknown";
  if (ipLimited(ip)) return bad("Too many audits from this network. Please try again in an hour.", 429);

  const name = String(body.name || "").trim().slice(0, 80);
  const whatsapp = normalizePhone(body.whatsapp);
  const handle = normalizeHandle(body.ig);
  const gmbUrl = String(body.gmb || "").trim() || null;
  const industry = String(body.industry || "");

  if (name.length < 2) return bad("Please enter your name.");
  if (!whatsapp) return bad("Please enter a valid 10-digit WhatsApp number.");
  if (!handle) return bad("Please enter a valid Instagram handle or profile link.");
  if (gmbUrl && !isMapsUrl(gmbUrl)) return bad("That doesn't look like a Google Maps business link. Open your business on Google Maps → Share → Copy link.");
  if (!INDUSTRIES[industry]) return bad("Please select your industry.");

  const live = ["done", "running"];

  // 1) Same handle within 24h → reopen that report (saves Apify cost, doesn't count)
  const { data: recent } = await db()
    .from("audits")
    .select("id, code, status, created_at")
    .eq("ig_handle", handle)
    .gte("created_at", new Date(Date.now() - DAY).toISOString())
    .in("status", live)
    .order("created_at", { ascending: false })
    .limit(1);
  if (recent?.[0]) {
    const c = recent[0];
    if (c.status === "done" || Date.now() - new Date(c.created_at).getTime() < 5 * 60_000) {
      return NextResponse.json({ id: c.id, code: c.code, status: c.status, handle, cached: true });
    }
  }

  // 2) Max N audits per Instagram handle (lifetime)
  const { data: byHandle, count: handleCount } = await db()
    .from("audits")
    .select("id", { count: "exact" })
    .eq("ig_handle", handle)
    .in("status", live)
    .order("created_at", { ascending: false })
    .limit(1);
  if ((handleCount || 0) >= PER_HANDLE) {
    return bad(
      `@${handle} has already been audited ${PER_HANDLE} times. Want a fresh, deeper look? Talk to our team.`,
      429,
      { reportId: byHandle?.[0]?.id }
    );
  }

  // 3) Max N audits per WhatsApp number (lifetime)
  const { data: byNumber, count: numberCount } = await db()
    .from("audits")
    .select("id", { count: "exact" })
    .eq("whatsapp", whatsapp)
    .in("status", live)
    .order("created_at", { ascending: false })
    .limit(1);
  if ((numberCount || 0) >= PER_NUMBER) {
    return bad(`This number has already used its ${PER_NUMBER} free audits.`, 429, { reportId: byNumber?.[0]?.id });
  }

  // 4) Create row (retry on code collision)
  let row;
  for (let i = 0; i < 4 && !row; i++) {
    const { data, error } = await db()
      .from("audits")
      .insert({ code: makeCode(), name, whatsapp, industry, ig_handle: handle, gmb_url: gmbUrl, status: "running", step: "Scanning Instagram", ip })
      .select("*")
      .single();
    if (!error) row = data;
    else if (error.code !== "23505") {
      console.error("[audit insert]", error);
      return bad("Server error. Please try again in a moment.", 500);
    }
  }
  if (!row) return bad("Server error. Please try again in a moment.", 500);

  after(() => runAudit(row));
  return NextResponse.json({ id: row.id, code: row.code, status: "running", handle });
}
