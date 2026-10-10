import AuditForm from "@/components/AuditForm";
import { INDUSTRY_OPTIONS } from "@/lib/benchmarks";

export default function Home() {
  return (
    <main className="wrap" style={{ maxWidth: 560 }}>
      <header>
        <div className="brandrow">
          <span className="brand">RAWONE</span>
          <span className="tag">Free · 45 sec</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="eyebrow">Instagram + Google audit</p>
          <h1>Aapka business online kitna strong hai?</h1>
          <p className="lede">
            Apna Instagram handle aur Google Maps link daalo. 45 second mein score, 3-4 problems aur 3 quick fixes —
            screen pe aur WhatsApp pe.
          </p>
        </div>
        <ul className="bullets">
          <li>Last 9 posts ka engagement vs industry benchmark</li>
          <li>Google rating, reviews aur reply rate check</li>
          <li>3 quick wins jo aap kal se kar sakte ho</li>
        </ul>
      </header>

      <section className="card">
        <AuditForm industries={INDUSTRY_OPTIONS} />
      </section>

      <footer>
        <span>RAWONE · Digital marketing agency, Ahmedabad</span>
      </footer>
    </main>
  );
}
