// Apify REST: run-sync-get-dataset-items returns dataset items directly in the response.
// Docs: https://docs.apify.com/api/v2#/reference/actors/run-actor-synchronously-and-get-dataset-items
import { resolveMapsInput } from "./maps.js";

const BASE = "https://api.apify.com/v2/acts";

async function runSync(actorId, input, { timeoutSecs, attempts = 2 } = {}) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN missing");
  const t = timeoutSecs ?? Number(process.env.APIFY_TIMEOUT_SECS || 40);
  const url = `${BASE}/${actorId.replace("/", "~")}/run-sync-get-dataset-items?timeout=${t}&clean=true`;

  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout((t + 15) * 1000),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Apify ${actorId} HTTP ${res.status}: ${body.slice(0, 300)}`);
      }
      const items = await res.json();
      if (!Array.isArray(items)) throw new Error(`Apify ${actorId}: unexpected response`);
      return items;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/** Free report: profile details incl. latestPosts (~12). 1 result. */
export async function scrapeInstagram(handle) {
  const items = await runSync("apify/instagram-scraper", {
    directUrls: [`https://www.instagram.com/${handle}/`],
    resultsType: "details",
    resultsLimit: 1,
    addParentData: false,
  });
  const item = items[0];
  if (!item) throw new Error("IG_NOT_FOUND");
  if (item.error) throw new Error(`IG_${String(item.error).toUpperCase()}: ${item.errorDescription || ""}`.trim());
  return item;
}

/** Deep report: last N posts. */
export async function scrapeInstagramPosts(handle, limit = 36) {
  return runSync(
    "apify/instagram-scraper",
    {
      directUrls: [`https://www.instagram.com/${handle}/`],
      resultsType: "posts",
      resultsLimit: limit,
      addParentData: false,
    },
    { timeoutSecs: 120 }
  );
}

/** Google Maps place + newest reviews. Accepts any Maps / share.google link. */
export async function scrapeGmb(mapsUrl, maxReviews = 10, timeoutSecs) {
  const target = await resolveMapsInput(mapsUrl);
  const base = {
    maxCrawledPlacesPerSearch: 1,
    maxReviews,
    reviewsSort: "newest",
    language: "en",
    scrapeReviewsPersonalData: false,
    maxImages: 0,
  };
  const input = target.search
    ? { ...base, searchStringsArray: [target.search], countryCode: "in" }
    : { ...base, startUrls: [{ url: target.url }] };
  const items = await runSync("compass/crawler-google-places", input, { timeoutSecs });
  const place = items.find((x) => x && x.title) || items[0];
  if (!place) throw new Error("GMB_NOT_FOUND");
  return place;
}

/** Run both in parallel. GMB failure never kills the IG report. */
export async function scrapeBoth(handle, mapsUrl) {
  const [ig, gmb] = await Promise.allSettled([
    scrapeInstagram(handle),
    mapsUrl ? scrapeGmb(mapsUrl) : Promise.resolve(null),
  ]);
  return {
    ig: ig.status === "fulfilled" ? ig.value : null,
    igError: ig.status === "rejected" ? ig.reason?.message : null,
    gmb: gmb.status === "fulfilled" ? gmb.value : null,
    gmbError: gmb.status === "rejected" ? gmb.reason?.message : null,
  };
}
