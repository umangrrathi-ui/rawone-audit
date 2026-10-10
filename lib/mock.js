// Demo report for design checks without any API keys.
// `npm run mock` then open http://localhost:3000/r/00000000-0000-0000-0000-000000000000
import { analyse } from "./pipeline.js";
import { deepIgMetrics } from "./deep.js";

export const MOCK_ID = "00000000-0000-0000-0000-000000000000";

const day = (n) => new Date(Date.now() - n * 86400000).toISOString();

const igRaw = {
  username: "demo.cafe.ahmedabad",
  fullName: "Demo Cafe",
  followersCount: 4820,
  followsCount: 612,
  postsCount: 214,
  biography: "Specialty coffee & bakes in Prahladnagar ☕",
  externalUrl: null,
  businessCategoryName: "Cafe",
  isBusinessAccount: true,
  latestPosts: [
    { isPinned: true, timestamp: day(120), type: "Image", likesCount: 900, commentsCount: 40, shortCode: "PIN" },
    { timestamp: day(3), type: "Video", productType: "clips", likesCount: 210, commentsCount: 12, videoPlayCount: 9100, shortCode: "A1", caption: "Monsoon special cold brew" },
    { timestamp: day(6), type: "Image", likesCount: 38, commentsCount: 1, shortCode: "A2", caption: "Happy Monday! #coffee #cafe #ahmedabad #food #instafood #foodie #love #daily #mood #vibes #morning #brew" },
    { timestamp: day(11), type: "Sidecar", likesCount: 96, commentsCount: 6, shortCode: "A3", caption: "New menu is here" },
    { timestamp: day(15), type: "Image", likesCount: -1, commentsCount: 2, shortCode: "A4", caption: "Weekend hours" },
    { timestamp: day(19), type: "Video", productType: "clips", likesCount: 154, commentsCount: 9, videoPlayCount: 6400, shortCode: "A5", caption: "How we roast" },
    { timestamp: day(27), type: "Image", likesCount: 41, commentsCount: 0, shortCode: "A6", caption: "Quote of the day" },
    { timestamp: day(34), type: "Image", likesCount: 52, commentsCount: 2, shortCode: "A7", caption: "Croissant drop" },
    { timestamp: day(40), type: "Video", productType: "clips", likesCount: 302, commentsCount: 21, videoPlayCount: 14200, shortCode: "A8", caption: "Latte art challenge" },
    { timestamp: day(48), type: "Image", likesCount: 35, commentsCount: 1, shortCode: "A9", caption: "Festival greetings" },
  ],
};

const gmbRaw = {
  title: "Demo Cafe",
  url: "https://maps.google.com/?cid=1",
  categoryName: "Coffee shop",
  totalScore: 4.2,
  reviewsCount: 64,
  imagesCount: 11,
  openingHours: [{ day: "Monday", hours: "8 AM to 11 PM" }],
  website: null,
  phone: "+91 98XXX XXXXX",
  claimThisBusiness: false,
  reviewsTags: [
    { title: "cold coffee", count: 14 },
    { title: "ambience", count: 11 },
    { title: "service", count: 8 },
    { title: "parking", count: 5 },
    { title: "price", count: 4 },
  ],
  reviews: [
    { stars: 5, publishedAtDate: day(9), text: "Best cold brew in the area, staff is friendly.", responseFromOwnerText: "Thank you!" },
    { stars: 2, publishedAtDate: day(21), text: "Waited 25 minutes for a sandwich. Coffee was good though.", responseFromOwnerText: null },
    { stars: 4, publishedAtDate: day(33), text: "Nice ambience, a bit pricey.", responseFromOwnerText: null },
    { stars: 5, publishedAtDate: day(40), text: "Lovely place to work from.", responseFromOwnerText: null },
    { stars: 3, publishedAtDate: day(52), text: "Parking is a problem in evenings.", responseFromOwnerText: null },
  ],
};

