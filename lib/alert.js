// Team alerts: WhatsApp to ALERT_WA_NUMBER (only works while that number's 24h window is open)
// + optional n8n webhook (ALERT_WEBHOOK_URL) for email / sheet — the reliable channel.
import { sendText } from "./whatsapp.js";

export async function alertTeam(kind, text, data = {}) {
  const jobs = [];
  const to = process.env.ALERT_WA_NUMBER;
  if (to) jobs.push(sendText(to, text));
  const hook = process.env.ALERT_WEBHOOK_URL;
  if (hook) {
    jobs.push(
      fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, text, ...data, at: new Date().toISOString() }),
        signal: AbortSignal.timeout(8000),
      })
    );
  }
  const res = await Promise.allSettled(jobs);
  for (const r of res) if (r.status === "rejected") console.error("[alert]", kind, r.reason?.message);
}
