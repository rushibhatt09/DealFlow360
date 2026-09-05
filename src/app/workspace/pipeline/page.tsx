import Link from "next/link";
import { db } from "@/lib/db";
import { requireInternalUser } from "@/lib/guards";
import { submitForApprovalAction, confirmOrderAction } from "@/app/actions/quotations";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { QuotationStatus } from "@prisma/client";

const COLUMNS: { status: QuotationStatus; label: string }[] = [
  { status: "DRAFT", label: "Draft" },
  { status: "PENDING_APPROVAL", label: "Pending Approval" },
  { status: "APPROVED", label: "Approved" },
  { status: "UNDER_NEGOTIATION", label: "Under Negotiation" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "FULFILLED", label: "Fulfilled" },
];

export default async function PipelinePage() {
  const user = await requireInternalUser();

  const quotations = await db.quotation.findMany({
    where: user.role === "SALES_REP" ? { repId: user.userId } : {},
    include: { customer: true, lines: true, rep: true },
    orderBy: { updatedAt: "desc" },
  });

  const closedCount = quotations.filter(
    (q) => q.status === "REJECTED" || q.status === "CANCELLED",
  ).length;

  const totalFor = (q: (typeof quotations)[number]) =>
    q.lines.reduce((s, l) => s + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0);

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Deals grouped by stage. Click a card to open it, or move it forward directly."
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = quotations.filter((q) => q.status === col.status);
          const columnTotal = items.reduce((s, q) => s + totalFor(q), 0);
          return (
            <div key={col.status} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <p className="mb-2 px-1 text-xs text-muted-foreground">
                {formatCurrency(columnTotal)}
              </p>
              <div className="space-y-2">
                {items.map((q) => (
                  <Card key={q.id} className="p-3">
                    <Link href={`/workspace/quotations/${q.id}`} className="block">
                      <p className="text-sm font-medium text-foreground">{q.customer.name}</p>
                      <p className="text-xs text-muted-foreground">Rep {q.rep.name}</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatCurrency(totalFor(q))}
                      </p>
                      {q.riskScore > 0 && (
                        <p className="mt-1 text-xs font-medium text-warning">
                          Risk {q.riskScore.toFixed(1)}
                        </p>
                      )}
                    </Link>
                    {col.status === "DRAFT" && q.lines.length > 0 && (
                      <form action={submitForApprovalAction} className="mt-2">
                        <input type="hidden" name="quotationId" value={q.id} />
                        <Button type="submit" size="sm" variant="outline" className="w-full">
                          Submit for Approval
                        </Button>
                      </form>
                    )}
                    {col.status === "APPROVED" && (
                      <form action={confirmOrderAction} className="mt-2">
                        <input type="hidden" name="quotationId" value={q.id} />
                        <Button type="submit" size="sm" variant="outline" className="w-full">
                          Confirm Order
                        </Button>
                      </form>
                    )}
                  </Card>
                ))}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No deals here
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {closedCount > 0 && (
          <div className="w-56 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-muted-foreground">Closed / Lost</h3>
              <span className="text-xs text-muted-foreground">{closedCount}</span>
            </div>
            <div className="space-y-2">
              {quotations
                .filter((q) => q.status === "REJECTED" || q.status === "CANCELLED")
                .map((q) => (
                  <Link key={q.id} href={`/workspace/quotations/${q.id}`}>
                    <Card className="p-3 opacity-70">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{q.customer.name}</p>
                        <StatusBadge status={q.status} />
                      </div>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
