import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireInternalUser } from "@/lib/guards";
import { submitForApprovalAction, confirmOrderAction } from "@/app/actions/quotations";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { Prisma, QuotationStatus } from "@prisma/client";

const COLUMNS: { status: QuotationStatus; label: string }[] = [
  { status: "DRAFT", label: "Draft" },
  { status: "PENDING_APPROVAL", label: "Pending Approval" },
  { status: "APPROVED", label: "Approved" },
  { status: "UNDER_NEGOTIATION", label: "Under Negotiation" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "FULFILLED", label: "Fulfilled" },
];
const COLUMN_CARD_LIMIT = 12;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireInternalUser();
  const { q } = await searchParams;

  const where: Prisma.QuotationWhereInput = user.role === "SALES_REP" ? { repId: user.userId } : {};
  if (q) where.customer = { name: { contains: q } };

  const quotations = await db.quotation.findMany({
    where,
    include: { customer: true, lines: true, rep: true },
    orderBy: { updatedAt: "desc" },
  });

  const closedCount = quotations.filter(
    (quo) => quo.status === "REJECTED" || quo.status === "CANCELLED",
  ).length;

  const totalFor = (quo: (typeof quotations)[number]) =>
    quo.lines.reduce((s, l) => s + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0);

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Deals grouped by stage. Click a card to open it, or move it forward directly."
      />

      <Card className="mb-5 p-4">
        <form className="flex items-end gap-3">
          <div className="w-72 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Search by company</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q ?? ""} placeholder="e.g. Wipro Systems Hub" className="pl-8" />
            </div>
          </div>
          <Button type="submit" variant="outline">
            Apply
          </Button>
          {q && (
            <Link href="/workspace/pipeline" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Clear
            </Link>
          )}
        </form>
      </Card>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = quotations.filter((quo) => quo.status === col.status);
          const columnTotal = items.reduce((s, quo) => s + totalFor(quo), 0);
          const visible = items.slice(0, COLUMN_CARD_LIMIT);
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
                {visible.map((quo) => (
                  <Card key={quo.id} className="p-3">
                    <Link href={`/workspace/quotations/${quo.id}`} className="block">
                      <p className="text-sm font-medium text-foreground">{quo.customer.name}</p>
                      <p className="text-xs text-muted-foreground">Rep {quo.rep.name}</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatCurrency(totalFor(quo))}
                      </p>
                      {quo.riskScore > 0 && (
                        <p className="mt-1 text-xs font-medium text-warning">
                          Risk {quo.riskScore.toFixed(1)}
                        </p>
                      )}
                    </Link>
                    {col.status === "DRAFT" && quo.lines.length > 0 && (
                      <form action={submitForApprovalAction} className="mt-2">
                        <input type="hidden" name="quotationId" value={quo.id} />
                        <Button type="submit" size="sm" variant="outline" className="w-full">
                          Submit for Approval
                        </Button>
                      </form>
                    )}
                    {col.status === "APPROVED" && (
                      <form action={confirmOrderAction} className="mt-2">
                        <input type="hidden" name="quotationId" value={quo.id} />
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
                {items.length > COLUMN_CARD_LIMIT && (
                  <Link
                    href={`/workspace/quotations?status=${col.status}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                    className="block rounded-lg border border-dashed border-border p-3 text-center text-xs font-medium text-primary hover:bg-muted"
                  >
                    View all {items.length} in list →
                  </Link>
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
                .filter((quo) => quo.status === "REJECTED" || quo.status === "CANCELLED")
                .slice(0, COLUMN_CARD_LIMIT)
                .map((quo) => (
                  <Link key={quo.id} href={`/workspace/quotations/${quo.id}`}>
                    <Card className="p-3 opacity-70">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{quo.customer.name}</p>
                        <StatusBadge status={quo.status} />
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
