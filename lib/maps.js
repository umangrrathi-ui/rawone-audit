// Turn whatever Maps/share link the user pasted into something the Apify Google Maps actor can use.
// share.google/... usually redirects to a Google *Search* page (business knowledge panel), not a Maps place page,
// so for those we search Maps by the business name instead.
const SHORT_HOSTS = new Set(["share.google", "maps.app.goo.gl", "goo.gl", "g.page", "g.co"]);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

function fromGoogleUrl(u) {
  const h = u.hostname.toLowerCase();
  if (h.startsWith("consent.google.")) {
    const cont = u.searchParams.get("continue");
    if (cont) return fromGoogleUrl(new URL(cont));
  }
  if (/(^|\.)google\.[a-z.]+$/.test(h) || h.startsWith("maps.google.")) {
    if (u.pathname.startsWith("/maps")) return { url: u.toString() };
    if (u.pathname.startsWith("/search")) {
      const q = u.searchParams.get("q");
      if (q) return { search: q.trim() };
    }
  }
  return null;
}

/** Returns { url } for a Maps place URL, or { search } for a business-name search. */
export async function resolveMapsInput(raw) {
  let u;
  try {
    u = new URL(String(raw).trim());
  } catch {
    return { url: raw };
  }
  if (SHORT_HOSTS.has(u.hostname.toLowerCase())) {
    try {
      const res = await fetch(u.toString(), {
        redirect: "follow",
        headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9" },
        signal: AbortSignal.timeout(10000),
      });
      u = new URL(res.url);
    } catch (e) {
      console.warn("[maps] could not resolve short link", raw, e.message);
      return { url: raw }; // let Apify try it as-is
    }
  }
  return fromGoogleUrl(u) || { url: u.toString() };
}
