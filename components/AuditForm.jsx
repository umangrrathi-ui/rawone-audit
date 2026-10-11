"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Progress from "./Progress";

export default function AuditForm({ industries }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [existing, setExisting] = useState(null);
  const [audit, setAudit] = useState(null); // { id, handle }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setExisting(null);
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        if (json.reportId) setExisting(json.reportId);
        setBusy(false);
        return;
      }
      if (json.status === "done") return router.push(`/r/${json.id}`);
      setAudit({ id: json.id, handle: json.handle });
    } catch {
      setError("Network issue. Check your internet and try again.");
      setBusy(false);
    }
  }

  const onDone = useCallback(() => router.push(`/r/${audit?.id}`), [router, audit]);
  const onFail = useCallback((msg) => {
    setAudit(null);
    setBusy(false);
    setError(msg);
  }, []);

  if (audit) return <Progress id={audit.id} handle={audit.handle} onDone={onDone} onFail={onFail} />;

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input className="input" id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="e.g. Rahul Shah" />
      </div>

      <div className="field">
        <label htmlFor="whatsapp">WhatsApp number</label>
        <div className="phone">
          <input className="input" value="+91" disabled aria-label="Country code" readOnly />
          <input className="input" id="whatsapp" name="whatsapp" required inputMode="numeric" pattern="[0-9 ]{10,12}" placeholder="98XXXXXXXX" autoComplete="tel-national" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="ig">Instagram handle or profile link</label>
        <input className="input" id="ig" name="ig" required placeholder="@yourbusiness" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </div>

      <div className="field">
        <label htmlFor="gmb">
          Google Maps link <span className="muted" style={{ fontWeight: 400 }}>(optional, but recommended)</span>
        </label>
        <input className="input" id="gmb" name="gmb" type="url" placeholder="https://maps.app.goo.gl/..." inputMode="url" />
        <small>Open your business on Google Maps → Share → Copy link.</small>
      </div>

      <div className="field">
        <label htmlFor="industry">Industry</label>
        <select className="input" id="industry" name="industry" required defaultValue="">
          <option value="" disabled>
            Select your industry
          </option>
          {industries.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </div>

      <div className="hp" aria-hidden="true">
        <label htmlFor="company_website">Website</label>
        <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && (
        <div className="err" role="alert">
          {error} {existing && <a href={`/r/${existing}`}>View your report →</a>}
        </div>
      )}

      <button className="btn btn--primary btn--block btn--lg" type="submit" disabled={busy}>
        {busy ? "Starting your audit…" : "Get my free audit →"}
      </button>
      <p className="privacy">We only read public data. No login, no spam.</p>
    </form>
  );
}
