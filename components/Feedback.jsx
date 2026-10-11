"use client";
import { useState } from "react";

const RATINGS = [
  { v: "yes", e: "🎯", t: "Spot on" },
  { v: "partly", e: "🤔", t: "Partly" },
  { v: "no", e: "👎", t: "Not really" },
];
const NEEDS = [
  "More followers & reach",
  "More enquiries / leads",
  "Better Google reviews",
  "Done-for-you content",
  "Running ads",
  "Just exploring",
];

export default function Feedback({ id, existing, callLink }) {
  const [rating, setRating] = useState(existing?.rating || null);
  const [needs, setNeeds] = useState(existing?.needs || []);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(!!existing);
  const [busy, setBusy] = useState(false);

  const toggle = (x) => setNeeds((n) => (n.includes(x) ? n.filter((y) => y !== x) : [...n, x]));

  async function submit() {
    setBusy(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, rating, needs, comment }),
      });
    } catch {}
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="card stack">
        <h3>{rating === "no" ? "Thanks for being honest." : "Thanks — glad it was useful!"}</h3>
        <p>
          {rating === "no"
            ? "A public-data report can only go so far. Tell us what's really going on and a strategist will take a proper look — free."
            : "Knowing a problem is step one. If you'd like a team to actually fix it, let's talk."}
        </p>
        <div>
          <a className="btn btn--primary" href={callLink} target="_blank" rel="noreferrer">
            {rating === "no" ? "Talk to a strategist →" : "Get it fixed — free call →"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card stack" style={{ gap: 18 }}>
      <div className="stack" style={{ gap: 10 }}>
        <b style={{ fontFamily: "var(--font-head)" }}>Did this report match what you see in your business?</b>
        <div className="fb-opts" role="radiogroup">
          {RATINGS.map((r) => (
            <button key={r.v} type="button" role="radio" aria-checked={rating === r.v} className={`fb-opt ${rating === r.v ? "on" : ""}`} onClick={() => setRating(r.v)}>
              <span>{r.e}</span>
              {r.t}
            </button>
          ))}
        </div>
      </div>

      {rating && (
        <div className="stack reveal" style={{ gap: 10 }}>
          <b style={{ fontFamily: "var(--font-head)" }}>What would help your business most right now?</b>
          <div className="chips">
            {NEEDS.map((x) => (
              <button key={x} type="button" className={`fb-chip ${needs.includes(x) ? "on" : ""}`} aria-pressed={needs.includes(x)} onClick={() => toggle(x)}>
                {x}
              </button>
            ))}
          </div>
          <textarea className="input" placeholder={rating === "no" ? "What did we miss? (optional)" : "Anything else you'd like us to know? (optional)"} maxLength={600} value={comment} onChange={(e) => setComment(e.target.value)} />
          <div>
            <button className="btn btn--dark" type="button" onClick={submit} disabled={busy}>
              {busy ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
