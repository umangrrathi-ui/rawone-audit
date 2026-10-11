"use client";
import { useEffect, useRef, useState } from "react";
import { Mark } from "./Logo";

export const STEPS = [
  "Reading your Instagram profile",
  "Checking your Google Business profile",
  "Comparing with your industry benchmark",
  "Writing your report",
];
// server step text → index
const STEP_INDEX = {
  "Scanning Instagram": 0,
  "Checking Google profile": 1,
  "Benchmarking": 2,
  "Writing report": 3,
};

const TIPS = [
  ["Did you know?", "Accounts that reply to every Google review get noticeably more trust from new customers."],
  ["Quick fact:", "Reels usually reach far more non-followers than static posts."],
  ["Pro tip:", "A clear bio with your city and a WhatsApp link turns profile visits into enquiries."],
  ["Did you know?", "A 14-day posting gap can cut your reach when you come back."],
  ["Pro tip:", "20+ real photos on Google Maps makes your listing look active and trustworthy."],
];

export default function Progress({ id, handle, onDone, onFail }) {
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(6);
  const [tip, setTip] = useState(0);
  const [slow, setSlow] = useState(false);
  const started = useRef(Date.now());

  // fake-smooth progress that never reaches 100 until done
  useEffect(() => {
    const t = setInterval(() => {
      const s = (Date.now() - started.current) / 1000;
      setPct((p) => Math.max(p, Math.min(94, 6 + 88 * (1 - Math.exp(-s / 22)))));
      if (s > 75) setSlow(true);
    }, 500);
    const tt = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 5500);
    return () => {
      clearInterval(t);
      clearInterval(tt);
    };
  }, []);

  useEffect(() => {
    let stop = false;
    let timer;
    async function poll() {
      try {
        const res = await fetch(`/api/audit/${id}`, { cache: "no-store" });
        const j = await res.json();
        if (stop) return;
        if (j.status === "done") {
          setStep(STEPS.length);
          setPct(100);
          setTimeout(() => onDone?.(), 600);
          return;
        }
        if (j.status === "failed") return onFail?.(j.error || "We couldn't build the report. Please try again.");
        if (j.step && STEP_INDEX[j.step] != null) setStep((s) => Math.max(s, STEP_INDEX[j.step]));
      } catch {
        /* keep polling */
      }
      if (!stop) timer = setTimeout(poll, 2000);
    }
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id, onDone, onFail]);

  const [tLabel, tText] = TIPS[tip];

  return (
    <div className="loader" aria-live="polite">
      <div className="loader-mark">
        <span className="halo" />
        <span className="ring" />
        <Mark className="mark" color="#FE6037" />
      </div>
      <div className="stack" style={{ gap: 6, alignItems: "center" }}>
        <h2 style={{ fontSize: "1.5rem" }}>Auditing {handle ? `@${handle}` : "your business"}</h2>
        <p className="muted small">{slow ? "Instagram is a bit slow today — almost there." : "This takes about 30–60 seconds. Please keep this page open."}</p>
      </div>
      <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? "done" : i === step ? "active" : ""}>
            <span className="dot">{i < step ? "✓" : ""}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="tip" key={tip}>
        <b>{tLabel}</b> {tText}
      </p>
    </div>
  );
}
