import { notFound } from "next/navigation";
import { getAudit } from "@/lib/supabase";
import Report from "@/components/Report";
import AutoRefresh from "@/components/AutoRefresh";
import { price } from "@/lib/cashfree";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReportPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const audit = await getAudit(id);
  if (!audit) notFound();

  if (audit.status === "running") {
    return (
      <main className="wrap" style={{ maxWidth: 560 }}>
        <AutoRefresh every={3000} />
        <section className="card">
          <h2>Report ban rahi hai…</h2>
          <p className="muted">{audit.step || "Bas kuch second."}</p>
        </section>
      </main>
    );
  }

  if (audit.status === "failed") {
    return (
      <main className="wrap" style={{ maxWidth: 560 }}>
        <section className="card">
          <h2>Report nahi ban payi</h2>
          <p className="muted">{audit.error}</p>
          <a className="btn btn-primary" href="/">Dobara try karo</a>
        </section>
      </main>
    );
  }

  const cfg = {
    waNumber: process.env.WA_BUSINESS_NUMBER || null,
    callUrl: process.env.STRATEGY_CALL_URL || null,
    price: price(),
    payEnabled: !!(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET),
    paidReturn: sp?.paid === "1",
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
