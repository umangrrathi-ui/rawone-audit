// ₹299 deep report: 36 posts + 30 reviews + stronger model + 30-day plan.
// Runs from the Cashfree webhook (not the browser redirect).
import { scrapeInstagramPosts, scrapeGmb } from "./apify.js";
import { gmbMetrics, gmbFlags } from "./gmb.js";
import { structured } from "./ai.js";
import { getAudit, updateAudit } from "./supabase.js";
import { deliverReport } from "./whatsapp.js";
import { alertTeam } from "./alert.js";
import { appUrl, daysBetween, round } from "./util.js";

const isReel = (p) => p.type === "Video" || p.productType === "clips";
const fmt = (p) => (isReel(p) ? "reel" : p.type === "Sidecar" ? "carousel" : "static");
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function deepIgMetrics(items, followers, handle) {
  const posts = items
    .filter((p) => p && p.timestamp && !p.error)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 36)
    .map((p) => {
      const hidden = p.likesCount == null || p.likesCount < 0;
      const likes = hidden ? null : p.likesCount;
      const comments = p.commentsCount ?? 0;
      return {
        url: p.url || `https://www.instagram.com/p/${p.shortCode}/`,
        date: p.timestamp,
        format: fmt(p),
        likes,
        comments,
        views: isReel(p) ? p.videoPlayCount ?? p.videoViewCount ?? null : null,
        er: !hidden && followers ? round(((likes + comments) / followers) * 100, 2) : null,
        hashtags: p.hashtags || [],
        caption: (p.caption || "").slice(0, 200),
        collab: !!(p.ownerUsername && handle && p.ownerUsername.toLowerCase() !== handle.toLowerCase()),
      };
    });

  // monthly trend
  const byMonth = {};
  for (const p of posts) {
    const k = p.date.slice(0, 7);
    (byMonth[k] ||= []).push(p);
  }
  const monthly = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, ps]) => ({ month, posts: ps.length, avgEr: round(avg(ps.map((x) => x.er).filter((x) => x != null)), 2) }));

  // posting gaps > 7 days
  const asc = [...posts].reverse();
  const gaps = [];
  for (let i = 1; i < asc.length; i++) {
    const d = daysBetween(asc[i].date, asc[i - 1].date);
    if (d > 7) gaps.push({ from: asc[i - 1].date.slice(0, 10), to: asc[i].date.slice(0, 10), days: Math.round(d) });
  }
  gaps.sort((a, b) => b.days - a.days);

  // formats
  const formats = {};
  for (const f of ["reel", "carousel", "static"]) {
    const ps = posts.filter((p) => p.format === f);
    formats[f] = {
      count: ps.length,
      avgEr: round(avg(ps.map((p) => p.er).filter((x) => x != null)), 2),
      avgViews: f === "reel" ? Math.round(avg(ps.map((p) => p.views).filter((x) => x != null)) || 0) || null : null,
    };
  }

  // hashtags
  const buckets = { "0": [], "1-5": [], "6-10": [], "11+": [] };
  const tagCount = {};
  for (const p of posts) {
    const n = p.hashtags.length;
    const k = n === 0 ? "0" : n <= 5 ? "1-5" : n <= 10 ? "6-10" : "11+";
    if (p.er != null) buckets[k].push(p.er);
    for (const t of p.hashtags) tagCount[t.toLowerCase()] = (tagCount[t.toLowerCase()] || 0) + 1;
  }
  const hashtagBuckets = Object.entries(buckets).map(([range, ers]) => ({ range, posts: ers.length, avgEr: round(avg(ers), 2) }));
  const topHashtags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const ranked = posts.filter((p) => p.er != null).sort((a, b) => b.er - a.er);
  const span = posts.length > 1 ? Math.max(1, daysBetween(posts[0].date, posts[posts.length - 1].date)) : null;

  return {
    postsAnalysed: posts.length,
    period: posts.length ? { from: posts[posts.length - 1].date.slice(0, 10), to: posts[0].date.slice(0, 10) } : null,
    avgEr: round(avg(ranked.map((p) => p.er)), 2),
    postsPerWeek: span ? round((posts.length / span) * 7, 1) : null,
    monthly,
    gaps: gaps.slice(0, 5),
    formats,
    hashtagBuckets,
    topHashtags,
    best: ranked.slice(0, 3).map(({ hashtags, ...p }) => p),
    worst: ranked.slice(-3).reverse().map(({ hashtags, ...p }) => p),
    collabPosts: posts.filter((p) => p.collab).length,
  };
}

