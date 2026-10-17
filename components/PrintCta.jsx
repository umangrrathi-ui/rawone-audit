// Print-only closing page: clickable CTAs + QR fallback. Hidden on screen.
import QRCode from "qrcode";

export default async function PrintCta({ handle, callLink, unlockLink, reportUrl, waNumber, price, paid, booth, boothMrp }) {
  const qr = await QRCode.toString(callLink, { type: "svg", margin: 0, color: { dark: "#141414", light: "#ffffff" } });
  const phone = waNumber ? `+${waNumber.slice(0, 2)} ${waNumber.slice(2, 7)} ${waNumber.slice(7)}` : null;
  return (
    <section className="print-only print-cta">
      <div className="pc-head">
        <span className="eyebrow">Next step</span>
        <h2>Want RawOne to fix this for @{handle}?</h2>
        <p>Book a free 20-minute strategy call. We'll go through your Insights together and map out your next 90 days.</p>
      </div>
      <div className="pc-grid">
        <div className="pc-links">
          <a className="pc-btn pc-btn--primary" href={callLink}>Book my free strategy call →</a>
          {!paid && unlockLink && (
            <a className="pc-btn" href={unlockLink}>{booth ? <>Get the Full Audit + 30-day plan FREE at our booth (worth ₹{boothMrp}) →</> : <>Unlock the Full Audit + 30-day plan — ₹{price} →</>}</a>
          )}
          <a className="pc-btn" href={reportUrl}>Open the live report →</a>
          <p className="pc-contact">
            {phone && <>WhatsApp <a href={callLink}>{phone}</a> · </>}
            <a href="mailto:info@rawone.in">info@rawone.in</a>
          </p>
        </div>
        <div className="pc-qr">
          <div dangerouslySetInnerHTML={{ __html: qr }} />
          <span>Scan to book your free call</span>
        </div>
      </div>
    </section>
  );
}
