import { NextResponse, after } from "next/server";
import { db, getAudit } from "@/lib/supabase";
import { alertTeam } from "@/lib/alert";
import { appUrl } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATINGS = new Set(["yes", "partly", "no"]);
const LABEL = { yes: "🎯 Spot on", partly: "🤔 Partly", no: "👎 Not really" };

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const rating = String(body.rating || "");
  if (!RATINGS.has(rating)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const needs = (Array.isArray(body.needs) ? body.needs : []).map((x) => String(x).slice(0, 60)).slice(0, 8);
  const comment = String(body.comment || "").slice(0, 600) || null;

  const audit = await getAudit(id).catch(() => null);
  if (!audit) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error } = await db()
    .from("audit_feedback")
    .upsert({ audit_id: id, rating, needs, comment, updated_at: new Date().toISOString() }, { onConflict: "audit_id" });
  if (error) {
    console.error("[feedback]", error);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }

  after(() =>
    alertTeam(
      "feedback",
      `📝 Feedback ${LABEL[rating]} — ${audit.name || ""} (+${audit.whatsapp})\n@${audit.ig_handle} · score ${audit.score}\nNeeds: ${needs.join(", ") || "–"}${comment ? `\n"${comment}"` : ""}\n${appUrl(`/r/${id}`)}`,
      { auditId: id, rating, needs, comment, phone: audit.whatsapp, handle: audit.ig_handle }
    )
  );
  return NextResponse.json({ ok: true });
}
