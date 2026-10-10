// Google Business Profile metrics + rule-based flags.
// Field names confirmed against compass/crawler-google-places output schema (Oct 2026).
// If a test run shows a different name, change the mapping here only.
import { daysBetween, round } from "./util.js";

export function gmbMetrics(raw, now = new Date(), reviewLimit = 10) {
  const reviews = (Array.isArray(raw.reviews) ? raw.reviews : [])
    .filter((r) => r && (r.publishedAtDate || r.stars != null))
    .sort((a, b) => new Date(b.publishedAtDate || 0) - new Date(a.publishedAtDate || 0))
    .slice(0, reviewLimit)
    .map((r) => ({
      name: r.name || null,
      stars: r.stars ?? r.rating ?? null,
      date: r.publishedAtDate || null,
      text: (r.text || r.textTranslated || "").slice(0, 500),
      replied: !!(r.responseFromOwnerText && String(r.responseFromOwnerText).trim()),
    }));

  const replied = reviews.filter((r) => r.replied).length;
  const negativesUnanswered = reviews.filter((r) => r.stars != null && r.stars <= 3 && !r.replied);

  return {
    title: raw.title,
    url: raw.url,
    category: raw.categoryName || null,
    address: raw.address || null,
    rating: raw.totalScore ?? null,
    reviewsCount: raw.reviewsCount ?? 0,
    distribution: raw.reviewsDistribution || null,
    keywords: (raw.reviewsTags || [])
      .filter((t) => t && t.title)
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 5)
      .map((t) => ({ title: t.title, count: t.count || 0 })),
    reviews,
    replyRate: reviews.length ? round(replied / reviews.length, 2) : null,
    unansweredCount: reviews.length - replied,
    unansweredNegatives: negativesUnanswered.length,
    daysSinceLastReview: reviews[0]?.date ? Math.floor(daysBetween(now, reviews[0].date)) : null,
    completeness: {
      photos: raw.imagesCount ?? 0,
      hours: Array.isArray(raw.openingHours) && raw.openingHours.length > 0,
      website: !!raw.website,
      phone: !!(raw.phone || raw.phoneUnformatted),
      category: !!raw.categoryName,
    },
    claimable: !!raw.claimThisBusiness, // true = profile NOT claimed by owner
    permanentlyClosed: !!raw.permanentlyClosed,
    temporarilyClosed: !!raw.temporarilyClosed,
  };
}

export function gmbFlags(m, bench) {
  const f = [];
  if (m.claimable) f.push("profile_not_claimed");
  if (m.permanentlyClosed || m.temporarilyClosed) f.push("marked_closed");
  if (m.rating != null && m.rating < bench.gmbRating) f.push("rating_below_benchmark");
  if (m.reviewsCount < bench.gmbReviews) f.push("few_reviews");
  if (m.replyRate != null && m.replyRate < 0.5) f.push("low_reply_rate");
  if (m.unansweredNegatives > 0) f.push("unanswered_negative");
  if (m.daysSinceLastReview == null || m.daysSinceLastReview > 30) f.push("stale_reviews");
  if (m.completeness.photos < 20) f.push("few_photos");
  if (!m.completeness.hours) f.push("no_hours");
  if (!m.completeness.website) f.push("no_website");
  if (!m.completeness.phone) f.push("no_phone");
  if (!m.completeness.category) f.push("no_category");
  return f;
}
