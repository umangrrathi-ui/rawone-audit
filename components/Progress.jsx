"use client";
import { useEffect, useRef, useState } from "react";

const STEPS = ["Instagram scan ho raha hai", "Google profile check ho raha hai", "Report ban rahi hai"];

export default function Progress({ id, onDone, onFail }) {
  const [step, setStep] = useState(null);
  const [slow, setSlow] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => {
    let stop = false;
    let timer;
    async function poll() {
      try {
        const res = await fetch(`/api/audit/${id}`, { cache: "no-store" });
        const j = await res.json();
        if (stop) return;
        if (j.status === "done") return onDone?.();
        if (j.status === "failed") return onFail?.(j.error || "Report nahi ban payi. Dobara try karo.");
        setStep(j.step);
      } catch {
        /* keep polling */
      }
      if (Date.now() - started.current > 75_000) setSlow(true);
      if (!stop) timer = setTimeout(poll, 2000);
    }
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id, onDone, onFail]);

  const idx = Math.max(0, STEPS.indexOf(step));

  return (
    <div className="form" aria-live="polite">
      <h2>Audit chal raha hai…</h2>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i < idx ? "done" : i === idx ? "active" : ""}>
            <span className="dot">{i < idx ? "✓" : ""}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="muted" style={{ fontSize: "0.9rem" }}>
        {slow
          ? "Instagram aaj thoda slow hai. Page band mat karo — bas thodi der aur."
          : "Lagbhag 30-45 second. Page band mat karo."}
      </p>
    </div>
  );
}
