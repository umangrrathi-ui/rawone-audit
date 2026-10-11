import AuditForm from "@/components/AuditForm";
import Logo from "@/components/Logo";
import { RotatingWord, PreviewCard } from "@/components/HeroFx";
import { INDUSTRY_OPTIONS } from "@/lib/benchmarks";

export default function Home() {
  return (
    <>
      <div className="bg-blobs" aria-hidden="true">
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
      </div>
      <main className="page page--landing">
        <div className="topbar reveal">
          <Logo href="/" />
          <span className="tag"><span className="live-dot" />Free · 60 sec</span>
        </div>

        <div className="landing">
        <div className="landing-left">
        <section className="hero">
          <span className="eyebrow reveal" style={{ animationDelay: ".05s" }}>Free Business Audit</span>
          <h1 className="reveal" style={{ animationDelay: ".12s" }}>
            How strong is your <RotatingWord /> <span className="hl">online?</span>
          </h1>
          <p className="lead reveal" style={{ animationDelay: ".2s" }}>
            Enter your Instagram handle and Google Maps link. In under a minute you get a score, the issues holding you back,
            and 3 fixes you can do this week.
          </p>
          <ul className="ticks">
            {[
              "Engagement on your last 9 posts vs your industry benchmark",
              "Google rating, reviews and reply rate check",
              "3 quick wins you can start tomorrow",
            ].map((t, i) => (
              <li className="reveal" key={t} style={{ animationDelay: `${0.28 + i * 0.08}s` }}>{t}</li>
            ))}
          </ul>
        </section>

        <PreviewCard />
        </div>

        <section className="card form-card reveal" style={{ animationDelay: ".5s" }}>
          <AuditForm industries={INDUSTRY_OPTIONS} />
        </section>
        </div>

        <footer className="footer">
          <span>Made by RawOne · Digital marketing studio, Ahmedabad</span>
          <span>We only read public data. Your number is used to share your report and follow up.</span>
        </footer>
      </main>
    </>
  );
}
