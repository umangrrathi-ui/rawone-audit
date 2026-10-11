"use client";
import { useState } from "react";

function loadSdk() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve(window.Cashfree);
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload = () => resolve(window.Cashfree);
    s.onerror = () => reject(new Error("sdk"));
    document.head.appendChild(s);
  });
}

export default function PayButton({ id, price, className = "btn btn--light" }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function pay() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/pay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (j.alreadyPaid) return window.location.reload();
      if (!res.ok) throw new Error(j.error || "Couldn't start the payment.");
      const Cashfree = await loadSdk();
      await Cashfree({ mode: j.mode }).checkout({ paymentSessionId: j.paymentSessionId, redirectTarget: "_self" });
    } catch (e) {
      setErr(e.message === "sdk" ? "The payment page didn't load. Please try again." : e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button className={className} onClick={pay} disabled={busy}>
        {busy ? "Opening secure payment…" : `Unlock my Full Audit — ₹${price}`}
      </button>
      {err && <p className="err">{err}</p>}
    </>
  );
}
