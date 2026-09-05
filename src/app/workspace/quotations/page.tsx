import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireInternalUser } from "@/lib/guards";
import { createQuotationAction } from "@/app/actions/quotations";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export default async function QuotationsPage() {
  const user = await requireInternalUser();

  const quotations = await db.quotation.findMany({
    where: user.role === "SALES_REP" ? { repId: user.userId } : {},
    include: { customer: true, lines: true, rep: true },
    orderBy: { updatedAt: "desc" },
  });

  const customers = await db.customer.findMany({ orderBy: { name: "asc" } });

  const totalFor = (q: (typeof quotations)[number]) =>
    q.lines.reduce((s, l) => s + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0);

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Every quote across your book of business, newest activity first."
        actions={
          <form action={createQuotationAction} className="flex flex-wrap items-center gap-2">
            <Select name="customerId" required className="w-48">
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.tier})
                </option>
              ))}
            </Select>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              New Quotation
            </Button>
          </form>
        }
      />

      <div className="grid grid-cols-1 gap-3">
        {quotations.map((q) => (
          <Link key={q.id} href={`/workspace/quotations/${q.id}`}>
            <Card className="group flex items-center justify-between gap-4 p-4 transition-colors hover:border-primary/40">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{q.customer.name}</span>
                  <StatusBadge status={q.status} />
                  {q.riskScore > 0 && (
                    <span className="text-xs font-medium text-warning">
                      Risk {q.riskScore.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rep {q.rep.name} · {q.lines.length} line{q.lines.length === 1 ? "" : "s"} ·{" "}
                  {formatCurrency(totalFor(q))}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Card>
          </Link>
        ))}
        {quotations.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No quotations yet. Create one above to get started.
          </Card>
        )}
      </div>
    </div>
  );
}
