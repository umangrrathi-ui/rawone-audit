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
    await sendText(from, "Done. Aapko aage koi message nahi aayega. Wapas shuru karne ke liye START bhejo.");
    return;
  }
  if (cmd === "START") {
    await upsertContact(from, { opted_out: false });
    await sendText(from, "Welcome back! Report chahiye toh REPORT likh ke bhejo.");
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
      await sendText(from, `Is number pe koi report nahi mili. Free audit ke liye ye form bharo (1 minute): ${appUrl("/")}`);
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
      await sendText(from, "Thanks! Hamari team jaldi reply karegi. 🙏");
      await upsertContact(from, { last_autoreply_at: new Date().toISOString() });
    }
  } else {
    await sendText(
      from,
      `Namaste! RAWONE ka free Instagram + Google audit 45 second mein milta hai. Ye form bharo: ${appUrl("/")}\n\nReport already hai? Uska code bhejo, jaise: REPORT AB12CD`
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
    await sendText(from, `Hi ${name}, @${audit.ig_handle} ki report abhi ban rahi hai. 1 minute mein link yahin aa jaayega.`);
    // pipeline sends the link when done (see lib/pipeline.js → notifyIfVerified)
  } else if (audit.status === "done") {
    await sendText(from, `Hi ${name}, @${audit.ig_handle} ki audit report ready hai: ${reportLink(audit.id)}\n\nKoi sawaal ho toh yahin reply karo.`);
    await upsertContact(from, { report_sent: true });
  } else {
    await sendText(from, `Hi ${name}, @${audit.ig_handle} ki report ban nahi payi. Hamari team manually check karke yahin bhejegi.`);
  }

  if (firstTime) {
    await alertTeam(
      "lead",
      `🔥 Verified lead\n${name} · +${from}\n@${audit.ig_handle} · score ${audit.score ?? "–"}\nIndustry: ${audit.industry}\n${reportLink(audit.id)}`,
      { auditId: audit.id, phone: from, handle: audit.ig_handle, score: audit.score, industry: audit.industry, name }
    );
  }
}
