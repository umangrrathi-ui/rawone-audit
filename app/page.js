import AuditForm from "@/components/AuditForm";
import Logo from "@/components/Logo";
import { INDUSTRY_OPTIONS } from "@/lib/benchmarks";

export default function Home() {
  return (
    <main className="page page--narrow">
      <div className="topbar">
        <Logo href="/" />
        <span className="tag">Free · 60 sec</span>
      </div>

      <section className="hero reveal">
        <span className="eyebrow">Free Business Audit</span>
        <h1>
          How strong is your business <span className="hl">online?</span>
        </h1>
        <p className="lead">
          Enter your Instagram handle and Google Maps link. In under a minute you get a score, the issues holding you back,
          and 3 fixes you can do this week.
        </p>
        <ul className="ticks">
          <li>Engagement on your last 9 posts vs your industry benchmark</li>
          <li>Google rating, reviews and reply rate check</li>
          <li>3 quick wins you can start tomorrow</li>
        </ul>
      </section>

      <section className="card reveal" style={{ marginTop: 28, animationDelay: ".1s" }}>
        <AuditForm industries={INDUSTRY_OPTIONS} />
      </section>

      <footer className="footer">
        <span>
          Made by RawOne · Digital marketing studio, Ahmedabad
        </span>
        <span>We only read public data. Your number is used to share your report and follow up.</span>
      </footer>
    </main>
  );
}
