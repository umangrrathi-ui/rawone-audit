// Cashfree PG — Orders API + webhook signature.
// Docs: https://www.cashfree.com/docs/api-reference/payments/latest/orders/create
//       https://www.cashfree.com/docs/payments/online/webhooks/overview
import crypto from "node:crypto";

const base = () =>
  process.env.CASHFREE_ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

const headers = () => ({
  "Content-Type": "application/json",
  "x-client-id": process.env.CASHFREE_APP_ID,
  "x-client-secret": process.env.CASHFREE_SECRET,
  "x-api-version": process.env.CASHFREE_API_VERSION || "2025-01-01",
});

export const price = () => Number(process.env.PRICE_INR || 299);
export const cfMode = () => (process.env.CASHFREE_ENV === "production" ? "production" : "sandbox");

export async function createOrder({ orderId, amount, phone, name, auditId, returnUrl, notifyUrl }) {
  const res = await fetch(`${base()}/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: `wa_${phone}`,
        customer_phone: phone.slice(-10), // Cashfree expects 10-digit Indian mobile
        customer_name: name || undefined,
      },
      order_meta: { return_url: returnUrl, notify_url: notifyUrl },
      order_note: "RAWONE full audit + 30-day plan",
      order_tags: { audit_id: auditId },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Cashfree create order ${res.status}: ${json?.message || JSON.stringify(json)}`);
  return json; // { payment_session_id, order_id, order_status, ... }
}

export async function getOrder(orderId) {
  const res = await fetch(`${base()}/orders/${encodeURIComponent(orderId)}`, { headers: headers() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Cashfree get order ${res.status}: ${json?.message || ""}`);
  return json; // order_status: ACTIVE | PAID | EXPIRED ...
}

/**
 * signature = base64( HMAC_SHA256( timestamp + rawBody, clientSecret ) )
 * Must use the RAW body string, not re-serialised JSON.
 */
export function verifyWebhook(rawBody, timestamp, signature) {
  if (!timestamp || !signature) return false;
  const expected = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET || "")
    .update(timestamp + rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
