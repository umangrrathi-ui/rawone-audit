// Cashfree payment webhook → mark paid → run deep report.
// Works even if the user closes the tab after paying.
import { NextResponse, after } from "next/server";
import { db, updateAudit } from "@/lib/supabase";
import { verifyWebhook, getOrder } from "@/lib/cashfree";
import { runDeep } from "@/lib/deep";
import { alertTeam } from "@/lib/alert";
import { appUrl } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const raw = await req.text();
  const ok = verifyWebhook(raw, req.headers.get("x-webhook-timestamp"), req.headers.get("x-webhook-signature"));
  if (!ok) {
    console.warn("[pay/webhook] bad signature");
    return new Response("bad signature", { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("ok");
  }

  const type = body.type || "";
  const orderId = body.data?.order?.order_id;
  const payStatus = body.data?.payment?.payment_status;
  if (!type.startsWith("PAYMENT_SUCCESS") || payStatus !== "SUCCESS" || !orderId) {
    return NextResponse.json({ ignored: type });
  }

  // Double-check with Cashfree before unlocking
  try {
    const order = await getOrder(orderId);
    if (order.order_status !== "PAID") return NextResponse.json({ ignored: "not paid" });
  } catch (e) {
    console.error("[pay/webhook] getOrder", e.message);
    return new Response("retry", { status: 500 }); // Cashfree will retry
  }

  const { data: audit } = await db().from("audits").select("*").eq("order_id", orderId).maybeSingle();
  if (!audit) {
    console.error("[pay/webhook] no audit for order", orderId);
    return NextResponse.json({ ignored: "unknown order" });
  }
  if (audit.paid) return NextResponse.json({ ok: true, duplicate: true });

  await updateAudit(audit.id, { paid: true, paid_at: new Date().toISOString() });

  after(async () => {
    await alertTeam(
      "paid",
      `💰 ₹${body.data?.order?.order_amount ?? 299} PAID — ${audit.name || ""} (+${audit.whatsapp})\n@${audit.ig_handle} · score ${audit.score}\nHottest lead — call within 24 hours.\n${appUrl(`/r/${audit.id}`)}`,
      { auditId: audit.id, phone: audit.whatsapp, handle: audit.ig_handle, score: audit.score }
    );
    await runDeep(audit.id);
  });

  return NextResponse.json({ ok: true });
}
