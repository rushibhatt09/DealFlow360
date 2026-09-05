import Link from "next/link";
import { db } from "@/lib/db";
import { requireInternalUser } from "@/lib/guards";
import { createQuotationAction } from "@/app/actions/quotations";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  UNDER_NEGOTIATION: "bg-purple-100 text-purple-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  FULFILLED: "bg-emerald-200 text-emerald-900",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireInternalUser();
  const { view } = await searchParams;
  const isPipeline = view === "pipeline";

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">
          {isPipeline ? "Pipeline" : "Quotations"}
        </h1>
        <form action={createQuotationAction} className="flex items-center gap-2">
          <select name="customerId" required className="border rounded-md px-2 py-1.5 text-sm">
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.tier})</option>
            ))}
          </select>
          <button className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-sm hover:bg-slate-800">
            New Quotation
          </button>
        </form>
      </div>

      <div className={isPipeline ? "grid grid-cols-1 sm:grid-cols-3 gap-4" : "space-y-3"}>
        {quotations.map((q) => (
          <Link
            key={q.id}
            href={`/workspace/quotations/${q.id}`}
            className="block bg-white border rounded-lg p-4 hover:shadow transition-shadow"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{q.customer.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[q.status]}`}>
                {q.status.replace("_", " ")}
              </span>
            </div>
            <div className="text-sm text-slate-500">Rep: {q.rep.name}</div>
            <div className="text-sm text-slate-500">
              ${totalFor(q).toFixed(2)} · {q.lines.length} line(s)
            </div>
            {q.riskScore > 0 && (
              <div className="text-xs text-amber-700 mt-1">Risk score: {q.riskScore.toFixed(1)}</div>
            )}
          </Link>
        ))}
        {quotations.length === 0 && (
          <p className="text-sm text-slate-500">No quotations yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}
