import { db } from "@/lib/db";
import type { Prisma, QuotationStatus } from "@prisma/client";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ repId?: string; status?: string; from?: string; to?: string }>;
}) {
  const { repId, status, from, to } = await searchParams;
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Reporting &amp; Dashboard</h1>

      <form className="bg-white border rounded-lg p-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Rep</label>
          <select name="repId" defaultValue={repId ?? ""} className="border rounded-md px-2 py-1.5 text-sm">
            <option value="">All</option>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Status</label>
          <select name="status" defaultValue={status ?? ""} className="border rounded-md px-2 py-1.5 text-sm">
            <option value="">All</option>
            {["DRAFT", "PENDING_APPROVAL", "APPROVED", "UNDER_NEGOTIATION", "CONFIRMED", "FULFILLED", "REJECTED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">From</label>
          <input type="date" name="from" defaultValue={from ?? ""} className="border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">To</label>
          <input type="date" name="to" defaultValue={to ?? ""} className="border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <button className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-sm">Filter</button>
      </form>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-slate-500">Total Pipeline Value</p>
          <p className="text-2xl font-semibold">${totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-slate-500">Quotations</p>
          <p className="text-2xl font-semibold">{quotations.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-slate-500">Avg Discount</p>
          <p className="text-2xl font-semibold">{avgDiscount.toFixed(1)}%</p>
        </div>
      </div>

      <section className="bg-white border rounded-lg p-4">
        <h2 className="font-medium mb-3">Top Products by Qty</h2>
        <ul className="text-sm space-y-1">
          {topProducts.map(([name, qty]) => (
            <li key={name} className="flex justify-between"><span>{name}</span><span>{qty}</span></li>
          ))}
        </ul>
      </section>

      <section className="bg-white border rounded-lg p-4">
        <h2 className="font-medium mb-3">Quotations</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="py-1">Customer</th><th>Rep</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id} className="border-b last:border-0">
                <td className="py-1">{q.customer.name}</td><td>{q.rep.name}</td><td>{q.status}</td><td>{q.createdAt.toDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
