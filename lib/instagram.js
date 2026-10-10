// Instagram metrics — per "Report spec" in the build plan.
// Field names confirmed against apify/instagram-scraper output schema (Oct 2026).
import { daysBetween, round } from "./util.js";

const isReel = (p) => p.type === "Video" || p.productType === "clips";
const views = (p) => p.videoPlayCount ?? p.videoViewCount ?? null;
const formatOf = (p) => (isReel(p) ? "reel" : p.type === "Sidecar" ? "carousel" : "static");

export function igMetrics(raw, now = new Date()) {
  const followers = raw.followersCount ?? 0;
  const out = {
    username: raw.username,
    fullName: raw.fullName || null,
    profilePic: raw.profilePicUrlHD || raw.profilePicUrl || null,
    private: !!raw.private,
    verified: !!raw.verified,
    followers,
    following: raw.followsCount ?? 0,
    totalPosts: raw.postsCount ?? 0,
    profile: {
      bio: !!(raw.biography && raw.biography.trim().length >= 10),
      link: !!(raw.externalUrl || (raw.externalUrls && raw.externalUrls.length)),
      category: !!raw.businessCategoryName,
      business: !!raw.isBusinessAccount,
      categoryName: raw.businessCategoryName || null,
      linkUrl: raw.externalUrl || raw.externalUrls?.[0]?.url || null,
    },
    posts: [],
    hiddenLikesCount: 0,
    avgEngagementRate: null,
    medianEngagementRate: null,
    reelAvgViews: null,
    reelViewsPerFollower: null,
    postsPerWeek: null,
    daysSinceLastPost: null,
    formatMix: { reel: 0, carousel: 0, static: 0 },
    pinnedSkipped: 0,
  };

  const all = Array.isArray(raw.latestPosts) ? raw.latestPosts : [];
  const pinned = all.filter((p) => p.isPinned);
  out.pinnedSkipped = pinned.length;
  const posts = all
    .filter((p) => !p.isPinned && p.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 9);

  out.posts = posts.map((p) => {
    const hidden = p.likesCount == null || p.likesCount < 0;
    const likes = hidden ? null : p.likesCount;
    const comments = p.commentsCount ?? 0;
    const er = !hidden && followers > 0 ? ((likes + comments) / followers) * 100 : null;
    return {
      shortCode: p.shortCode,
      url: p.url || (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : null),
      date: p.timestamp,
      format: formatOf(p),
      likes,
      comments,
      views: isReel(p) ? views(p) : null,
      er: round(er, 2),
      caption: (p.caption || "").slice(0, 300),
      hashtags: (p.hashtags || []).length,
    };
  });

  for (const p of out.posts) out.formatMix[p.format]++;
  out.hiddenLikesCount = out.posts.filter((p) => p.likes == null).length;

  const ers = out.posts.map((p) => p.er).filter((x) => x != null);
  if (ers.length) {
    out.avgEngagementRate = round(ers.reduce((a, b) => a + b, 0) / ers.length, 2);
    const s = [...ers].sort((a, b) => a - b);
    out.medianEngagementRate = round(s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2, 2);
  }

  const reelViews = out.posts.filter((p) => p.format === "reel" && p.views != null).map((p) => p.views);
  if (reelViews.length) {
    out.reelAvgViews = Math.round(reelViews.reduce((a, b) => a + b, 0) / reelViews.length);
    out.reelViewsPerFollower = followers ? round(out.reelAvgViews / followers, 2) : null;
  }

  if (out.posts.length) {
    out.daysSinceLastPost = Math.floor(daysBetween(now, out.posts[0].date));
    if (out.posts.length >= 2) {
      const span = Math.max(1, daysBetween(out.posts[0].date, out.posts[out.posts.length - 1].date));
      out.postsPerWeek = round((out.posts.length / span) * 7, 1);
    } else {
      out.postsPerWeek = 0;
    }
  }

  return out;
}

/** Rule-based IG flags, fed to the AI alongside metrics. */
export function igFlags(m, bench) {
  const f = [];
  if (m.private) f.push("private_account");
  if (!m.posts.length) f.push("no_posts");
  if (m.daysSinceLastPost != null && m.daysSinceLastPost > 14) f.push("inactive_14d");
  if (m.postsPerWeek != null && m.postsPerWeek < bench.postsPerWeekMin) f.push("low_posting_frequency");
  if (m.avgEngagementRate != null && m.avgEngagementRate < bench.engagementRate * 0.5) f.push("engagement_below_half_benchmark");
  if (m.formatMix.reel < 3 && m.posts.length >= 5) f.push("few_reels");
  if (!m.profile.bio) f.push("weak_bio");
  if (!m.profile.link) f.push("no_link_in_bio");
  if (!m.profile.category) f.push("no_business_category");
  if (!m.profile.business) f.push("not_business_account");
  if (m.hiddenLikesCount) f.push("likes_hidden_on_some_posts");
  return f;
}
