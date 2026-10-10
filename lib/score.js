// 0–100 score, exactly per the build plan table.
import { clamp, round } from "./util.js";

function engagementPts(er, bench) {
  if (er == null || !bench) return 0;
  const r = er / bench;
  if (r >= 1.5) return 20;
  if (r <= 0.5) return 5;
  if (r <= 1) return 5 + ((r - 0.5) / 0.5) * 9; // 0.5→5, 1→14
  return 14 + ((r - 1) / 0.5) * 6; // 1→14, 1.5→20
}

function ratingPts(rating) {
  if (rating == null) return 0;
  if (rating >= 4.7) return 15;
  if (rating >= 4.3) return 10;
  if (rating >= 4.0) return 6;
  return 2;
}

function reviewCountPts(count, bench) {
  if (!bench) return 0;
  const r = (count || 0) / bench;
  if (r >= 2) return 10;
  if (r >= 1) return 7 + (r - 1) * 3; // 1→7, 2→10
  return r * 7;
}

export function computeScore(ig, gmb, bench) {
  const parts = {};

  // ---- Instagram: 50 ----
  parts.igEngagement = { max: 20, pts: engagementPts(ig?.avgEngagementRate, bench.engagementRate) };
  parts.igFrequency = {
    max: 15,
    pts: ig?.postsPerWeek != null ? clamp(ig.postsPerWeek / bench.postsPerWeekMin, 0, 1) * 15 : 0,
  };
  const p = ig?.profile || {};
  parts.igProfile = { max: 10, pts: [p.bio, p.link, p.category, p.business].filter(Boolean).length * 2.5 };
  parts.igReels = { max: 5, pts: clamp((ig?.formatMix?.reel || 0) / 3, 0, 1) * 5 };

  const igTotal = parts.igEngagement.pts + parts.igFrequency.pts + parts.igProfile.pts + parts.igReels.pts;

  let total;
  if (gmb) {
    parts.gmbRating = { max: 15, pts: ratingPts(gmb.rating) };
    parts.gmbReviews = { max: 10, pts: reviewCountPts(gmb.reviewsCount, bench.gmbReviews) };
    parts.gmbReply = { max: 10, pts: (gmb.replyRate ?? 0) * 10 };
    const c = gmb.completeness;
    parts.gmbRecency = {
      max: 15,
      pts:
        (gmb.daysSinceLastReview != null && gmb.daysSinceLastReview < 30 ? 5 : 0) +
        (c.photos >= 20 ? 4 : 0) +
        (c.hours ? 2 : 0) +
        (c.website ? 2 : 0) +
        (c.phone ? 2 : 0),
    };
    const gmbTotal = parts.gmbRating.pts + parts.gmbReviews.pts + parts.gmbReply.pts + parts.gmbRecency.pts;
    total = igTotal + gmbTotal;
  } else {
    total = igTotal * 2; // scale IG 50 → 100
  }

  for (const k of Object.keys(parts)) parts[k].pts = round(parts[k].pts, 1);
  const score = Math.round(clamp(total, 0, 100));
  return { score, band: score >= 70 ? "green" : score >= 45 ? "amber" : "red", parts, igOnly: !gmb };
}

/** Sub-scores (0–100) for the scorecard bars on the report. */
export function scorecardRows(parts) {
  const rows = [
    ["Engagement", parts.igEngagement],
    ["Posting consistency", parts.igFrequency],
    ["Profile & bio", parts.igProfile],
    ["Reels usage", parts.igReels],
    ["Google rating", parts.gmbRating],
    ["Google review volume", parts.gmbReviews],
    ["Review replies", parts.gmbReply],
    ["Google profile freshness", parts.gmbRecency],
  ];
  return rows.filter(([, v]) => v).map(([label, v]) => ({ label, value: Math.round((v.pts / v.max) * 100) }));
}
