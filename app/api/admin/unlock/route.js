// Manual unlock after a UPI payment received on WhatsApp (until Cashfree is live).
import { NextResponse, after } from "next/server";
import { getAudit, updateAudit } from "@/lib/supabase";
import { runDeep } from "@/lib/deep";
import { appUrl } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const form = await req.formData();
  const key = String(form.get("key") || "");
  const id = String(form.get("id") || "");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) return new Response("Not found", { status: 404 });

  const audit = await getAudit(id).catch(() => null);
  if (!audit || audit.status !== "done") return new Response("Report not found", { status: 404 });

  // retry allowed after a failed deep run
  await updateAudit(id, {
    paid: true,
    paid_at: audit.paid_at || new Date().toISOString(),
    deep_status: audit.deep_status === "failed" ? null : audit.deep_status,
  });
  after(() => runDeep(id));

  return NextResponse.redirect(appUrl(`/admin?key=${encodeURIComponent(key)}&ok=${encodeURIComponent("@" + audit.ig_handle)}`), 303);
}
