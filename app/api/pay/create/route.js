import { NextResponse } from "next/server";
import { getAudit, updateAudit } from "@/lib/supabase";
import { createOrder, price, cfMode } from "@/lib/cashfree";
import { appUrl } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const audit = await getAudit(id).catch(() => null);
  if (!audit || audit.status !== "done") return NextResponse.json({ error: "Report not found." }, { status: 404 });
  if (audit.paid) return NextResponse.json({ alreadyPaid: true });

  const orderId = `${audit.code}_${Date.now()}`;
  try {
    const order = await createOrder({
      orderId,
      amount: price(),
      phone: audit.whatsapp,
      name: audit.name,
      auditId: audit.id,
      returnUrl: appUrl(`/r/${audit.id}?paid=1&order_id={order_id}`),
      notifyUrl: appUrl("/api/pay/webhook"),
    });
    await updateAudit(audit.id, { order_id: orderId });
    return NextResponse.json({ paymentSessionId: order.payment_session_id, mode: cfMode() });
  } catch (e) {
    console.error("[pay/create]", e);
    return NextResponse.json({ error: "Couldn't start the payment. Please try again in a moment." }, { status: 502 });
  }
}
