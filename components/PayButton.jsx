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

export default function PayButton({ id, price, className = "btn btn-light" }) {
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
      if (!res.ok) throw new Error(j.error || "Payment shuru nahi ho paya.");
      const Cashfree = await loadSdk();
      const cf = Cashfree({ mode: j.mode });
      await cf.checkout({ paymentSessionId: j.paymentSessionId, redirectTarget: "_self" });
    } catch (e) {
      setErr(e.message === "sdk" ? "Payment page load nahi hua. Dobara try karo." : e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button className={className} onClick={pay} disabled={busy}>
        {busy ? "Payment khul raha hai…" : `Full audit + 30-din plan — ₹${price}`}
      </button>
      {err && <p className="err">{err}</p>}
    </>
  );
}