function mockDeep(a) {
  const posts = Array.from({ length: 36 }, (_, i) => ({
    timestamp: day(3 + i * 4 + (i > 20 ? 25 : 0)),
    type: i % 3 === 0 ? "Video" : i % 3 === 1 ? "Image" : "Sidecar",
    productType: i % 3 === 0 ? "clips" : undefined,
    likesCount: 40 + ((i * 37) % 220),
    commentsCount: i % 7,
    videoPlayCount: i % 3 === 0 ? 3000 + i * 300 : undefined,
    hashtags: Array.from({ length: i % 14 }, (_, k) => `tag${k}`),
    caption: `Demo post ${i + 1}`,
    shortCode: `D${i}`,
    ownerUsername: igRaw.username,
  }));
  return {
    ig: deepIgMetrics(posts, igRaw.followersCount, igRaw.username),
    gmb: a.gmb,
    ai: {
      summary: "Reels carry the account; static posts and a 25-day gap in August pulled the average down.",
      ig_findings: [{ severity: "high", title: "25-day gap in August", detail: "No posts between two dates.", fix: "Batch-shoot 2 weeks of reels." }],
      gmb_issues: [{ severity: "high", title: "Unanswered 2-star review", detail: "Wait-time complaint.", fix: "Reply today." }],
      plan: [1, 2, 3, 4].map((w) => ({
        week: `Week ${w}`,
        focus: ["Fix the basics", "Lead with reels", "Proof", "Review"][w - 1],
        posts: [
          { day: "Mon", format: "reel", idea: "Behind the counter at 8 AM", hook: "Ahmedabad ki sabse pehli coffee?" },
          { day: "Thu", format: "carousel", idea: "Menu top 5", hook: "Ye 5 cheezein try ki?" },
        ],
      })),
    },
  };
}

export function mockAudit() {
  const a = analyse({ igRaw, gmbRaw, industry: "restaurant" });
  const paid = process.env.MOCK_PAID === "1";
  return {
    paid_mock: paid,
    id: MOCK_ID,
    code: "DEMO42",
    created_at: new Date().toISOString(),
    name: "Demo Cafe",
    whatsapp: "919800000000",
    industry: "restaurant",
    ig_handle: igRaw.username,
    status: "done",
    score: a.score.score,
    wa_verified: false,
    paid,
    deep_status: paid ? "done" : null,
    deep: paid ? mockDeep(a) : null,
    metrics: { ig: a.ig, gmb: a.gmb, bench: a.bench, flags: a.flags, parts: a.score.parts, band: a.score.band, igOnly: false },
    ai: {
      summary:
        "Reels are your strongest format — the latte art reel reached 14,200 views, almost 3× your followers. The biggest gap is Google: 4.2★ is below the 4.4 benchmark and 4 of the last 5 reviews have no reply.",
      ig_findings: [
        { severity: "good", title: "Reels pull 3× your follower count", detail: "Your 3 reels averaged 9,900 views. Static posts get far less.", fix: "Make 2 of every 4 posts a reel this week." },
        { severity: "high", title: "No link in bio", detail: "People who like a reel have nowhere to go to order or reserve.", fix: "Add a WhatsApp click-to-chat link today." },
        { severity: "medium", title: "Quote and greeting posts underperform", detail: "Post #6 ('Quote of the day') got 41 likes and 0 comments.", fix: "Replace generic posts with a 15-second behind-the-counter reel." },
      ],
      gmb_issues: [
        { severity: "high", title: "A 2-star review has no reply", detail: "The 25-minute wait review from 3 weeks ago is unanswered. New customers read these.", fix: "Reply today: apologise, say what changed, invite them back." },
        { severity: "medium", title: "Only 11 photos", detail: "Profiles with 20+ photos look more trustworthy.", fix: "Upload 10 photos: food, interior, team, outside signage." },
        { severity: "medium", title: "No website on the profile", detail: "Customers cannot see the menu before visiting.", fix: "Add your Instagram or a menu link as the website." },
      ],
      review_themes: { praised: ["Cold brew", "Friendly staff", "Ambience"], complaints: ["Slow food service", "Evening parking"] },
      quick_wins: [
        "Reply to all 4 unanswered Google reviews, starting with the 2-star one.",
        "Add a WhatsApp order link to your Instagram bio.",
        "Upload 10 fresh photos to your Google profile.",
      ],
    },
  };
}
