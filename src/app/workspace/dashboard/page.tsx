import Link from "next/link";
import { db } from "@/lib/db";
import { requireInternalUser } from "@/lib/guards";
import {
  findStalledDeals,
  detectDiscountAnomaly,
  weightedAverageDiscount,
} from "@/lib/deal-health-engine";

export default async function DealHealthDashboard() {
  await requireInternalUser();

  const openQuotations = await db.quotation.findMany({
    where: { status: { notIn: ["FULFILLED", "REJECTED", "CANCELLED"] } },
    include: { customer: true, rep: true, lines: true },
  });

  const stalledIds = new Set(
    findStalledDeals(
      openQuotations.map((q) => ({ id: q.id, status: q.status, lastActivityAt: q.lastActivityAt })),
      5,
    ),
  );

  const slippedIds = new Set(
    findStalledDeals(
      openQuotations
        .filter((q) => q.status === "APPROVED")
        .map((q) => ({ id: q.id, status: "DRAFT", lastActivityAt: q.lastActivityAt })),
      3,
    ),
  );

  const reps = await db.user.findMany({ where: { role: "SALES_REP" } });
  const anomalies: { quotationId: string; repName: string; deltaPts: number }[] = [];

  for (const rep of reps) {
    const history = await db.quotation.findMany({
      where: { repId: rep.id, status: { in: ["CONFIRMED", "FULFILLED"] } },
      include: { lines: true },
    });
    if (history.length === 0) continue;
    const historicalAvg =
      history.reduce(
        (s, q) => s + weightedAverageDiscount(q.lines.map((l) => ({ discountPct: l.discountPct, lineTotal: l.qty * l.unitPrice }))),
        0,
      ) / history.length;

    for (const q of openQuotations.filter((oq) => oq.repId === rep.id)) {
      const currentAvg = weightedAverageDiscount(
        q.lines.map((l) => ({ discountPct: l.discountPct, lineTotal: l.qty * l.unitPrice })),
      );
      const anomaly = detectDiscountAnomaly(currentAvg, historicalAvg, 8);
      if (anomaly.isAnomaly) {
        anomalies.push({ quotationId: q.id, repName: rep.name, deltaPts: anomaly.deltaPts });
      }
    }
  }

  const byId = new Map(openQuotations.map((q) => [q.id, q]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Deal Health &amp; Anomaly Dashboard</h1>

      <section className="bg-white border rounded-lg p-5">
        <h2 className="font-medium mb-3">Stalled Deals (inactive 5+ days)</h2>
        <div className="space-y-2">
          {[...stalledIds].map((id) => {
            const q = byId.get(id)!;
            return (
              <Link key={id} href={`/workspace/quotations/${id}`} className="block bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm hover:bg-amber-100">
                {q.customer.name} · {q.rep.name} · {q.status.replace("_", " ")} · last activity {q.lastActivityAt.toDateString()}
              </Link>
            );
          })}
          {stalledIds.size === 0 && <p className="text-sm text-slate-400">No stalled deals right now.</p>}
        </div>
      </section>

      <section className="bg-white border rounded-lg p-5">
        <h2 className="font-medium mb-3">Discount Anomaly Alerts</h2>
        <div className="space-y-2">
          {anomalies.map((a) => (
            <Link key={a.quotationId} href={`/workspace/quotations/${a.quotationId}`} className="block bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm hover:bg-red-100">
              {a.repName} is discounting {a.deltaPts.toFixed(1)} pts above their historical average
            </Link>
          ))}
          {anomalies.length === 0 && <p className="text-sm text-slate-400">No anomalies detected.</p>}
        </div>
      </section>

      <section className="bg-white border rounded-lg p-5">
        <h2 className="font-medium mb-3">Delivery Promise Slippage</h2>
        <div className="space-y-2">
          {[...slippedIds].map((id) => {
            const q = byId.get(id)!;
            return (
              <Link key={id} href={`/workspace/quotations/${id}`} className="block bg-orange-50 border border-orange-200 rounded-md px-3 py-2 text-sm hover:bg-orange-100">
                {q.customer.name} approved but not confirmed/fulfilled for 3+ days
              </Link>
            );
          })}
          {slippedIds.size === 0 && <p className="text-sm text-slate-400">No slippage detected.</p>}
        </div>
      </section>
    </div>
  );
}
