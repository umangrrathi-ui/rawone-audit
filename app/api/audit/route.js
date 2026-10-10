import { NextResponse, after } from "next/server";
import { db } from "@/lib/supabase";
import { runAudit } from "@/lib/pipeline";
import { INDUSTRIES } from "@/lib/benchmarks";
import { makeCode, normalizeHandle, normalizePhone, isMapsUrl } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple in-memory IP limiter (single PM2 instance). 8 audits / IP / hour.
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
const DAY = 24 * 3600 * 1000;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request");
  }

  // honeypot — bots fill every field
  if (body.company_website) return bad("Invalid request");

  // Nginx sets X-Real-IP from the socket (can't be spoofed by the client)
  const ip = req.headers.get("x-real-ip") || (req.headers.get("x-forwarded-for") || "").split(",").pop().trim() || "unknown";
  if (ipLimited(ip)) return bad("Bahut saare audits ek saath. 1 ghante baad try karo.", 429);

  const name = String(body.name || "").trim().slice(0, 80);
  const whatsapp = normalizePhone(body.whatsapp);
  const handle = normalizeHandle(body.ig);
  const gmbUrl = String(body.gmb || "").trim() || null;
  const industry = String(body.industry || "");

  if (name.length < 2) return bad("Apna naam daalo.");
  if (!whatsapp) return bad("Sahi WhatsApp number daalo (10 digit).");
  if (!handle) return bad("Sahi Instagram handle ya profile link daalo.");
  if (gmbUrl && !isMapsUrl(gmbUrl)) return bad("Google Maps ka link sahi nahi lag raha. Maps app mein apna business kholo → Share → Copy link.");
  if (!INDUSTRIES[industry]) return bad("Industry select karo.");

  const since = new Date(Date.now() - DAY).toISOString();

  // 1) Same handle within 24h → reuse report (saves Apify cost)
  const { data: cached } = await db()
    .from("audits")
    .select("id, code, status, created_at")
    .eq("ig_handle", handle)
    .gte("created_at", since)
    .in("status", ["done", "running"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (cached?.[0]) {
    const c = cached[0];
    // a "running" row older than 5 min is stuck — ignore it
    if (c.status === "done" || Date.now() - new Date(c.created_at).getTime() < 5 * 60_000) {
      return NextResponse.json({ id: c.id, code: c.code, status: c.status, cached: true });
    }
  }

  // 2) One audit per WhatsApp number per 24h
  const { data: byNumber } = await db()
    .from("audits")
    .select("id, ig_handle")
    .eq("whatsapp", whatsapp)
    .gte("created_at", since)
    .neq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(1);
  if (byNumber?.[0]) {
    return bad(`Is number se aaj ek audit (@${byNumber[0].ig_handle}) ho chuka hai. Kal dobara try karo.`, 429, {
      reportId: byNumber[0].id,
    });
  }

  // 3) Create row (retry on code collision)
  let row;
  for (let i = 0; i < 4 && !row; i++) {
    const { data, error } = await db()
      .from("audits")
      .insert({
        code: makeCode(),
        name,
        whatsapp,
        industry,
        ig_handle: handle,
        gmb_url: gmbUrl,
        status: "running",
        step: "Audit shuru ho raha hai",
        ip,
      })
      .select("*")
      .single();
    if (!error) row = data;
    else if (error.code !== "23505") {
      console.error("[audit insert]", error);
      return bad("Server error. Thodi der mein try karo.", 500);
    }
  }
  if (!row) return bad("Server error. Thodi der mein try karo.", 500);

  // Run after the response is sent (PM2 keeps the process alive)
  after(() => runAudit(row));

  return NextResponse.json({ id: row.id, code: row.code, status: "running" });
}
