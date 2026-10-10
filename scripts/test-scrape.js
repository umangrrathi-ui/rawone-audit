// Usage: npm run test:scrape -- <instagram_handle> "<google maps link>"
// Prints raw field names + computed metrics so you can catch field-name mismatches.
import { scrapeBoth } from "../lib/apify.js";
import { analyse } from "../lib/pipeline.js";

const handle = process.argv[2] || "rawonedesign";
const maps = process.argv[3] || null;

console.log(`Scraping @${handle}${maps ? " + " + maps : ""} …`);
const t0 = Date.now();
const r = await scrapeBoth(handle, maps);
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (r.igError) console.error("IG error:", r.igError);
if (r.gmbError) console.error("GMB error:", r.gmbError);

if (r.ig) {
  console.log("\nIG top-level fields:", Object.keys(r.ig).sort().join(", "));
  const p = r.ig.latestPosts?.[0];
  if (p) console.log("\nIG post fields:", Object.keys(p).sort().join(", "));
}
if (r.gmb) {
  console.log("\nGMB fields:", Object.keys(r.gmb).sort().join(", "));
  const rv = r.gmb.reviews?.[0];
  if (rv) console.log("\nGMB review fields:", Object.keys(rv).sort().join(", "));
}

if (r.ig) {
  const a = analyse({ igRaw: r.ig, gmbRaw: r.gmb, industry: "other" });
  const { posts, ...igRest } = a.ig;
  console.log("\nIG metrics:", JSON.stringify(igRest, null, 2));
  console.table(posts.map(({ caption, url, ...x }) => x));
  if (a.gmb) {
    const { reviews, ...g } = a.gmb;
    console.log("\nGMB metrics:", JSON.stringify(g, null, 2));
    console.table(reviews.map(({ text, ...x }) => x));
  }
  console.log("\nFlags:", a.flags);
  console.log("\nScore:", a.score.score, a.score.band, JSON.stringify(a.score.parts));
}
