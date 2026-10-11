// Lightweight event counter (PDF downloads). Called with navigator.sendBeacon.
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (body.type !== "pdf" || !UUID.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  const { data } = await db().from("audits").select("pdf_downloads").eq("id", id).maybeSingle();
  if (data) await db().from("audits").update({ pdf_downloads: (data.pdf_downloads || 0) + 1 }).eq("id", id);
  return NextResponse.json({ ok: true });
}
