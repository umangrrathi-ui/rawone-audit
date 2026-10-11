"use client";
import { useEffect, useState } from "react";

const WORDS = ["Instagram", "Google profile", "business"];

/** Typewriter that cycles through WORDS. */
export function RotatingWord() {
  const [i, setI] = useState(0);
  const [text, setText] = useState(WORDS[0]);
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const word = WORDS[i];
    let t;
    if (!del && text === word) t = setTimeout(() => setDel(true), 1800);
    else if (del && text === "") {
      setDel(false);
      setI((i + 1) % WORDS.length);
    } else
      t = setTimeout(
        () => setText(del ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1)),
        del ? 45 : 85
      );
    return () => clearTimeout(t);
  }, [text, del, i]);

  return (
    <span className="rot" aria-label="Instagram, Google profile, business">
      <span aria-hidden="true">{text}</span>
      <span className="caret" aria-hidden="true" />
    </span>
  );
}

/** Animated sample report card shown on the landing page. */
export function PreviewCard() {
  const target = 72;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(target);
    let raf;
    const start = performance.now() + 500;
    const tick = (now) => {
      const p = Math.min(1, Math.max(0, (now - start) / 1600));
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="preview" aria-hidden="true">
      <div className="pv-card">
        <div className="pv-top">
          <div className="pv-gauge">
            <svg viewBox="0 0 84 84">
              <circle cx="42" cy="42" r={r} fill="none" stroke="#FFE3D9" strokeWidth="8" />
              <circle cx="42" cy="42" r={r} fill="none" stroke="#FE6037" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - n / 100)} transform="rotate(-90 42 42)" />
            </svg>
            <b>{n}</b>
          </div>
          <div className="pv-meta">
            <span className="pv-label">Sample report</span>
            <span className="pv-handle">@yourbusiness</span>
            <span className="pill p-good">Good, with gaps</span>
          </div>
        </div>
        <div className="pv-bars">
          {[["Engagement", 78], ["Consistency", 46], ["Google rating", 88], ["Review replies", 32]].map(([l, v], i) => (
            <div className="pv-row" key={l}>
              <span>{l}</span>
              <i><em style={{ width: `${v}%`, animationDelay: `${0.7 + i * 0.15}s`, background: v >= 70 ? "var(--good)" : v >= 45 ? "var(--warn)" : "var(--bad)" }} /></i>
            </div>
          ))}
        </div>
      </div>
      <span className="pv-chip c1">📈 Engagement 2.8%</span>
      <span className="pv-chip c2">⭐ 4.6 on Google</span>
      <span className="pv-chip c3">✅ 3 quick wins</span>
    </div>
  );
}
