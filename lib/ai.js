// OpenAI Responses API with strict JSON schema (structured outputs).
// Ref: https://developers.openai.com/api/docs/guides/structured-outputs
import OpenAI from "openai";

let client;
const ai = () => (client ||= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

export const SYSTEM_PROMPT = `You are a senior social media and local SEO strategist at RAWONE, a digital marketing agency in Ahmedabad. You write audit findings for small business owners in India.

Rules:
- Use ONLY the numbers given in METRICS. Never invent or recalculate numbers.
- Write in simple English a shop owner understands. Short sentences. No jargon.
- Be specific: name the post, the review, the number.
- Every issue must come with one concrete fix they can do this week.
- Do not mention competitors. Compare only against BENCHMARK.
- Do not promise results. Do not use hype words.
- From GMB_FLAGS, pick the 3-4 that hurt the business most.
- Give 3-4 ig_findings (include at least one "good" one if anything is genuinely working).
- If GMB data is missing, return an empty gmb_issues array and empty review_themes arrays.
- quick_wins: exactly 3, each doable in 1 day.`;

const finding = (severities) => ({
  type: "object",
  properties: {
    severity: { type: "string", enum: severities },
    title: { type: "string" },
    detail: { type: "string" },
    fix: { type: "string" },
  },
  required: ["severity", "title", "detail", "fix"],
  additionalProperties: false,
});

export const FREE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "2 sentences: biggest strength + biggest gap" },
    ig_findings: { type: "array", items: finding(["high", "medium", "good"]) },
    gmb_issues: { type: "array", items: finding(["high", "medium"]) },
    review_themes: {
      type: "object",
      properties: {
        praised: { type: "array", items: { type: "string" } },
        complaints: { type: "array", items: { type: "string" } },
      },
      required: ["praised", "complaints"],
      additionalProperties: false,
    },
    quick_wins: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "ig_findings", "gmb_issues", "review_themes", "quick_wins"],
  additionalProperties: false,
};

export function buildUserMessage({ name, industry, metrics, benchmark, gmbFlags, igFlags, bio, captions, reviews }) {
  return [
    `BUSINESS: ${name || "Unknown"}, industry: ${industry}`,
    `METRICS: ${JSON.stringify(metrics)}`,
    `BENCHMARK: ${JSON.stringify(benchmark)}`,
    `IG_FLAGS: ${JSON.stringify(igFlags || [])}`,
    `GMB_FLAGS: ${JSON.stringify(gmbFlags || [])}`,
    `IG_BIO: ${bio || "(empty)"}`,
    `IG_CAPTIONS: ${JSON.stringify(captions || [])}`,
    `GMB_REVIEWS: ${JSON.stringify(reviews || [])}`,
  ].join("\n");
}

export async function structured({ model, system, user, schema, name, maxTokens = 2500 }) {
  const res = await ai().responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: { format: { type: "json_schema", name, schema, strict: true } },
    max_output_tokens: maxTokens,
  });
  const txt = res.output_text;
  if (!txt) throw new Error("AI returned empty output");
  return { data: JSON.parse(txt), usage: res.usage || null, model };
}

export async function writeFindings(payload) {
  const out = await structured({
    model: process.env.OPENAI_MODEL || "gpt-6-luna",
    system: SYSTEM_PROMPT,
    user: buildUserMessage(payload),
    schema: FREE_SCHEMA,
    name: "audit_findings",
  });
  const d = out.data;
  d.quick_wins = (d.quick_wins || []).slice(0, 3);
  d.ig_findings = (d.ig_findings || []).slice(0, 4);
  d.gmb_issues = (d.gmb_issues || []).slice(0, 4);
  return { ...d, _model: out.model, _usage: out.usage };
}
