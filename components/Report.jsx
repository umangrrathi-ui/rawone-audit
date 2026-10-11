// Server component — the finished audit report.
import { scorecardRows } from "@/lib/score";
import Logo from "./Logo";
import Upsell, { upsellHref } from "./Upsell";
import DownloadPdf from "./DownloadPdf";
import PrintCta from "./PrintCta";
import Feedback from "./Feedback";
import StickyCta from "./StickyCta";

const nf = new Intl.NumberFormat("en-IN");
const n = (x) => (x == null ? "–" : nf.format(x));
const pct = (x) => (x == null ? "–" : `${x}%`);
const dateIN = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "–";
const barColor = (v) => (v >= 70 ? "var(--good)" : v >= 45 ? "var(--warn)" : "var(--bad)");
const SEV = { high: ["p-bad", "Fix first"], medium: ["p-warn", "Improve"], good: ["p-good", "Working well"] };

function gradeFor(score) {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Good, with gaps";
  if (score >= 45) return "Needs work";
  return "Critical";
}

function Gauge({ score }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  return (
    <div className="gauge" aria-label={`Overall score ${score} out of 100`}>
      <svg viewBox="0 0 150 150" aria-hidden="true">
        <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="12" />
        <circle
          className="arc" cx="75" cy="75" r={r} fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ "--len": c }}
        />
      </svg>
      <div className="n">
        <b>{score}</b>
        <span>OUT OF 100</span>
      </div>
    </div>
  );
}

function Chapter({ num, title, sub }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="chapter">
        <span className="num">{num}</span>
        <h2>{title}</h2>
      </div>
      {sub && <p className="muted">{sub}</p>}
    </div>
  );
}

function Finding({ f }) {
  const [cls, label] = SEV[f.severity] || SEV.medium;
  return (
    <div className={`finding sev-${f.severity}`}>
      <span className={`pill ${cls}`}>{label}</span>
      <h3>{f.title}</h3>
      <p>{f.detail}</p>
      {f.fix && (
        <div className="fix">
          <b>Fix</b>
          <span>{f.fix}</span>
        </div>
      )}
    </div>
  );
}

function Check({ ok, children }) {
  return (
    <li>
      <span className={`ic ${ok ? "y" : "n"}`} aria-label={ok ? "yes" : "no"}>{ok ? "✓" : "✕"}</span>
      {children}
    </li>
  );
}

function Stars({ n: s }) {
  const k = Math.round(s || 0);
  return <span className="stars" aria-label={`${s} stars`}>{"★".repeat(k)}{"☆".repeat(5 - k)}</span>;
}

