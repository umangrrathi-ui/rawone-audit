"use client";
import { useEffect, useState } from "react";

// Appears once the reader passes the Quick Wins section; hides again while the offer itself is on screen.
export default function StickyCta({ cfg }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const wins = document.getElementById("wins");
    const unlock = document.getElementById("unlock");
    let passedWins = false;
    let offerVisible = false;
    const update = () => setShow(passedWins && !offerVisible);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === wins) passedWins = e.boundingClientRect.top < 0 || e.isIntersecting;
        if (e.target === unlock) offerVisible = e.isIntersecting;
      }
      update();
    });
    if (wins) io.observe(wins);
    if (unlock) io.observe(unlock);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`sticky ${show ? "show" : ""}`} aria-hidden={!show}>
      <p>
        <b>Full Audit + 30-day plan</b>
        <br />
        <span style={{ opacity: 0.75 }}>36 posts · every Google issue · ₹{cfg.price}</span>
      </p>
      <a className="btn btn--primary" href="#unlock" tabIndex={show ? 0 : -1}>
        Unlock →
      </a>
    </div>
  );
}
