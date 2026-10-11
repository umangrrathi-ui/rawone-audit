// Server component — renders a finished audit. Mirrors the @rawonedesign sample report layout.
import PayButton from "./PayButton";
import { scorecardRows } from "@/lib/score";

const nf = new Intl.NumberFormat("en-IN");
const n = (x) => (x == null ? "–" : nf.format(x));
const pct = (x) => (x == null ? "–" : `${x}%`);
const dateIN = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "–";
const bandColor = (b) => (b === "green" ? "var(--good)" : b === "amber" ? "var(--warn)" : "var(--bad)");
const barColor = (v) => (v >= 70 ? "var(--good)" : v >= 45 ? "var(--warn)" : "var(--bad)");
const SEV = {
  high: ["p-bad", "Fix first"],
  medium: ["p-warn", "Improve"],
  good: ["p-good", "Working"],
};

function Gauge({ score, band }) {
  const c = 2 * Math.PI * 50;
  return (
    <div className="gauge" aria-label={`Overall score ${score} out of 100`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="50" fill="none" stroke={bandColor(band)} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="n">
        <b>{score}</b>
        <span>/ 100</span>
      </div>
    </div>
  );
}

function Finding({ f }) {
  const [cls, label] = SEV[f.severity] || SEV.medium;
  return (
    <div className="finding">
      <span className={`pill ${cls}`}>{label}</span>
      <h3>{f.title}</h3>
      <p>{f.detail}</p>
      {f.fix && (
        <p className="fix">
          <b>Fix</b>
          {f.fix}
        </p>
      )}
    </div>
  );
}

function EngagementChart({ posts, bench }) {
  const data = [...posts].reverse(); // oldest → newest
  const W = 340, H = 180, L = 34, R = 8, T = 14, B = 34;
  const vals = data.map((p) => p.er ?? 0);
  const raw = Math.max(bench || 0, ...vals, 0.5) * 1.1;
  const niceStep = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50].find((s) => raw / s <= 4) || 100;
  const max = Math.ceil(raw / niceStep) * niceStep;
  const step = (W - L - R) / Math.max(1, data.length);
  const bw = Math.min(26, step * 0.62);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const ticks = Array.from({ length: Math.round(max / niceStep) + 1 }, (_, i) => Math.round(i * niceStep * 10) / 10);
  const label = data.map((p) => `${p.format} ${p.er == null ? "likes hidden" : p.er + "%"}`).join(", ");

  return (
    <div className="chart">
      <p className="eyebrow">Engagement rate · last {data.length} posts</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Engagement per post: ${label}. Benchmark ${bench}%`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t ? "2 3" : undefined} />
            <text x={L - 6} y={y(t) + 4} textAnchor="end">{t}%</text>
          </g>
        ))}
        {data.map((p, i) => {
          const x = L + i * step + (step - bw) / 2;
          const v = p.er ?? 0;
          return (
            <g key={i}>
              {p.er == null ? (
                <text x={x + bw / 2} y={y(0) - 6} textAnchor="middle">–</text>
              ) : (
                <rect x={x} y={y(v)} width={bw} height={Math.max(1, y(0) - y(v))} rx="3"
                  fill={bench && v >= bench ? "var(--accent)" : "var(--muted)"} opacity={bench && v >= bench ? 1 : 0.55} />
              )}
              <text x={x + bw / 2} y={H - B + 14} textAnchor="middle">{p.format[0].toUpperCase()}</text>
              <text x={x + bw / 2} y={H - B + 27} textAnchor="middle" style={{ fontSize: 9 }}>
                {p.date ? `${new Date(p.date).getDate()}/${new Date(p.date).getMonth() + 1}` : ""}
              </text>
            </g>
          );
        })}
        {bench ? (
          <>
            <line x1={L} x2={W - R} y1={y(bench)} y2={y(bench)} stroke="var(--warn)" strokeWidth="2" strokeDasharray="6 4" />
          </>
        ) : null}
      </svg>
      <div className="legend">
        <span><i style={{ background: "var(--accent)" }} />Benchmark se upar</span>
        <span><i style={{ background: "var(--muted)", opacity: 0.55 }} />Neeche</span>
        {bench ? <span><i style={{ background: "none", borderTop: "2px dashed var(--warn)", height: 0 }} />Benchmark {bench}%</span> : null}
        <span>R = Reel · C = Carousel · S = Static</span>
      </div>
    </div>
  );
}

function Stars({ n: s }) {
  const k = Math.round(s || 0);
  return <span className="stars" aria-label={`${s} stars`}>{"★".repeat(k)}{"☆".repeat(5 - k)}</span>;
}

function Check({ ok, children }) {
  return (
    <li>
      <span className={ok ? "ck-ok" : "ck-no"} aria-label={ok ? "yes" : "no"}>{ok ? "✓" : "✕"}</span>
      {children}
    </li>
  );
}

function MonthlyChart({ monthly }) {
  if (!monthly?.length) return null;
  const W = 340, H = 150, L = 24, B = 26, T = 12;
  const max = Math.max(...monthly.map((m) => m.posts), 4);
  const step = (W - L - 6) / monthly.length;
  const bw = Math.min(22, step * 0.6);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  return (
    <div className="chart">
      <p className="eyebrow">Posts per month</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={monthly.map((m) => `${m.month}: ${m.posts} posts`).join(", ")}>
        <line x1={L} x2={W - 6} y1={y(0)} y2={y(0)} stroke="var(--line)" />
        <text x={L - 6} y={y(max) + 4} textAnchor="end">{max}</text>
        <text x={L - 6} y={y(0) + 4} textAnchor="end">0</text>
        {monthly.map((m, i) => {
          const x = L + i * step + (step - bw) / 2;
          return (
            <g key={m.month}>
              <rect x={x} y={y(m.posts)} width={bw} height={y(0) - y(m.posts)} rx="2" fill="var(--accent)" />
              <text x={x + bw / 2} y={y(m.posts) - 4} textAnchor="middle">{m.posts}</text>
              <text x={x + bw / 2} y={H - 8} textAnchor="middle">
                {new Date(m.month + "-01").toLocaleDateString("en-IN", { month: "short" })}
              </text>
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
              <td><a href={p.url} target="_blank" rel="noreferrer">{dateIN(p.date)} · {(p.caption || "").slice(0, 50) || "(no caption)"}</a></td>
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
  if (!audit.paid) return null;
  if (audit.deep_status !== "done" || !audit.deep) {
    return (
      <section id="full" className="card">
        <h2>Full audit ban raha hai…</h2>
        <p className="muted">
          {audit.deep_status === "failed"
            ? "Full report mein thodi dikkat aayi. Hamari team ko alert chala gaya hai — aapko WhatsApp pe manually bhej denge."
            : "36 posts aur saare reviews analyse ho rahe hain. 2-3 minute lagenge. Link WhatsApp pe bhi aayega — ye page apne aap update hoga."}
        </p>
      </section>
    );
  }
  const { ig, gmb, ai } = audit.deep;
  return (
    <>
      <section id="full">
        <p className="eyebrow">Full audit · {ig.postsAnalysed} posts{ig.period ? ` · ${dateIN(ig.period.from)} – ${dateIN(ig.period.to)}` : ""}</p>
        <h2>Deep dive</h2>
        <p className="lede">{ai.summary}</p>
        <div className="stats">
          <div className="stat"><b>{pct(ig.avgEr)}</b><small>Avg engagement ({ig.postsAnalysed} posts)</small></div>
          <div className="stat"><b>{ig.postsPerWeek ?? "–"}</b><small>Posts / week</small></div>
          <div className="stat"><b>{ig.gaps?.[0]?.days ?? 0}d</b><small>Longest posting gap</small></div>
        </div>
      </section>

      <section>
        <div className="two">
          <MonthlyChart monthly={ig.monthly} />
          <div className="chart">
            <p className="eyebrow">Format mix</p>
            <div className="tscroll" style={{ border: 0 }}>
              <table style={{ minWidth: 0 }}>
                <thead><tr><th>Format</th><th className="num">Posts</th><th className="num">Avg ER</th></tr></thead>
                <tbody>
                  {Object.entries(ig.formats).map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td className="num">{v.count}</td><td className="num">{pct(v.avgEr)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="eyebrow" style={{ marginTop: 8 }}>Hashtags per post vs engagement</p>
            <div className="tscroll" style={{ border: 0 }}>
              <table style={{ minWidth: 0 }}>
                <thead><tr><th>Hashtags</th><th className="num">Posts</th><th className="num">Avg ER</th></tr></thead>
                <tbody>
                  {ig.hashtagBuckets.filter((b) => b.posts).map((b) => (
                    <tr key={b.range}><td>{b.range}</td><td className="num">{b.posts}</td><td className="num">{pct(b.avgEr)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {ig.gaps?.length > 0 && (
        <section>
          <h3>Posting gaps (7+ din)</h3>
          <div className="chips">
            {ig.gaps.map((g) => (
              <span className="chip" key={g.from}>{dateIN(g.from)} → {dateIN(g.to)}<em>{g.days}d</em></span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3>Top 3 posts</h3>
        <PostTable rows={ig.best} />
        <h3>Bottom 3 posts</h3>
        <PostTable rows={ig.worst} />
      </section>

      <section>
        <h2>Instagram — detailed findings</h2>
        <div className="findings">{ai.ig_findings.map((f, i) => <Finding key={i} f={f} />)}</div>
      </section>

      {ai.gmb_issues?.length > 0 && (
        <section>
          <h2>Google profile — all issues</h2>
          <div className="findings">{ai.gmb_issues.map((f, i) => <Finding key={i} f={f} />)}</div>
        </section>
      )}

      <section>
        <h2>30-din content plan</h2>
        <div className="plan">
          {ai.plan.map((w) => (
            <div className="week" key={w.week}>
              <span className="wk">{w.week}</span>
              <div>
                <h3>{w.focus}</h3>
                <ul>
                  {w.posts.map((p, i) => (
                    <li key={i}><strong>{p.day} · {p.format}:</strong> {p.idea} <em>Hook: “{p.hook}”</em></li>
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
  // API mode: bot replies to "REPORT CODE". Manual mode (no WA API yet): the lead sends us the link itself.
  const waText = encodeURIComponent(
    cfg.waApi
      ? `REPORT ${audit.code}`
      : `Hi RAWONE! Maine @${ig.username} ka free audit kiya. Score ${audit.score}/100.\nReport: ${cfg.reportUrl}\n(code ${audit.code})`
  );
  const waLink = cfg.waNumber ? `https://wa.me/${cfg.waNumber}?text=${waText}` : null;
  const callLink =
    cfg.callUrl ||
    (cfg.waNumber ? `https://wa.me/${cfg.waNumber}?text=${encodeURIComponent(`Strategy call book karna hai (${audit.code})`)}` : "#");

  return (
    <div className="wrap">
      <header>
        <div className="brandrow">
          <a className="brand" href="/">RAWONE</a>
          <span className="tag">Audit · {dateIN(audit.created_at)}</span>
        </div>
        <div>
          <p className="eyebrow">Instagram + Google audit{audit.name ? ` · ${audit.name}` : ""}</p>
          <h1 className={ig.username.length > 16 ? "long" : undefined}>@{ig.username}</h1>
        </div>
        <div className="card verdict">
          <Gauge score={audit.score} band={m.band} />
          <p>{ai.summary}</p>
        </div>
        <p className="eyebrow">
          Based on the latest {ig.posts.length} public posts{gmb ? " and your Google profile" : ""} · {b.label}
        </p>

        {cfg.paidReturn && (
          <p className="ok">Payment mil gaya ✓ Aapki full report 3 minute mein WhatsApp pe aa rahi hai. Ye page bhi apne aap update hoga.</p>
        )}

        {waLink && !audit.wa_verified && (
          <a className="btn btn-wa" href={waLink} target="_blank" rel="noreferrer">
            {cfg.waApi ? "Report WhatsApp pe paao" : "Report WhatsApp pe save karo"}
          </a>
        )}
        {audit.wa_verified && <p className="ok">Report link aapke WhatsApp pe bhej diya gaya hai ✓</p>}
      </header>

      <section>
        <h2>Account snapshot</h2>
        <div className="stats">
          <div className="stat"><b>{n(ig.followers)}</b><small>Followers</small></div>
          <div className="stat"><b>{n(ig.following)}</b><small>Following</small></div>
          <div className="stat"><b>{n(ig.totalPosts)}</b><small>Total posts</small></div>
          <div className="stat">
            <b style={{ color: ig.avgEngagementRate != null && ig.avgEngagementRate >= b.engagementRate ? "var(--good)" : "var(--bad)" }}>
              {pct(ig.avgEngagementRate)}
            </b>
            <small>Avg engagement · benchmark {b.engagementRate}% ({b.tierLabel})</small>
          </div>
          <div className="stat">
            <b>{n(ig.reelAvgViews)}</b>
            <small>Avg views per reel{ig.reelViewsPerFollower != null ? ` · ${ig.reelViewsPerFollower}× followers` : ""}</small>
          </div>
          <div className="stat">
            <b style={{ color: ig.postsPerWeek != null && ig.postsPerWeek >= b.postsPerWeekMin ? "var(--good)" : "var(--bad)" }}>
              {ig.postsPerWeek ?? "–"}
            </b>
            <small>Posts / week · recommended {b.postsPerWeekMin}-{b.postsPerWeekMax}</small>
          </div>
        </div>
        {ig.daysSinceLastPost != null && ig.daysSinceLastPost > 14 && (
          <p className="err">Last post {ig.daysSinceLastPost} din pehle. 14 din se zyada gap mein algorithm reach kam kar deta hai.</p>
        )}
        {ig.hiddenLikesCount > 0 && (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            {ig.hiddenLikesCount} post(s) pe likes hidden hain, isliye unhe engagement average se bahar rakha gaya hai.
          </p>
        )}
      </section>

      <section>
        <h2>Scorecard</h2>
        <div className="score-list">
          {rows.map((r) => (
            <div className="srow" key={r.label}>
              <span className="lbl">{r.label}</span>
              <div className="bar"><i style={{ width: `${r.value}%`, background: barColor(r.value) }} /></div>
              <span className="v">{r.value}</span>
            </div>
          ))}
        </div>
        {m.igOnly && <p className="muted" style={{ fontSize: "0.85rem" }}>Google Maps link nahi diya, isliye score sirf Instagram pe based hai.</p>}
      </section>

      <section>
        <h2>Instagram</h2>
        {ig.posts.length > 0 && <EngagementChart posts={ig.posts} bench={b.engagementRate} />}
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Profile checklist</p>
          <ul className="checks">
            <Check ok={ig.profile.bio}>Clear bio</Check>
            <Check ok={ig.profile.link}>Link in bio</Check>
            <Check ok={ig.profile.category}>Business category{ig.profile.categoryName ? ` (${ig.profile.categoryName})` : ""}</Check>
            <Check ok={ig.profile.business}>Business / creator account</Check>
            <Check ok={ig.formatMix.reel >= 3}>3+ reels in last 9 posts ({ig.formatMix.reel})</Check>
            <Check ok={ig.daysSinceLastPost != null && ig.daysSinceLastPost <= 14}>Posted in last 14 days</Check>
          </ul>
        </div>
        <div className="findings">{(ai.ig_findings || []).map((f, i) => <Finding key={i} f={f} />)}</div>
      </section>

      {gmb ? (
        <section>
          <h2>Google Business Profile</h2>
          <div className="stats">
            <div className="stat">
              <b style={{ color: gmb.rating != null && gmb.rating >= b.gmbRating ? "var(--good)" : "var(--bad)" }}>{gmb.rating ?? "–"}★</b>
              <small>Rating · benchmark {b.gmbRating}</small>
            </div>
            <div className="stat"><b>{n(gmb.reviewsCount)}</b><small>Reviews · benchmark {n(b.gmbReviews)}</small></div>
            <div className="stat">
              <b style={{ color: (gmb.replyRate ?? 0) >= 0.5 ? "var(--good)" : "var(--bad)" }}>
                {gmb.replyRate == null ? "–" : `${Math.round(gmb.replyRate * 100)}%`}
              </b>
              <small>Reply rate (latest {gmb.reviews.length}){gmb.unansweredCount ? ` · ${gmb.unansweredCount} reply baaki` : ""}</small>
            </div>
          </div>

          {gmb.keywords?.length > 0 && (
            <>
              <p className="eyebrow">Log reviews mein kya bolte hain</p>
              <div className="chips">
                {gmb.keywords.map((k) => (
                  <span className="chip" key={k.title}>{k.title}<em>{k.count}</em></span>
                ))}
              </div>
            </>
          )}

          {gmb.reviews.slice(0, 3).map((r, i) => (
            <div className="review" key={i}>
              <div className="meta">
                <span><Stars n={r.stars} /> · {dateIN(r.date)}</span>
                <span className={`badge ${r.replied ? "p-good" : "p-bad"}`}>{r.replied ? "Replied" : "No reply"}</span>
              </div>
              {r.text && <p>{r.text.length > 240 ? r.text.slice(0, 240) + "…" : r.text}</p>}
            </div>
          ))}

          <div className="card">
            <p className="eyebrow" style={{ marginBottom: 10 }}>Profile completeness</p>
            <ul className="checks">
              <Check ok={gmb.completeness.photos >= 20}>20+ photos ({gmb.completeness.photos})</Check>
              <Check ok={gmb.completeness.hours}>Opening hours</Check>
              <Check ok={gmb.completeness.website}>Website</Check>
              <Check ok={gmb.completeness.phone}>Phone number</Check>
              <Check ok={gmb.daysSinceLastReview != null && gmb.daysSinceLastReview < 30}>Review in last 30 days</Check>
              <Check ok={!gmb.claimable}>Profile claimed by owner</Check>
            </ul>
          </div>

          <div className="findings">{(ai.gmb_issues || []).map((f, i) => <Finding key={i} f={f} />)}</div>

          {(ai.review_themes?.praised?.length > 0 || ai.review_themes?.complaints?.length > 0) && (
            <div className="two">
              <div className="card">
                <p className="eyebrow" style={{ color: "var(--good)" }}>Customers ko pasand</p>
                <ul className="bullets" style={{ marginTop: 8 }}>{ai.review_themes.praised.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
              <div className="card">
                <p className="eyebrow" style={{ color: "var(--bad)" }}>Shikayatein</p>
                <ul className="bullets" style={{ marginTop: 8 }}>
                  {ai.review_themes.complaints.length ? ai.review_themes.complaints.map((t, i) => <li key={i}>{t}</li>) : <li>Koi repeat complaint nahi</li>}
                </ul>
              </div>
            </div>
          )}
        </section>
      ) : m.gmbError ? (
        <section className="limits"><h3>Google profile</h3><p className="lede">{m.gmbError}</p></section>
      ) : null}

      <section>
        <h2>3 quick wins</h2>
        <p className="lede">Ye teeno ek-ek din mein ho sakte hain.</p>
        <ol className="wins">{(ai.quick_wins || []).map((w, i) => <li key={i}>{w}</li>)}</ol>
      </section>

      <DeepSection audit={audit} />

      <section className="limits">
        <h3>Ye report kya nahi dekh sakti</h3>
        <p className="lede">
          Ye audit sirf public data pe based hai. Reach, saves, shares, profile visits, follower demographics aur best posting time sirf
          aapke Instagram Insights mein dikhte hain. Benchmark: {b.label}.
        </p>
      </section>

      <div className="ctas">
        {!audit.paid && cfg.payEnabled && (
          <section className="cta">
            <h2>Full audit + 30-din plan</h2>
            <p>Last 36 posts, posting gaps, best/worst posts, hashtag analysis, saare Google issues aur week-wise content plan. 3 minute mein WhatsApp pe.</p>
            <PayButton id={audit.id} price={cfg.price} />
            <p style={{ fontSize: "0.8rem" }}>Client bante ho toh ₹{cfg.price} pehle mahine ke bill mein adjust.</p>
          </section>
        )}
        <section className="cta-alt">
          <h2>Free strategy call</h2>
          <p className="muted">20 minute. Hum aapke Insights saath mein dekhenge aur next steps batayenge.</p>
          <a className="btn btn-primary" href={callLink} target="_blank" rel="noreferrer">Call book karo</a>
        </section>
      </div>

      <footer>
        <span>Prepared by RAWONE, Ahmedabad · Public data · {dateIN(audit.created_at)}</span>
        <span>Report code {audit.code}</span>
      </footer>
    </div>
  );
}
