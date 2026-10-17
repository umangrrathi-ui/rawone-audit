import { notFound } from "next/navigation";
import { db, getAudit } from "@/lib/supabase";
import Report from "@/components/Report";
import AutoRefresh from "@/components/AutoRefresh";
import RunningView from "@/components/RunningView";
import Logo from "@/components/Logo";
import { price } from "@/lib/cashfree";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Audit Report – RawOne", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getFeedback(id) {
  if (process.env.MOCK_REPORT === "1") return null;
  const { data } = await db().from("audit_feedback").select("rating, needs").eq("audit_id", id).maybeSingle();
  return data || null;
}

export default async function ReportPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const audit = await getAudit(id);
  if (!audit) notFound();

  if (audit.status === "running") {
    return (
      <main className="page page--narrow">
        <div className="topbar"><Logo /></div>
        <section className="card"><RunningView id={id} handle={audit.ig_handle} /></section>
      </main>
    );
  }

  if (audit.status === "failed") {
    return (
      <main className="page page--narrow">
        <div className="topbar"><Logo /></div>
        <section className="card stack">
          <span className="eyebrow">Audit stopped</span>
          <h2>We couldn't build this report</h2>
          <p>{audit.error}</p>
          <div><a className="btn btn--primary" href="/">Try again</a></div>
        </section>
      </main>
    );
  }

  audit.feedback = await getFeedback(id).catch(() => null);

  const cfg = {
    waNumber: process.env.WA_BUSINESS_NUMBER || null,
    callUrl: process.env.STRATEGY_CALL_URL || null,
    price: price(),
    waApi: !!(process.env.WA_TOKEN && process.env.WA_PHONE_NUMBER_ID),
    reportUrl: `${(process.env.APP_URL || "").replace(/\/$/, "")}/r/${audit.id}`,
    payEnabled: !!(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET),
    paidReturn: sp?.paid === "1",
    // Event booth offer: Full Audit shown as ₹999 struck out → FREE, claimed via our booth representative.
    // On by default; set BOOTH_OFFER=0 in .env after the event to go back to normal pricing.
    booth: process.env.BOOTH_OFFER !== "0",
    boothMrp: Number(process.env.BOOTH_MRP) || 999,
  };

  const deepPending = audit.paid && audit.deep_status !== "done" && audit.deep_status !== "failed";
  const waitingForPayment = cfg.paidReturn && !audit.paid;

  return (
    <>
      {(deepPending || waitingForPayment) && <AutoRefresh every={5000} />}
      <Report audit={audit} cfg={cfg} />
    </>
  );
}
