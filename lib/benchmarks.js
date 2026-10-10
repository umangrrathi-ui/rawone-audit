// Industry benchmarks shown to leads.
// ⚠️ TODO: Every number marked `verified: false` is a PLACEHOLDER. Replace with researched numbers
// (run the research prompt in the build plan) and add the source URL. Until verified, the report
// labels them "general SMB benchmark".
//
// er = Instagram avg engagement rate % by follower tier: t1 (<1K), t2 (1K–10K), t3 (10K+)
// postsPerWeek = RAWONE recommended [min, max]
// rating = typical GMB rating, reviews = typical GMB review count (city-level SMB)

const GENERAL = {
  label: "Other",
  postsPerWeek: [3, 3],
  er: { t1: 4.0, t2: 2.5, t3: 1.5 }, // TODO placeholder
  rating: 4.4, // TODO placeholder
  reviews: 100, // TODO placeholder
  source: null,
  verified: false,
};

export const INDUSTRIES = {
  healthcare: { ...GENERAL, label: "Clinic / Hospital / Healthcare", postsPerWeek: [3, 4] },
  restaurant: { ...GENERAL, label: "Restaurant / Cafe / Bakery", postsPerWeek: [4, 5] },
  education: { ...GENERAL, label: "School / Coaching / Preschool", postsPerWeek: [3, 4] },
  jewellery: { ...GENERAL, label: "Jewellery", postsPerWeek: [4, 5] },
  hospitality: { ...GENERAL, label: "Hotel / Resort / Banquet", postsPerWeek: [3, 4] },
  salon: { ...GENERAL, label: "Salon / Spa / Beauty", postsPerWeek: [4, 5] },
  retail: { ...GENERAL, label: "Retail / Showroom", postsPerWeek: [3, 4] },
  realestate: { ...GENERAL, label: "Real estate", postsPerWeek: [3, 4] },
  other: GENERAL,
};

export const INDUSTRY_OPTIONS = Object.entries(INDUSTRIES).map(([value, b]) => ({ value, label: b.label }));

export function tierFor(followers) {
  if (followers < 1000) return "t1";
  if (followers < 10000) return "t2";
  return "t3";
}

/** Flattened benchmark for one business, ready for the score + AI prompt. */
export function benchmarkFor(industry, followers = 0) {
  const b = INDUSTRIES[industry] || GENERAL;
  const tier = tierFor(followers);
  return {
    industry: b.label,
    tier,
    tierLabel: { t1: "under 1K followers", t2: "1K–10K followers", t3: "10K+ followers" }[tier],
    engagementRate: b.er[tier],
    postsPerWeekMin: b.postsPerWeek[0],
    postsPerWeekMax: b.postsPerWeek[1],
    gmbRating: b.rating,
    gmbReviews: b.reviews,
    source: b.source,
    label: b.verified ? `${b.label} benchmark` : "general SMB benchmark",
  };
}
