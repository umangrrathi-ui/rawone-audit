import { createClient } from "@supabase/supabase-js";

let client;

/** Server-only Supabase client (service role). Never import this in a client component. */
export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export async function getAudit(id) {
  if (process.env.MOCK_REPORT === "1" && id === "00000000-0000-0000-0000-000000000000") {
    const { mockAudit } = await import("./mock.js");
    return mockAudit();
  }
  const { data, error } = await db().from("audits").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateAudit(id, patch) {
  const { error } = await db().from("audits").update(patch).eq("id", id);
  if (error) throw error;
}
