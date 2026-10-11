// Meta WhatsApp Cloud API (Graph API).
// Send: POST https://graph.facebook.com/{version}/{phone-number-id}/messages
import crypto from "node:crypto";
import { db } from "./supabase.js";

const version = () => process.env.WA_API_VERSION || "v23.0";

async function send(payload) {
  const id = process.env.WA_PHONE_NUMBER_ID;
  const token = process.env.WA_TOKEN;
  if (!id || !token) {
    console.warn("[wa] WA_PHONE_NUMBER_ID / WA_TOKEN missing — skipping send", payload.to);
    return null;
  }
  const res = await fetch(`https://graph.facebook.com/${version()}/${id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[wa] send failed", res.status, JSON.stringify(json));
    throw new Error(`WA send failed: ${json?.error?.message || res.status}`);
  }
  return json;
}

export function sendText(to, body) {
  return send({ to, type: "text", text: { preview_url: true, body } });
}

/** Utility template: "Hi {{1}}, your Instagram and Google audit for {{2}} is ready: {{3}}" */
export function sendReportTemplate(to, name, handle, link) {
  return send({
    to,
    type: "template",
    template: {
      name: process.env.WA_TEMPLATE_NAME || "audit_report_ready",
      language: { code: process.env.WA_TEMPLATE_LANG || "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: name || "there" },
            { type: "text", text: `@${handle}` },
            { type: "text", text: link },
          ],
        },
      ],
    },
  });
}

export function markRead(messageId) {
  return send({ status: "read", message_id: messageId }).catch(() => null);
}

/** Verify X-Hub-Signature-256 (sha256=<hex hmac of raw body with app secret>). */
export function verifyMetaSignature(rawBody, header) {
  const secret = process.env.WA_APP_SECRET;
  if (!secret) return true; // not configured → skip (set it in production!)
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const got = header.slice(7);
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function getContact(phone) {
  const { data } = await db().from("wa_contacts").select("*").eq("phone", phone).maybeSingle();
  return data;
}

export async function upsertContact(phone, patch) {
  await db()
    .from("wa_contacts")
    .upsert({ phone, ...patch, updated_at: new Date().toISOString() }, { onConflict: "phone" });
}

/** True if the user messaged us within the last 24h (free-form messages allowed). */
export async function windowOpen(phone) {
  const c = await getContact(phone);
  if (!c?.last_inbound_at) return false;
  return Date.now() - new Date(c.last_inbound_at).getTime() < 23.5 * 3600 * 1000;
}

/** Send a report link: free-form inside the 24h window, else approved utility template. Respects opt-out. */
export async function deliverReport(phone, { name, handle, link, text }) {
  const c = await getContact(phone);
  if (c?.opted_out) return { skipped: "opted_out" };
  if (await windowOpen(phone)) return sendText(phone, text || `Hi ${name || ""}, your audit for @${handle} is ready: ${link}`);
  return sendReportTemplate(phone, name, handle, link);
}
