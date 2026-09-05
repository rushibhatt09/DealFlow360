import { Download, DollarSign, FileText, Percent } from "lucide-react";
import { db } from "@/lib/db";
import type { Prisma, QuotationStatus } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "UNDER_NEGOTIATION", "CONFIRMED", "FULFILLED", "REJECTED"];
const CATEGORIES = ["Hardware", "Services", "Subscriptions"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ repId?: string; status?: string; category?: string; from?: string; to?: string }>;
}) {
  const { repId, status, category, from, to } = await searchParams;
  const reps = await db.user.findMany({ where: { role: "SALES_REP" } });

  const where: Prisma.QuotationWhereInput = {};
  if (repId) where.repId = repId;
  if (status) where.status = status as QuotationStatus;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (category) where.lines = { some: { product: { category } } };

  const quotations = await db.quotation.findMany({
    where,
    include: { customer: true, rep: true, lines: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalValue = quotations.reduce(
    (s, q) => s + q.lines.reduce((ls, l) => ls + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0),
    0,
  );
  const avgDiscount =
    quotations.length === 0
      ? 0
      : quotations.reduce((s, q) => s + (q.lines.reduce((ls, l) => ls + l.discountPct, 0) / (q.lines.length || 1)), 0) /
        quotations.length;

  const productTotals = new Map<string, number>();
  for (const q of quotations) {
    for (const l of q.lines) {
      productTotals.set(l.product.name, (productTotals.get(l.product.name) ?? 0) + l.qty);
    }
  }
  const topProducts = [...productTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const exportQuery = new URLSearchParams({
    ...(repId ? { repId } : {}),
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting & Dashboard"
        description="Sales performance across reps, categories, and approval status."
        actions={
          <a href={`/admin/reports/export${exportQuery ? `?${exportQuery}` : ""}`}>
            <Button variant="outline">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </a>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Rep</Label>
              <Select name="repId" defaultValue={repId ?? ""} className="w-40">
                <option value="">All</option>
                {reps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select name="status" defaultValue={status ?? ""} className="w-44">
                <option value="">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select name="category" defaultValue={category ?? ""} className="w-40">
                <option value="">All</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" name="from" defaultValue={from ?? ""} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" name="to" defaultValue={to ?? ""} className="w-40" />
            </div>
            <Button type="submit">Filter</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Pipeline Value" value={formatCurrency(totalValue)} icon={DollarSign} />
        <StatCard label="Quotations" value={quotations.length} icon={FileText} />
        <StatCard label="Avg Discount" value={`${avgDiscount.toFixed(1)}%`} icon={Percent} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Products by Qty</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {topProducts.map(([name, qty]) => (
              <li key={name} className="flex justify-between border-b border-border py-1.5 last:border-0">
                <span className="text-foreground">{name}</span>
                <span className="font-medium text-foreground">{qty}</span>
              </li>
            ))}
            {topProducts.length === 0 && <p className="text-muted-foreground">No data for this filter.</p>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium text-foreground">{q.customer.name}</TableCell>
                  <TableCell>{q.rep.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={q.status} />
                  </TableCell>
                  <TableCell>{formatDate(q.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
