// Internal lead list: /admin?key=ADMIN_KEY  (keep this link private)
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads – RawOne Audit", robots: { index: false, follow: false } };

const fmt = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const FB = { yes: "🎯", partly: "🤔", no: "👎" };

export default async function Admin({ searchParams }) {
  const sp = await searchParams;
  const key = process.env.ADMIN_KEY;
  if (!key || sp?.key !== key) notFound();

  const { data: audits } = await db()
    .from("audits")
    .select("id, created_at, name, whatsapp, industry, ig_handle, score, status, paid, deep_status, code, pdf_downloads")
    .order("created_at", { ascending: false })
    .limit(150);
  const ids = (audits || []).map((a) => a.id);
  const { data: fbs } = ids.length
    ? await db().from("audit_feedback").select("audit_id, rating, needs, comment").in("audit_id", ids)
    : { data: [] };
  const fbMap = Object.fromEntries((fbs || []).map((f) => [f.audit_id, f]));
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  const done = (audits || []).filter((a) => a.status === "done");

  return (
    <main className="page" style={{ maxWidth: 1200 }}>
      <div className="topbar">
        <Logo />
        <span className="tag">{done.length} reports · {done.filter((a) => a.paid).length} paid · {Object.keys(fbMap).length} feedback</span>
      </div>
      {sp?.ok && <p className="okmsg">Full audit started for {sp.ok}. It takes 2–3 minutes.</p>}
      <div className="tscroll">
        <table style={{ minWidth: 980 }}>
          <thead>
            <tr>
              <th>When</th><th>Lead</th><th>Instagram</th><th className="num">Score</th><th>Feedback</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(audits || []).map((a) => {
              const f = fbMap[a.id];
              const link = `${base}/r/${a.id}`;
              const waMsg = encodeURIComponent(
                a.paid
                  ? `Hi ${a.name || ""}, your RawOne Full Audit for @${a.ig_handle} is ready: ${link}#full`
                  : `Hi ${a.name || ""}, this is RawOne. Thanks for checking your audit for @${a.ig_handle}: ${link}`
              );
              return (
                <tr key={a.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmt(a.created_at)}</td>
                  <td>
                    <b>{a.name || "–"}</b>
                    <br />
                    {a.whatsapp ? <a href={`https://wa.me/${a.whatsapp}?text=${waMsg}`} target="_blank" rel="noreferrer">+{a.whatsapp}</a> : "–"}
                    <br />
                    <span className="muted small">{a.industry}</span>
                  </td>
                  <td><a href={`https://instagram.com/${a.ig_handle}`} target="_blank" rel="noreferrer">@{a.ig_handle}</a></td>
                  <td className="num">{a.score ?? "–"}{a.pdf_downloads ? <div className="small muted">📄 {a.pdf_downloads}</div> : null}</td>
                  <td style={{ maxWidth: 260 }}>
                    {f ? (
                      <>
                        {FB[f.rating]} {(f.needs || []).join(", ")}
                        {f.comment && <div className="muted small">“{f.comment}”</div>}
                      </>
                    ) : "–"}
                  </td>
                  <td>
                    {a.status !== "done" ? a.status : a.paid ? `Paid · full: ${a.deep_status || "–"}` : "Free"}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {a.status === "done" && <a href={link} target="_blank" rel="noreferrer">Report</a>}
                    {a.status === "done" && !a.paid && (
                      <form action="/api/admin/unlock" method="post" style={{ display: "inline", marginLeft: 10 }}>
                        <input type="hidden" name="key" value={key} />
                        <input type="hidden" name="id" value={a.id} />
                        <button className="fb-chip" type="submit">Mark paid + unlock</button>
                      </form>
                    )}
                    {a.paid && a.deep_status === "failed" && (
                      <form action="/api/admin/unlock" method="post" style={{ display: "inline", marginLeft: 10 }}>
                        <input type="hidden" name="key" value={key} />
                        <input type="hidden" name="id" value={a.id} />
                        <button className="fb-chip" type="submit">Retry full audit</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
