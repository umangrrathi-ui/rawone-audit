import crypto from "node:crypto";

// No 0/O/1/I to avoid confusion when typed
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** "https://instagram.com/foo.bar/?hl=en" | "@foo.bar" | "foo.bar" -> "foo.bar" */
export function normalizeHandle(input) {
  if (!input) return null;
  let s = String(input).trim();
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i);
  if (m) s = m[1];
  s = s.replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(s)) return null;
  if (["p", "reel", "reels", "stories", "explore"].includes(s)) return null;
  return s;
}

/** Returns digits with country code, e.g. "+91 98250 12345" -> "919825012345". Defaults to +91 for 10-digit input. */
export function normalizePhone(input) {
  if (!input) return null;
  let d = String(input).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  if (d.length < 11 || d.length > 15) return null;
  if (d.startsWith("91") && !/^91[6-9]\d{9}$/.test(d)) return null;
  return d;
}

/** Accepts google.com/maps/place/..., maps.app.goo.gl/..., goo.gl/maps/..., g.page/... */
export function isMapsUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url.trim());
    const h = u.hostname.toLowerCase();
    if (h === "maps.app.goo.gl" || h === "g.page" || h === "g.co") return true;
    if (h === "goo.gl" && u.pathname.startsWith("/maps")) return true;
    if (/(^|\.)google\.[a-z.]+$/.test(h) && u.pathname.startsWith("/maps")) {
      // a search results page is not a single place
      if (u.pathname.startsWith("/maps/search")) return false;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const daysBetween = (a, b) => Math.abs(new Date(a) - new Date(b)) / 86400000;
export const round = (n, d = 2) => (n == null || Number.isNaN(n) ? null : Math.round(n * 10 ** d) / 10 ** d);
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function appUrl(path = "") {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "") + path;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
