import Link from "next/link";
import { AlertTriangle, TrendingDown, Clock, Bell } from "lucide-react";
import { db } from "@/lib/db";
import { requireInternalUser } from "@/lib/guards";
import { nudgeQuotationAction } from "@/app/actions/quotations";
import {
  findStalledDeals,
  detectDiscountAnomaly,
  weightedAverageDiscount,
} from "@/lib/deal-health-engine";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function DealHealthDashboard() {
  const user = await requireInternalUser();
  const canNudge = user.role === "SALES_MANAGER" || user.role === "ADMIN";

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
  const LIST_LIMIT = 8;

  const stalledSorted = [...stalledIds].sort(
    (a, b) => byId.get(a)!.lastActivityAt.getTime() - byId.get(b)!.lastActivityAt.getTime(),
  );
  const slippedSorted = [...slippedIds].sort(
    (a, b) => byId.get(a)!.lastActivityAt.getTime() - byId.get(b)!.lastActivityAt.getTime(),
  );
  const anomaliesSorted = [...anomalies].sort((a, b) => b.deltaPts - a.deltaPts);

  const NudgeButton = ({ quotationId }: { quotationId: string }) =>
    canNudge ? (
      <form action={nudgeQuotationAction}>
        <input type="hidden" name="quotationId" value={quotationId} />
        <Button type="submit" size="sm" variant="outline">
          <Bell className="h-3.5 w-3.5" />
          Nudge
        </Button>
      </form>
    ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal Health & Anomaly Dashboard"
        description="Catch a deal losing momentum before it goes cold."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Stalled Deals" value={stalledIds.size} icon={Clock} tone="warning" hint="Inactive 5+ days" />
        <StatCard label="Discount Anomalies" value={anomalies.length} icon={AlertTriangle} tone="danger" hint="Above rep's own average" />
        <StatCard label="Delivery Slippage" value={slippedIds.size} icon={TrendingDown} tone="warning" hint="Approved 3+ days, not confirmed" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stalled Deals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stalledSorted.slice(0, LIST_LIMIT).map((id) => {
            const q = byId.get(id)!;
            return (
              <div
                key={id}
                className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm"
              >
                <Link href={`/workspace/quotations/${id}`} className="flex-1 hover:underline">
                  <span className="font-medium text-foreground">{q.customer.name}</span> · {q.rep.name} ·{" "}
                  <StatusBadge status={q.status} /> · last activity {formatDate(q.lastActivityAt)}
                </Link>
                <NudgeButton quotationId={id} />
              </div>
            );
          })}
          {stalledIds.size === 0 && <p className="text-sm text-muted-foreground">No stalled deals right now.</p>}
          {stalledSorted.length > LIST_LIMIT && (
            <p className="pt-1 text-xs text-muted-foreground">
              Showing the {LIST_LIMIT} longest-stalled of {stalledSorted.length}. Use the Quotations list to filter the rest.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discount Anomaly Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {anomaliesSorted.slice(0, LIST_LIMIT).map((a) => (
            <div
              key={a.quotationId}
              className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm"
            >
              <Link href={`/workspace/quotations/${a.quotationId}`} className="flex-1 hover:underline">
                <span className="font-medium text-foreground">{a.repName}</span> is discounting{" "}
                <span className="font-medium">{a.deltaPts.toFixed(1)} pts</span> above their historical average
              </Link>
              <NudgeButton quotationId={a.quotationId} />
            </div>
          ))}
          {anomalies.length === 0 && <p className="text-sm text-muted-foreground">No anomalies detected.</p>}
          {anomaliesSorted.length > LIST_LIMIT && (
            <p className="pt-1 text-xs text-muted-foreground">
              Showing the {LIST_LIMIT} largest of {anomaliesSorted.length} anomalies.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Promise Slippage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {slippedSorted.slice(0, LIST_LIMIT).map((id) => {
            const q = byId.get(id)!;
            return (
              <div
                key={id}
                className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm"
              >
                <Link href={`/workspace/quotations/${id}`} className="flex-1 hover:underline">
                  <span className="font-medium text-foreground">{q.customer.name}</span> approved but not
                  confirmed/fulfilled for 3+ days
                </Link>
                <NudgeButton quotationId={id} />
              </div>
            );
          })}
          {slippedIds.size === 0 && <p className="text-sm text-muted-foreground">No slippage detected.</p>}
          {slippedSorted.length > LIST_LIMIT && (
            <p className="pt-1 text-xs text-muted-foreground">
              Showing {LIST_LIMIT} of {slippedSorted.length}. Use the Quotations list to filter the rest.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