const DEEP_SYSTEM = `You are a senior social media and local SEO strategist at RAWONE, a digital marketing agency in Ahmedabad, writing a paid deep audit and a 30-day content plan for a small business owner in India.

Rules:
- Use ONLY numbers from DEEP_METRICS / GMB. Never invent numbers.
- Simple English, short sentences, no jargon, no hype, no promises of results.
- Be specific: cite dates, formats, post numbers, review quotes.
- Every issue has one concrete fix.
- Do not mention competitors.
- ig_findings: 5-7 items covering trend, gaps, best vs worst posts, format mix, hashtags.
- gmb_issues: every real issue from GMB_FLAGS, most damaging first (empty if no GMB).
- plan: exactly 4 weeks, 3-4 posts each. Ideas must fit THIS business and industry, and lean on what already works in their best posts.`;

const DEEP_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    ig_findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["high", "medium", "good"] },
          title: { type: "string" },
          detail: { type: "string" },
          fix: { type: "string" },
        },
        required: ["severity", "title", "detail", "fix"],
        additionalProperties: false,
      },
    },
    gmb_issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["high", "medium"] },
          title: { type: "string" },
          detail: { type: "string" },
          fix: { type: "string" },
        },
        required: ["severity", "title", "detail", "fix"],
        additionalProperties: false,
      },
    },
    plan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          week: { type: "string" },
          focus: { type: "string" },
          posts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                format: { type: "string", enum: ["reel", "carousel", "static", "story"] },
                idea: { type: "string" },
                hook: { type: "string" },
              },
              required: ["day", "format", "idea", "hook"],
              additionalProperties: false,
            },
          },
        },
        required: ["week", "focus", "posts"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "ig_findings", "gmb_issues", "plan"],
  additionalProperties: false,
};

export async function runDeep(auditId) {
  const audit = await getAudit(auditId);
  if (!audit) throw new Error("audit not found");
  if (audit.deep_status === "running" || audit.deep_status === "done") return;
  await updateAudit(auditId, { deep_status: "running", deep_error: null });

  try {
    const followers = audit.metrics?.ig?.followers || 0;
    const [postsR, gmbR] = await Promise.allSettled([
      scrapeInstagramPosts(audit.ig_handle, 36),
      audit.gmb_url ? scrapeGmb(audit.gmb_url, 30, 90) : Promise.resolve(null),
    ]);
    if (postsR.status === "rejected") throw postsR.reason;

    const ig = deepIgMetrics(postsR.value, followers, audit.ig_handle);
    const gmbRaw = gmbR.status === "fulfilled" ? gmbR.value : null;
    const gmb = gmbRaw ? gmbMetrics(gmbRaw, new Date(), 30) : audit.metrics?.gmb || null;
    const bench = audit.metrics?.bench;
    const flags = gmb && bench ? gmbFlags(gmb, bench) : [];

    const user = [
      `BUSINESS: @${audit.ig_handle}${audit.name ? ` (${audit.name})` : ""}, industry: ${bench?.industry}`,
      `FREE_REPORT_SCORE: ${audit.score}`,
      `BENCHMARK: ${JSON.stringify(bench)}`,
      `PROFILE: ${JSON.stringify(audit.metrics?.ig?.profile || {})}, followers ${followers}`,
      `DEEP_METRICS: ${JSON.stringify(ig)}`,
      `GMB: ${JSON.stringify(gmb ? { ...gmb, reviews: undefined } : null)}`,
      `GMB_FLAGS: ${JSON.stringify(flags)}`,
      `GMB_REVIEWS: ${JSON.stringify((gmb?.reviews || []).map((r) => ({ stars: r.stars, date: r.date?.slice(0, 10), text: r.text, owner_reply: r.replied })))}`,
    ].join("\n");

    const out = await structured({
      model: process.env.OPENAI_DEEP_MODEL || "gpt-6.1-sol",
      system: DEEP_SYSTEM,
      user,
      schema: DEEP_SCHEMA,
      name: "deep_audit",
      maxTokens: 6000,
    });

    await updateAudit(auditId, {
      deep: { ig, gmb, flags, ai: out.data, _model: out.model, _usage: out.usage, at: new Date().toISOString() },
      deep_status: "done",
    });

    const link = appUrl(`/r/${auditId}#full`);
    if (audit.whatsapp) {
      await deliverReport(audit.whatsapp, {
        name: audit.name,
        handle: audit.ig_handle,
        link,
        text: `Hi ${audit.name || ""}, your Full Audit and 30-day plan for @${audit.ig_handle} are ready: ${link}`,
      }).catch((e) => console.error("[deep] WA deliver", e.message));
    }
  } catch (e) {
    console.error("[deep]", auditId, e);
    await updateAudit(auditId, { deep_status: "failed", deep_error: String(e?.message || e) }).catch(() => {});
    await alertTeam("deep_failed", `⚠️ Full audit FAILED — @${audit.ig_handle} (+${audit.whatsapp}). Retry from /admin or send manually. Error: ${String(e?.message || e).slice(0, 200)}`, { auditId });
  }
}
