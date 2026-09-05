import Link from "next/link";
import { Plus, ArrowRight, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireInternalUser } from "@/lib/guards";
import { createQuotationAction } from "@/app/actions/quotations";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import type { Prisma, QuotationStatus } from "@prisma/client";

const STATUSES: QuotationStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "UNDER_NEGOTIATION",
  "CONFIRMED",
  "FULFILLED",
  "REJECTED",
  "CANCELLED",
];
const PAGE_SIZE = 30;

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; customerId?: string; status?: string; repId?: string; page?: string }>;
}) {
  const user = await requireInternalUser();
  const { q, customerId, status, repId, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const canFilterByRep = user.role !== "SALES_REP";

  const where: Prisma.QuotationWhereInput = {};
  if (user.role === "SALES_REP") {
    where.repId = user.userId;
  } else if (canFilterByRep && repId) {
    where.repId = repId;
  }
  if (customerId) where.customerId = customerId;
  if (status) where.status = status as QuotationStatus;
  if (q) where.customer = { name: { contains: q } };

  const [total, quotations, allCustomers, allReps] = await Promise.all([
    db.quotation.count({ where }),
    db.quotation.findMany({
      where,
      include: { customer: true, lines: true, rep: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.customer.findMany({ orderBy: { name: "asc" } }),
    canFilterByRep ? db.user.findMany({ where: { role: "SALES_REP" }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const totalFor = (l: (typeof quotations)[number]["lines"]) =>
    l.reduce((s, ln) => s + ln.qty * ln.unitPrice * (1 - ln.discountPct / 100), 0);

  const groups = new Map<string, { name: string; tier: string; items: typeof quotations }>();
  for (const quo of quotations) {
    const key = quo.customer.id;
    if (!groups.has(key)) groups.set(key, { name: quo.customer.name, tier: quo.customer.tier, items: [] });
    groups.get(key)!.items.push(quo);
  }
  const sortedGroups = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));

  const hasFilters = Boolean(q || customerId || status || repId);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildQuery = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q, customerId, status, repId, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  return (
    <div>
      <PageHeader
        title="Quotations"
        description={`${total} quotation${total === 1 ? "" : "s"} across your book of business.`}
        actions={
          <form action={createQuotationAction} className="flex flex-wrap items-center gap-2">
            <Select name="customerId" required className="w-48">
              {allCustomers.map((c) => (
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

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Search by company</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q ?? ""} placeholder="e.g. Sharma Textiles" className="pl-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Company</label>
            <Select name="customerId" defaultValue={customerId ?? ""} className="w-48">
              <option value="">All companies</option>
              {allCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select name="status" defaultValue={status ?? ""} className="w-44">
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          {canFilterByRep && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rep</label>
              <Select name="repId" defaultValue={repId ?? ""} className="w-40">
                <option value="">All reps</option>
                {allReps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <Button type="submit" variant="outline">
            Apply
          </Button>
          {hasFilters && (
            <Link
              href="/workspace/quotations"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Link>
          )}
        </form>
      </Card>

      <div className="space-y-6">
        {sortedGroups.map((group) => (
          <div key={group.name}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <h2 className="text-sm font-semibold text-foreground">{group.name}</h2>
              <StatusBadge status={group.tier} />
              <span className="text-xs text-muted-foreground">
                {group.items.length} quotation{group.items.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {group.items.map((quo) => (
                <Link key={quo.id} href={`/workspace/quotations/${quo.id}`}>
                  <Card className="group flex items-center justify-between gap-4 p-4 transition-colors hover:border-primary/40">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={quo.status} />
                        {quo.riskScore > 0 && (
                          <span className="text-xs font-medium text-warning">Risk {quo.riskScore.toFixed(1)}</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Rep {quo.rep.name} · {quo.lines.length} line{quo.lines.length === 1 ? "" : "s"} ·{" "}
                        {formatCurrency(totalFor(quo.lines))}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {quotations.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No quotations match these filters.
          </Card>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}
            &ndash;{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            {page <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            ) : (
              <Link href={`/workspace/quotations${buildQuery({ page: page === 2 ? undefined : String(page - 1) })}`}>
                <Button variant="outline" size="sm">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page >= totalPages ? (
              <Button variant="outline" size="sm" disabled>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Link href={`/workspace/quotations${buildQuery({ page: String(page + 1) })}`}>
                <Button variant="outline" size="sm">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
