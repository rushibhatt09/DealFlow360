import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { requirePortalCustomer } from "@/lib/guards";
import { portalLogoutAction } from "@/app/actions/auth";
import { PortalHeader } from "@/components/portal-header";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default async function PortalHome() {
  const session = await requirePortalCustomer();

  const quotations = await db.quotation.findMany({
    where: { customerId: session.customerId, status: { not: "DRAFT" } },
    include: { lines: true },
    orderBy: { updatedAt: "desc" },
  });

  const totalFor = (q: (typeof quotations)[number]) =>
    q.lines.reduce((s, l) => s + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0);

  return (
    <div className="min-h-screen">
      <PortalHeader name={session.name} logoutAction={portalLogoutAction} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <PageHeader title="Your Quotations" description="Review, negotiate, and confirm terms directly." />
        <div className="space-y-3">
          {quotations.map((q) => (
            <Link key={q.id} href={`/portal/quotations/${q.id}`}>
              <Card className="group flex items-center justify-between gap-4 p-4 transition-colors hover:border-primary/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Quotation #{q.id.slice(-6)}</span>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {q.lines.length} line{q.lines.length === 1 ? "" : "s"} · {formatCurrency(totalFor(q))}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Card>
            </Link>
          ))}
          {quotations.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No quotations sent to you yet.
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