function EngagementChart({ posts, bench }) {
  const data = [...posts].reverse();
  const W = 340, H = 190, L = 34, R = 8, T = 14, B = 36;
  const vals = data.map((p) => p.er ?? 0);
  const raw = Math.max(bench || 0, ...vals, 0.5) * 1.1;
  const step0 = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50].find((s) => raw / s <= 4) || 100;
  const max = Math.ceil(raw / step0) * step0;
  const ticks = Array.from({ length: Math.round(max / step0) + 1 }, (_, i) => Math.round(i * step0 * 10) / 10);
  const step = (W - L - R) / Math.max(1, data.length);
  const bw = Math.min(24, step * 0.6);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const label = data.map((p) => `${p.format} ${p.er == null ? "likes hidden" : p.er + "%"}`).join(", ");
  return (
    <div className="chart">
      <p className="eyebrow">Engagement rate · last {data.length} posts</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Engagement per post: ${label}. Benchmark ${bench}%`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#EFE3D6" strokeDasharray={t ? "3 4" : undefined} />
            <text x={L - 6} y={y(t) + 4} textAnchor="end">{t}%</text>
          </g>
        ))}
        {data.map((p, i) => {
          const x = L + i * step + (step - bw) / 2;
          const v = p.er ?? 0;
          const above = bench && v >= bench;
          return (
            <g key={i}>
              {p.er == null ? (
                <text x={x + bw / 2} y={y(0) - 6} textAnchor="middle">–</text>
              ) : (
                <rect x={x} y={y(v)} width={bw} height={Math.max(1, y(0) - y(v))} rx="4" fill={above ? "#FE6037" : "#FFD5C8"} />
              )}
              <text x={x + bw / 2} y={H - B + 15} textAnchor="middle" style={{ fontWeight: 600 }}>{p.format[0].toUpperCase()}</text>
              <text x={x + bw / 2} y={H - B + 28} textAnchor="middle" style={{ fontSize: 9 }}>
                {p.date ? `${new Date(p.date).getDate()}/${new Date(p.date).getMonth() + 1}` : ""}
              </text>
            </g>
          );
        })}
        {bench ? <line x1={L} x2={W - R} y1={y(bench)} y2={y(bench)} stroke="#141414" strokeWidth="1.5" strokeDasharray="6 4" /> : null}
      </svg>
      <div className="legend">
        <span><i style={{ background: "#FE6037" }} />Above benchmark</span>
        <span><i style={{ background: "#FFD5C8" }} />Below</span>
        {bench ? <span><i style={{ background: "none", borderTop: "2px dashed #141414", height: 0 }} />Benchmark {bench}%</span> : null}
        <span>R = Reel · C = Carousel · S = Static</span>
      </div>
    </div>
  );
}

function MonthlyChart({ monthly }) {
  if (!monthly?.length) return null;
  const W = 340, H = 150, L = 24, B = 26, T = 14;
  const max = Math.max(...monthly.map((m) => m.posts), 4);
  const step = (W - L - 6) / monthly.length;
  const bw = Math.min(22, step * 0.6);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  return (
    <div className="chart">
      <p className="eyebrow">Posts per month</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={monthly.map((m) => `${m.month}: ${m.posts} posts`).join(", ")}>
        <line x1={L} x2={W - 6} y1={y(0)} y2={y(0)} stroke="#EFE3D6" />
        {monthly.map((m, i) => {
          const x = L + i * step + (step - bw) / 2;
          return (
            <g key={m.month}>
              <rect x={x} y={y(m.posts)} width={bw} height={y(0) - y(m.posts)} rx="3" fill="#FE6037" />
              <text x={x + bw / 2} y={y(m.posts) - 4} textAnchor="middle">{m.posts}</text>
              <text x={x + bw / 2} y={H - 8} textAnchor="middle">{new Date(m.month + "-01").toLocaleDateString("en-IN", { month: "short" })}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PostTable({ rows }) {
  return (
    <div className="tscroll">
      <table>
        <thead>
          <tr><th>Post</th><th>Format</th><th className="num">Views</th><th className="num">Likes</th><th className="num">Comments</th><th className="num">ER</th></tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.url}>
              <td><a href={p.url} target="_blank" rel="noreferrer">{dateIN(p.date)} · {(p.caption || "").slice(0, 48) || "(no caption)"}</a></td>
              <td>{p.format}</td>
              <td className="num">{n(p.views)}</td>
              <td className="num">{n(p.likes)}</td>
              <td className="num">{n(p.comments)}</td>
              <td className="num">{pct(p.er)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeepSection({ audit }) {
  if (audit.deep_status !== "done" || !audit.deep) {
    return (
      <section className="section" id="full">
        <Chapter num="07" title="Your Full Audit" />
        <div className="card stack" style={{ alignItems: "center", textAlign: "center" }}>
          {audit.deep_status === "failed" ? (
            <p>Something went wrong while building your full audit. Our team has been alerted and will send it to you on WhatsApp.</p>
          ) : (
            <>
              <div className="loader-mark" style={{ width: 72, height: 72 }}><span className="ring" /></div>
              <h3>Building your full audit…</h3>
              <p className="muted">We're analysing 36 posts and all your reviews. This takes 2–3 minutes and the page will update automatically.</p>
            </>
          )}
        </div>
      </section>
    );
  }
  const { ig, ai } = audit.deep;
  return (
    <>
      <section className="section" id="full">
        <Chapter num="07" title="Your Full Audit" sub={`${ig.postsAnalysed} posts${ig.period ? ` · ${dateIN(ig.period.from)} – ${dateIN(ig.period.to)}` : ""}`} />
        <div className="dark-card stack">
          <span className="eyebrow eyebrow--white">Summary</span>
          <p style={{ fontSize: "1.05rem" }}>{ai.summary}</p>
        </div>
        <div className="stats">
          <div className="stat"><b>{pct(ig.avgEr)}</b><small>Avg engagement ({ig.postsAnalysed} posts)</small></div>
          <div className="stat"><b>{ig.postsPerWeek ?? "–"}</b><small>Posts per week</small></div>
          <div className="stat"><b>{ig.gaps?.[0]?.days ?? 0} days</b><small>Longest posting gap</small></div>
        </div>
        <div className="two">
          <MonthlyChart monthly={ig.monthly} />
          <div className="chart">
            <p className="eyebrow">Format & hashtags</p>
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>Format</th><th className="num">Posts</th><th className="num">Avg ER</th></tr></thead>
              <tbody>
                {Object.entries(ig.formats).map(([k, v]) => (
                  <tr key={k}><td style={{ textTransform: "capitalize" }}>{k}</td><td className="num">{v.count}</td><td className="num">{pct(v.avgEr)}</td></tr>
                ))}
              </tbody>
            </table>
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>Hashtags / post</th><th className="num">Posts</th><th className="num">Avg ER</th></tr></thead>
              <tbody>
                {ig.hashtagBuckets.filter((b) => b.posts).map((b) => (
                  <tr key={b.range}><td>{b.range}</td><td className="num">{b.posts}</td><td className="num">{pct(b.avgEr)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {ig.gaps?.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <h3>Posting gaps (7+ days)</h3>
            <div className="chips">
              {ig.gaps.map((g) => (
                <span className="chip" key={g.from}>{dateIN(g.from)} → {dateIN(g.to)}<em>{g.days}d</em></span>
              ))}
            </div>
          </div>
        )}
        <h3>Your top 3 posts</h3>
        <PostTable rows={ig.best} />
        <h3>Your bottom 3 posts</h3>
        <PostTable rows={ig.worst} />
        <h3>Detailed Instagram findings</h3>
        <div className="findings">{ai.ig_findings.map((f, i) => <Finding key={i} f={f} />)}</div>
        {ai.gmb_issues?.length > 0 && (
          <>
            <h3>Every Google profile issue</h3>
            <div className="findings">{ai.gmb_issues.map((f, i) => <Finding key={i} f={f} />)}</div>
          </>
        )}
      </section>
      <section className="section">
        <Chapter num="08" title="Your 30-Day Content Plan" sub="Built from what already works on your account." />
        <div className="plan">
          {ai.plan.map((w) => (
            <div className="week" key={w.week}>
              <span className="wk">{w.week}</span>
              <div>
                <h3>{w.focus}</h3>
                <ul>
                  {w.posts.map((p, i) => (
                    <li key={i}><strong style={{ textTransform: "capitalize" }}>{p.day} · {p.format}:</strong> {p.idea} <em className="muted">Hook: “{p.hook}”</em></li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function Report({ audit, cfg }) {
  const m = audit.metrics;
  const ig = m.ig;
  const gmb = m.gmb;
  const b = m.bench;
  const ai = audit.ai || {};
  const rows = scorecardRows(m.parts);
  const waText = encodeURIComponent(
    cfg.waApi
      ? `REPORT ${audit.code}`
      : `Hi RawOne! I just got my free audit for @${ig.username} (score ${audit.score}/100).\nReport: ${cfg.reportUrl}\nCode: ${audit.code}`
  );
  const waLink = cfg.waNumber ? `https://wa.me/${cfg.waNumber}?text=${waText}` : null;
  const callLink =
    cfg.callUrl && !cfg.callUrl.includes("wa.me")
      ? cfg.callUrl
      : cfg.waNumber
      ? `https://wa.me/${cfg.waNumber}?text=${encodeURIComponent(`Hi RawOne! I'd like to book a free strategy call for @${ig.username} (code ${audit.code}).`)}`
      : cfg.callUrl || "#";
  const upsellCfg = { ...cfg, handle: ig.username, code: audit.code, id: audit.id };
  const engOk = ig.avgEngagementRate != null && ig.avgEngagementRate >= b.engagementRate;
  const freqOk = ig.postsPerWeek != null && ig.postsPerWeek >= b.postsPerWeekMin;

  return (
    <main className="page">
      <div className="topbar">
        <Logo href="/" />
        <span className="tag">Audit · {dateIN(audit.created_at)}</span>
      </div>

      <section className="rhero reveal">
        <span className="eyebrow">Instagram + Google Audit{audit.name ? ` · ${audit.name}` : ""}</span>
        <h1 className="handle">@{ig.username}</h1>
        <div className="glow-card scorecard">
          <Gauge score={audit.score} />
          <div className="stack" style={{ gap: 10 }}>
            <span className="grade">{gradeFor(audit.score)}</span>
            <p style={{ fontSize: "1.05rem", lineHeight: 1.55 }}>{ai.summary}</p>
          </div>
        </div>
        <p className="muted small">
          Based on your latest {ig.posts.length} public posts{gmb ? " and your Google Business profile" : ""} · compared with {b.label}
        </p>
        {cfg.paidReturn && (
          <p className="okmsg">Payment received ✓ Your full audit is being prepared — this page will update in about 3 minutes.</p>
        )}
        {waLink && !audit.wa_verified && (
          <a className="btn btn--wa btn--block" href={waLink} target="_blank" rel="noreferrer">
            {cfg.waApi ? "Get this report on WhatsApp" : "Save this report to WhatsApp"}
          </a>
        )}
        <DownloadPdf id={audit.id} handle={ig.username} />
      </section>

      <section className="section">
        <Chapter num="01" title="Snapshot" />
        <div className="stats">
          <div className="stat"><b>{n(ig.followers)}</b><small>Followers</small></div>
          <div className="stat"><b>{n(ig.following)}</b><small>Following</small></div>
          <div className="stat"><b>{n(ig.totalPosts)}</b><small>Total posts</small></div>
          <div className="stat">
            <b style={{ color: engOk ? "var(--good)" : "var(--bad)" }}>{pct(ig.avgEngagementRate)}</b>
            <small>Avg engagement</small>
            <span className="vs" style={{ color: "var(--muted)" }}>Benchmark {b.engagementRate}% ({b.tierLabel})</span>
          </div>
          <div className="stat">
            <b>{n(ig.reelAvgViews)}</b>
            <small>Avg views per reel{ig.reelViewsPerFollower != null ? ` · ${ig.reelViewsPerFollower}× followers` : ""}</small>
          </div>
          <div className="stat">
            <b style={{ color: freqOk ? "var(--good)" : "var(--bad)" }}>{ig.postsPerWeek ?? "–"}</b>
            <small>Posts per week</small>
            <span className="vs" style={{ color: "var(--muted)" }}>Recommended {b.postsPerWeekMin}–{b.postsPerWeekMax}</span>
          </div>
        </div>
        {ig.daysSinceLastPost != null && ig.daysSinceLastPost > 14 && (
          <p className="err">Your last post was {ig.daysSinceLastPost} days ago. Gaps longer than 14 days usually reduce your reach.</p>
        )}
        {ig.hiddenLikesCount > 0 && (
          <p className="muted small">{ig.hiddenLikesCount} post(s) have hidden likes, so they're left out of the engagement average.</p>
        )}
      </section>

      <section className="section">
        <Chapter num="02" title="Scorecard" sub={m.igOnly ? "No Google Maps link was given, so this score is based on Instagram only." : undefined} />
        <div className="card bars">
          {rows.map((r) => (
            <div className="brow" key={r.label}>
              <span>{r.label}</span>
              <div className="btrack"><i style={{ width: `${r.value}%`, background: barColor(r.value) }} /></div>
              <span className="v">{r.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <Chapter num="03" title="Instagram" />
        {ig.posts.length > 0 && <EngagementChart posts={ig.posts} bench={b.engagementRate} />}
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 14 }}>Profile checklist</p>
          <ul className="checks">
            <Check ok={ig.profile.bio}>Clear bio</Check>
            <Check ok={ig.profile.link}>Link in bio</Check>
            <Check ok={ig.profile.category}>Business category{ig.profile.categoryName ? ` (${ig.profile.categoryName})` : ""}</Check>
            <Check ok={ig.profile.business}>Business / creator account</Check>
            <Check ok={ig.formatMix.reel >= 3}>3+ reels in last 9 posts ({ig.formatMix.reel})</Check>
            <Check ok={ig.daysSinceLastPost != null && ig.daysSinceLastPost <= 14}>Posted in the last 14 days</Check>
          </ul>
        </div>
        <div className="findings">{(ai.ig_findings || []).map((f, i) => <Finding key={i} f={f} />)}</div>
        {!audit.paid && (
          <a className="card card--beige no-print" href="#unlock" style={{ textDecoration: "none", display: "flex", gap: 12, alignItems: "center" }}>
            <span className="lock-ic" aria-hidden="true">🔒</span>
            <span className="small">
              <b style={{ color: "var(--ink)" }}>This covers only your last {ig.posts.length} posts.</b> The Full Audit analyses 36 posts — month-by-month trend, best & worst posts and hashtags. <span className="text-orange">See what's inside →</span>
            </span>
          </a>
        )}
      </section>

      {gmb ? (
        <section className="section">
          <Chapter num="04" title="Google Business Profile" />
          <div className="stats">
            <div className="stat">
              <b style={{ color: gmb.rating != null && gmb.rating >= b.gmbRating ? "var(--good)" : "var(--bad)" }}>{gmb.rating ?? "–"} ★</b>
              <small>Rating</small><span className="vs" style={{ color: "var(--muted)" }}>Benchmark {b.gmbRating}</span>
            </div>
            <div className="stat"><b>{n(gmb.reviewsCount)}</b><small>Reviews</small><span className="vs" style={{ color: "var(--muted)" }}>Benchmark {n(b.gmbReviews)}</span></div>
            <div className="stat">
              <b style={{ color: (gmb.replyRate ?? 0) >= 0.5 ? "var(--good)" : "var(--bad)" }}>{gmb.replyRate == null ? "–" : `${Math.round(gmb.replyRate * 100)}%`}</b>
              <small>Reply rate (latest {gmb.reviews.length})</small>
              {gmb.unansweredCount ? <span className="vs" style={{ color: "var(--bad)" }}>{gmb.unansweredCount} waiting for a reply</span> : null}
            </div>
          </div>
          {gmb.keywords?.length > 0 && (
            <div className="stack" style={{ gap: 10 }}>
              <p className="eyebrow">What customers mention most</p>
              <div className="chips">
                {gmb.keywords.map((k) => <span className="chip" key={k.title}>{k.title}<em>{k.count}</em></span>)}
              </div>
            </div>
          )}
          {gmb.reviews.slice(0, 3).map((r, i) => (
            <div className="review" key={i}>
              <div className="meta">
                <span><Stars n={r.stars} /> · {dateIN(r.date)}</span>
                <span className={`pill ${r.replied ? "p-good" : "p-bad"}`}>{r.replied ? "Replied" : "No reply"}</span>
              </div>
              {r.text && <p className="small">{r.text.length > 240 ? r.text.slice(0, 240) + "…" : r.text}</p>}
            </div>
          ))}
          <div className="card">
            <p className="eyebrow" style={{ marginBottom: 14 }}>Profile completeness</p>
            <ul className="checks">
              <Check ok={gmb.completeness.photos >= 20}>20+ photos ({gmb.completeness.photos})</Check>
              <Check ok={gmb.completeness.hours}>Opening hours</Check>
              <Check ok={gmb.completeness.website}>Website</Check>
              <Check ok={gmb.completeness.phone}>Phone number</Check>
              <Check ok={gmb.daysSinceLastReview != null && gmb.daysSinceLastReview < 30}>Review in the last 30 days</Check>
              <Check ok={!gmb.claimable}>Profile claimed by owner</Check>
            </ul>
          </div>
          <div className="findings">{(ai.gmb_issues || []).map((f, i) => <Finding key={i} f={f} />)}</div>
          {(ai.review_themes?.praised?.length > 0 || ai.review_themes?.complaints?.length > 0) && (
            <div className="two">
              <div className="card">
                <p className="pill p-good">Customers love</p>
                <ul className="ticks" style={{ marginTop: 12 }}>{ai.review_themes.praised.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
              <div className="card">
                <p className="pill p-bad">Complaints</p>
                <ul style={{ marginTop: 12, paddingLeft: 18, color: "var(--body)" }}>
                  {ai.review_themes.complaints.length ? ai.review_themes.complaints.map((t, i) => <li key={i}>{t}</li>) : <li>No repeated complaints</li>}
                </ul>
              </div>
            </div>
          )}
        </section>
      ) : m.gmbError ? (
        <section className="section">
          <Chapter num="04" title="Google Business Profile" />
          <p className="card">{m.gmbError}</p>
        </section>
      ) : null}

      <section className="section" id="wins">
        <Chapter num="05" title="3 Quick Wins" sub="Each one can be done in a day." />
        <div className="glow-card">
          <ol className="wins">{(ai.quick_wins || []).map((w, i) => <li key={i}>{w}</li>)}</ol>
        </div>
        <DownloadPdf id={audit.id} handle={ig.username} className="btn btn--dark" />
      </section>

      <section className="section no-print">
        <Chapter num="06" title="Did this report hit home?" sub="Two taps. It helps us — and tells us how we can help you." />
        <Feedback id={audit.id} existing={audit.feedback || null} callLink={callLink} />
      </section>

      {audit.paid ? <DeepSection audit={audit} /> : <Upsell cfg={upsellCfg} />}

      <section className="section no-print">
        <div className="dark-card stack">
          <span className="eyebrow">Free strategy call</span>
          <h2>Want us to fix this for you?</h2>
          <p>A free 20-minute call with a RawOne strategist. We'll look at your Insights together and map out the next 90 days.</p>
          <div>
            <a className="btn btn--primary" href={callLink} target="_blank" rel="noreferrer">Book my free call →</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card card--beige stack" style={{ gap: 8 }}>
          <h3>What this report can't see</h3>
          <p className="small">
            This audit uses public data only. Reach, saves, shares, profile visits, follower demographics and your best posting
            time are visible only in your Instagram Insights. Benchmark: {b.label}.
          </p>
        </div>
      </section>

      <PrintCta
        handle={ig.username}
        callLink={callLink}
        unlockLink={cfg.payEnabled ? `${cfg.reportUrl}#unlock` : upsellHref(upsellCfg)}
        reportUrl={cfg.reportUrl}
        waNumber={cfg.waNumber}
        price={cfg.price}
        paid={audit.paid}
      />
      <div className="print-only print-footer">
        Prepared by RawOne · <a href={cfg.reportUrl}>audit.rawone.co.in</a> · <a href={callLink}>Book a free call</a>
      </div>

      <footer className="footer">
        <span>Prepared by RawOne · Ahmedabad · {dateIN(audit.created_at)}</span>
        <span>Report code {audit.code}</span>
      </footer>

      {!audit.paid && <StickyCta cfg={upsellCfg} />}
    </main>
  );
}
