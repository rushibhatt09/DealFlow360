import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePortalCustomer } from "@/lib/guards";
import {
  submitChangeRequestAction,
  submitCounterDiscountAction,
  confirmQuotationAction,
} from "@/app/actions/negotiation";

export default async function PortalQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePortalCustomer();
  const { id } = await params;

  const quotation = await db.quotation.findUnique({
    where: { id },
    include: {
      lines: { include: { product: true } },
      negotiations: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!quotation || quotation.customerId !== session.customerId) notFound();

  const total = quotation.lines.reduce(
    (s, l) => s + l.qty * l.unitPrice * (1 - l.discountPct / 100),
    0,
  );

  const canAct = quotation.status === "APPROVED" || quotation.status === "UNDER_NEGOTIATION";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-indigo-700 text-white">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <Link href="/portal" className="text-sm underline">← Back</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white border rounded-lg p-5 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Quotation #{quotation.id.slice(-6)}</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100">{quotation.status.replace("_", " ")}</span>
        </div>

        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-3">Lines</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Product</th><th>Qty</th><th>Discount</th><th>Total</th>
                {canAct && <th>Counter</th>}
              </tr>
            </thead>
            <tbody>
              {quotation.lines.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="py-2">{l.product.name}</td>
                  <td>{l.qty}</td>
                  <td>{l.discountPct}%</td>
                  <td>${(l.qty * l.unitPrice * (1 - l.discountPct / 100)).toFixed(2)}</td>
                  {canAct && (
                    <td>
                      <form action={submitCounterDiscountAction} className="flex items-center gap-1">
                        <input type="hidden" name="quotationId" value={quotation.id} />
                        <input type="hidden" name="lineId" value={l.id} />
                        <input
                          name="counterDiscountPct"
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={l.discountPct}
                          className="w-16 border rounded px-1 py-0.5 text-xs"
                        />
                        <button className="text-xs bg-indigo-600 text-white rounded px-2 py-1">Propose</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-medium border-t">
                <td className="py-2">Total</td><td></td><td></td><td>${total.toFixed(2)}</td>
                {canAct && <td></td>}
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-3">Questions &amp; Comments</h2>
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {quotation.negotiations.map((n) => (
              <div key={n.id} className={`text-sm rounded-md px-3 py-2 ${n.author === "CUSTOMER" ? "bg-indigo-50" : "bg-slate-100"}`}>
                <span className="text-xs text-slate-500 block">{n.author}</span>
                {n.message}
              </div>
            ))}
            {quotation.negotiations.length === 0 && (
              <p className="text-sm text-slate-400">No messages yet.</p>
            )}
          </div>
          {canAct && (
            <form action={submitChangeRequestAction} className="flex items-center gap-2">
              <input type="hidden" name="quotationId" value={quotation.id} />
              <input name="message" placeholder="Ask a question or request a change..." className="flex-1 border rounded-md px-3 py-2 text-sm" />
              <button className="bg-slate-900 text-white rounded-md px-3 py-2 text-sm">Submit Request</button>
            </form>
          )}
        </section>

        {canAct && (
          <form action={confirmQuotationAction}>
            <input type="hidden" name="quotationId" value={quotation.id} />
            <button className="bg-emerald-600 text-white rounded-md px-4 py-2 text-sm hover:bg-emerald-500">
              Confirm Quotation
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
