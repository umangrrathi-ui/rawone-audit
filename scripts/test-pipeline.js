// Full end-to-end run (Apify + OpenAI + Supabase), without the web form.
// Usage: npm run test:pipeline -- <instagram_handle> "<google maps link>" <industry>
import { db } from "../lib/supabase.js";
import { runAudit } from "../lib/pipeline.js";
import { makeCode, appUrl } from "../lib/util.js";

const [handle = "rawonedesign", maps = null, industry = "other"] = process.argv.slice(2);

const { data: row, error } = await db()
  .from("audits")
  .insert({ code: makeCode(), name: "Test run", whatsapp: null, industry, ig_handle: handle, gmb_url: maps, status: "running" })
  .select("*")
  .single();
if (error) throw error;

console.log("Audit row", row.id, "— running…");
const t0 = Date.now();
await runAudit(row);
const { data } = await db().from("audits").select("status, score, error, ai").eq("id", row.id).single();
console.log(`Finished in ${((Date.now() - t0) / 1000).toFixed(1)}s →`, data.status, "score", data.score, data.error || "");
console.log("AI usage:", JSON.stringify(data.ai?._usage), "model:", data.ai?._model);
console.log("Open:", appUrl(`/r/${row.id}`));
