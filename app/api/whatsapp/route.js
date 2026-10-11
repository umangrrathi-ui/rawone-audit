// WhatsApp Cloud API webhook.
// GET  = verification handshake (hub.mode / hub.verify_token / hub.challenge)
// POST = incoming messages → bot logic table from the build plan
import { NextResponse, after } from "next/server";
import { db } from "@/lib/supabase";
import { sendText, verifyMetaSignature, getContact, upsertContact, markRead } from "@/lib/whatsapp";
import { alertTeam } from "@/lib/alert";
import { appUrl } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WA_VERIFY_TOKEN) {
    return new Response(p.get("hub.challenge") || "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("bad signature", { status: 401 });
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("ok");
  }

  const messages = [];
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const v = change.value || {};
      const names = Object.fromEntries((v.contacts || []).map((c) => [c.wa_id, c.profile?.name]));
      for (const m of v.messages || []) messages.push({ ...m, _name: names[m.from] });
    }
  }

  // Ack fast; Meta retries if we're slow
  if (messages.length) after(() => Promise.all(messages.map(handle).map((p) => p.catch((e) => console.error("[wa in]", e)))));
  return NextResponse.json({ ok: true });
}

const reportLink = (id) => appUrl(`/r/${id}`);

async function handle(m) {
  const from = m.from; // digits with country code
  const text =
    m.type === "text"
      ? m.text?.body || ""
      : m.type === "button"
      ? m.button?.text || ""
      : m.type === "interactive"
      ? m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || ""
      : `[${m.type}]`;

  // de-dupe (Meta can deliver the same message twice)
  const { error: dupErr } = await db().from("wa_messages").insert({ phone: from, wa_message_id: m.id, body: text.slice(0, 2000) });
  if (dupErr?.code === "23505") return;

  const contact = await getContact(from);
  await upsertContact(from, { last_inbound_at: new Date().toISOString(), name: m._name || contact?.name || null });
  markRead(m.id);

  // Alert number pinging the bot just keeps its 24h window open
  if (process.env.ALERT_WA_NUMBER && from === process.env.ALERT_WA_NUMBER) return;

  const cmd = text.trim().toUpperCase();

  if (cmd === "STOP") {
    await upsertContact(from, { opted_out: true });
    await sendText(from, "Done — you won't receive any more messages. Send START to opt back in.");
    return;
  }
  if (cmd === "START") {
    await upsertContact(from, { opted_out: false });
    await sendText(from, "Welcome back! Send REPORT to get your latest report.");
    return;
  }
  if (contact?.opted_out) return;

  const rm = cmd.match(/^REPORT\b\s*([A-Z0-9]{6})?/);
  if (rm) {
    let audit = null;
    if (rm[1]) {
      const { data } = await db().from("audits").select("*").eq("code", rm[1]).maybeSingle();
      audit = data;
    }
    if (!audit) {
      // no / wrong code → latest report for this number
      const { data } = await db()
        .from("audits")
        .select("*")
        .eq("whatsapp", from)
        .in("status", ["done", "running"])
        .order("created_at", { ascending: false })
        .limit(1);
      audit = data?.[0] || null;
    }
    if (!audit) {
      await sendText(from, `We couldn't find a report for this number. Get your free audit here (1 minute): ${appUrl("/")}`);
      return;
    }
    await verifyLead(audit, from, m._name);
    return;
  }

  // Any other message
  if (contact?.report_sent) {
    await alertTeam("reply", `💬 Reply from ${contact.name || m._name || ""} (+${from}):\n"${text.slice(0, 500)}"`, { phone: from, text });
    const last = contact.last_autoreply_at ? new Date(contact.last_autoreply_at).getTime() : 0;
    if (Date.now() - last > 6 * 3600 * 1000) {
      await sendText(from, "Thanks! Our team will reply shortly. 🙏");
      await upsertContact(from, { last_autoreply_at: new Date().toISOString() });
    }
  } else {
    await sendText(
      from,
      `Hi! Get a free Instagram + Google audit from RawOne in under a minute: ${appUrl("/")}\n\nAlready have a report? Send its code, e.g. REPORT AB12CD`
    );
  }
}

async function verifyLead(audit, from, waName) {
  const firstTime = !audit.wa_verified;
  // the number that actually messaged us is the verified one
  await db().from("audits").update({ wa_verified: true, whatsapp: from }).eq("id", audit.id);
  await upsertContact(from, { last_audit_id: audit.id });

  const name = audit.name || waName || "";
  if (audit.status === "running") {
    await sendText(from, `Hi ${name}, your report for @${audit.ig_handle} is still being prepared. The link will arrive here in about a minute.`);
    // pipeline sends the link when done (see lib/pipeline.js → notifyIfVerified)
  } else if (audit.status === "done") {
    await sendText(from, `Hi ${name}, your audit for @${audit.ig_handle} is ready: ${reportLink(audit.id)}\n\nAny questions? Just reply here.`);
    await upsertContact(from, { report_sent: true });
  } else {
    await sendText(from, `Hi ${name}, we couldn't build the report for @${audit.ig_handle} automatically. Our team will check and send it here.`);
  }

  if (firstTime) {
    await alertTeam(
      "lead",
      `🔥 Verified lead\n${name} · +${from}\n@${audit.ig_handle} · score ${audit.score ?? "–"}\nIndustry: ${audit.industry}\n${reportLink(audit.id)}`,
      { auditId: audit.id, phone: from, handle: audit.ig_handle, score: audit.score, industry: audit.industry, name }
    );
  }
}
