"use client";

// Opens the browser's print dialog (Save as PDF). The print stylesheet in globals.css hides
// interactive bits and shows the clickable CTA page + QR. document.title becomes the PDF file name in Chrome.
export default function DownloadPdf({ id, handle, className = "btn btn--ghost btn--block" }) {
  function go() {
    try {
      navigator.sendBeacon?.("/api/track", new Blob([JSON.stringify({ id, type: "pdf" })], { type: "application/json" }));
    } catch {}
    const old = document.title;
    document.title = `RawOne-Audit-${handle}`;
    // let the title apply before the dialog opens
    setTimeout(() => {
      window.print();
      setTimeout(() => (document.title = old), 1000);
    }, 50);
  }
  return (
    <button type="button" className={`${className} no-print`} onClick={go}>
      📄 Download PDF
    </button>
  );
}
