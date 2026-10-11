// Locked "Full Audit" teaser + offer. Cashfree checkout when configured, otherwise a WhatsApp order (manual UPI).
import PayButton from "./PayButton";

export function upsellHref(cfg) {
  const text = `Hi RawOne! I'd like the Full Audit + 30-day plan (₹${cfg.price}) for @${cfg.handle}. Code: ${cfg.code}`;
  return cfg.waNumber ? `https://wa.me/${cfg.waNumber}?text=${encodeURIComponent(text)}` : "#";
}

const INSIDE = [
  "36 posts analysed — month-by-month engagement trend",
  "Your top 3 and bottom 3 posts, and why",
  "Posting gaps and the right weekly rhythm for you",
  "Hashtag analysis — what's helping and what's hurting",
  "Every Google profile issue with a step-by-step fix",
  "A week-by-week 30-day content plan with post ideas and hooks",
];

export default function Upsell({ cfg }) {
  return (
    <section className="section" id="unlock">
      <div className="chapter">
        <span className="num">07</span>
        <h2>Your Full Audit is ready to unlock</h2>
      </div>

      <div className="locked" aria-hidden="true">
        <div className="blur">
          <div className="ghost-row" style={{ width: "40%" }} />
          <div className="ghost-bars">
            {[38, 62, 45, 80, 55, 30, 70, 90, 48, 66, 52, 75].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
          </div>
          <div className="ghost-row" style={{ width: "90%" }} />
          <div className="ghost-row" style={{ width: "75%" }} />
          <div className="ghost-row" style={{ width: "82%" }} />
        </div>
        <div className="over">
          <span className="lock-ic">🔒</span>
          <b style={{ fontFamily: "var(--font-head)", color: "var(--ink)" }}>36-post deep dive + 30-day plan</b>
          <span className="small muted">Built from your own account data</span>
        </div>
      </div>

      <div className="glow-card stack" style={{ gap: 18 }}>
        <span className="eyebrow eyebrow--white">Full Audit</span>
        <div>
          <div className="price">₹{cfg.price}</div>
          <p className="small" style={{ marginTop: 6, opacity: 0.9 }}>One-time · adjusted in your first month if you become a RawOne client</p>
        </div>
        <ul className="unlock-list">{INSIDE.map((t) => <li key={t}>{t}</li>)}</ul>
        {cfg.payEnabled ? (
          <PayButton id={cfg.id} price={cfg.price} className="btn btn--light btn--lg btn--block" />
        ) : (
          <a className="btn btn--light btn--lg btn--block" href={upsellHref(cfg)} target="_blank" rel="noreferrer">
            Unlock my Full Audit — ₹{cfg.price}
          </a>
        )}
        <p className="small" style={{ opacity: 0.9, textAlign: "center" }}>
          {cfg.payEnabled ? "Secure UPI / card payment · delivered on WhatsApp in ~3 minutes" : "Pay by UPI on WhatsApp · delivered within a few hours"}
        </p>
      </div>
    </section>
  );
}
