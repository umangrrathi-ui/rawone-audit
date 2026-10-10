"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Progress from "./Progress";

export default function AuditForm({ industries }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [existing, setExisting] = useState(null);
  const [auditId, setAuditId] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setExisting(null);
    const f = new FormData(e.currentTarget);
    const payload = Object.fromEntries(f.entries());
    setBusy(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Kuch gadbad hui. Dobara try karo.");
        if (json.reportId) setExisting(json.reportId);
        setBusy(false);
        return;
      }
      if (json.status === "done") {
        router.push(`/r/${json.id}`);
        return;
      }
      setAuditId(json.id);
    } catch {
      setError("Network issue. Internet check karke dobara try karo.");
      setBusy(false);
    }
  }

  if (auditId) {
    return (
      <Progress
        id={auditId}
        onDone={() => router.push(`/r/${auditId}`)}
        onFail={(msg) => {
          setAuditId(null);
          setBusy(false);
          setError(msg);
        }}
      />
    );
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate={false}>
      <div className="field">
        <label htmlFor="name">Aapka naam</label>
        <input className="input" id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
      </div>

      <div className="field">
        <label htmlFor="whatsapp">WhatsApp number</label>
        <div className="phone">
          <input className="input" value="+91" disabled aria-label="Country code" readOnly />
          <input
            className="input"
            id="whatsapp"
            name="whatsapp"
            required
            inputMode="numeric"
            pattern="[0-9 ]{10,12}"
            placeholder="98XXXXXXXX"
            autoComplete="tel-national"
          />
        </div>
        <small>Report ka link isi number pe aayega.</small>
      </div>

      <div className="field">
        <label htmlFor="ig">Instagram handle ya profile link</label>
        <input className="input" id="ig" name="ig" required placeholder="@yourbusiness" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </div>

      <div className="field">
        <label htmlFor="gmb">Google Maps link (optional)</label>
        <input className="input" id="gmb" name="gmb" type="url" placeholder="https://maps.app.goo.gl/..." inputMode="url" />
        <small>Google Maps mein apna business kholo → Share → Copy link.</small>
      </div>

      <div className="field">
        <label htmlFor="industry">Industry</label>
        <select className="input" id="industry" name="industry" required defaultValue="">
          <option value="" disabled>
            Select karo
          </option>
          {industries.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </div>

      {/* honeypot */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="company_website">Website</label>
        <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && (
        <div className="err" role="alert">
          {error} {existing && <a href={`/r/${existing}`}>Purani report dekho →</a>}
        </div>
      )}

      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Shuru ho raha hai…" : "Free audit shuru karo"}
      </button>

      <p className="privacy">
        Hum sirf public data dekhte hain. Aapka number sirf report bhejne aur follow-up ke liye use hoga.
      </p>
    </form>
  );
}
