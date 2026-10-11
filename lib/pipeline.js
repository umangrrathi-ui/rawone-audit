// Free audit pipeline: scrape (parallel) → metrics → flags → score → AI → save.
import { scrapeBoth } from "./apify.js";
import { igMetrics, igFlags } from "./instagram.js";
import { gmbMetrics, gmbFlags } from "./gmb.js";
import { benchmarkFor } from "./benchmarks.js";
import { computeScore } from "./score.js";
import { writeFindings } from "./ai.js";
import { getAudit, updateAudit } from "./supabase.js";
import { sendText, getContact, upsertContact } from "./whatsapp.js";
import { appUrl } from "./util.js";

// keys must match components/Progress.jsx STEP_INDEX
export const STEPS = {
  ig: "Scanning Instagram",
  gmb: "Checking Google profile",
  bench: "Benchmarking",
  report: "Writing report",
};

const friendlyIgError = (msg = "") => {
  if (/NOT_FOUND|not found|does not exist/i.test(msg)) return "We couldn't find this Instagram handle. Please check the spelling and try again.";
  if (/private/i.test(msg)) return "This account is private. We can only audit public accounts.";
  return "Instagram is responding slowly right now. Please try again in 10 minutes.";
};

/** Pure analysis — reused by the pipeline and the test script. */
export function analyse({ igRaw, gmbRaw, industry }) {
  const ig = igMetrics(igRaw);
  const bench = benchmarkFor(industry, ig.followers);
  const gmb = gmbRaw ? gmbMetrics(gmbRaw) : null;
  const flags = { ig: igFlags(ig, bench), gmb: gmb ? gmbFlags(gmb, bench) : [] };
  const score = computeScore(ig, gmb, bench);
  return { ig, gmb, bench, flags, score };
}

/** Compact metrics for the AI prompt (no raw blobs, no captions — those go separately). */
export function metricsForAi({ ig, gmb, score }) {
  return {
    instagram: {
      username: ig.username,
      followers: ig.followers,
      following: ig.following,
      totalPosts: ig.totalPosts,
      postsAnalysed: ig.posts.length,
      avgEngagementRatePct: ig.avgEngagementRate,
      medianEngagementRatePct: ig.medianEngagementRate,
      reelAvgViews: ig.reelAvgViews,
      reelViewsPerFollower: ig.reelViewsPerFollower,
      postsPerWeek: ig.postsPerWeek,
      daysSinceLastPost: ig.daysSinceLastPost,
      formatMix: ig.formatMix,
      postsWithHiddenLikes: ig.hiddenLikesCount,
      profile: ig.profile,
      posts: ig.posts.map((p, i) => ({
        n: i + 1,
        date: p.date?.slice(0, 10),
        format: p.format,
        likes: p.likes,
        comments: p.comments,
        views: p.views,
        engagementRatePct: p.er,
      })),
    },
    google: gmb
      ? {
          name: gmb.title,
          category: gmb.category,
          rating: gmb.rating,
          totalReviews: gmb.reviewsCount,
          topReviewKeywords: gmb.keywords,
          replyRateLatest10: gmb.replyRate,
          unansweredOfLatest10: gmb.unansweredCount,
          unansweredNegativeReviews: gmb.unansweredNegatives,
          daysSinceLastReview: gmb.daysSinceLastReview,
          completeness: gmb.completeness,
          profileNotClaimed: gmb.claimable,
        }
      : null,
    score: { total: score.score, parts: score.parts },
  };
}

/** If the user sent "REPORT <code>" while the report was still running, send the link now. */
async function notifyIfVerified(id) {
  try {
    const a = await getAudit(id);
    if (!a?.wa_verified || !a.whatsapp) return;
    const c = await getContact(a.whatsapp);
    if (c?.opted_out || c?.report_sent) return;
    await sendText(
      a.whatsapp,
      `Hi ${a.name || ""}, your audit for @${a.ig_handle} is ready: ${appUrl(`/r/${id}`)}\n\nAny questions? Just reply here.`
    );
    await upsertContact(a.whatsapp, { report_sent: true });
  } catch (e) {
    console.error("[notifyIfVerified]", e.message);
  }
}

export async function runAudit(audit) {
  const id = audit.id;
  try {
    await updateAudit(id, { step: STEPS.ig });
    const scrape = await scrapeBoth(audit.ig_handle, audit.gmb_url);

    if (!scrape.ig) {
      await updateAudit(id, { status: "failed", step: null, error: friendlyIgError(scrape.igError), gmb_raw: scrape.gmb });
      return;
    }
    if (scrape.ig.private) {
      await updateAudit(id, { status: "failed", step: null, error: friendlyIgError("private") });
      return;
    }

    await updateAudit(id, { step: STEPS.gmb, ig_raw: scrape.ig, gmb_raw: scrape.gmb });

    await updateAudit(id, { step: STEPS.bench });
    const a = analyse({ igRaw: scrape.ig, gmbRaw: scrape.gmb, industry: audit.industry });

    await updateAudit(id, { step: STEPS.report });

    const aiOut = await writeFindings({
      name: audit.name ? `${audit.name} (@${audit.ig_handle})` : `@${audit.ig_handle}`,
      industry: a.bench.industry,
      metrics: metricsForAi(a),
      benchmark: a.bench,
      igFlags: a.flags.ig,
      gmbFlags: a.flags.gmb,
      bio: scrape.ig.biography || "",
      captions: a.ig.posts.map((p, i) => `#${i + 1} (${p.format}, ${p.date?.slice(0, 10)}): ${p.caption}`),
      reviews: (a.gmb?.reviews || []).map((r) => ({
        stars: r.stars,
        date: r.date?.slice(0, 10),
        text: r.text,
        owner_reply: r.replied ? "yes" : "no",
      })),
    });

    await updateAudit(id, {
      status: "done",
      step: null,
      metrics: {
        ig: a.ig,
        gmb: a.gmb,
        bench: a.bench,
        flags: a.flags,
        parts: a.score.parts,
        band: a.score.band,
        igOnly: a.score.igOnly,
        gmbError: audit.gmb_url && !scrape.gmb ? "We couldn't load your Google profile. Please check the Maps link." : null,
      },
      score: a.score.score,
      ai: aiOut,
    });
    await notifyIfVerified(id);
  } catch (e) {
    console.error("[pipeline]", id, e);
    await updateAudit(id, {
      status: "failed",
      step: null,
      error: "Something went wrong while building your report. Please try again in a few minutes.",
    }).catch(() => {});
    // keep the technical error for debugging
    await updateAudit(id, { ai: { _error: String(e?.message || e) } }).catch(() => {});
  }
}
