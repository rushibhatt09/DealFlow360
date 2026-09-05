import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireInternalUser } from "@/lib/guards";
import { calculateBlendedRiskScore } from "@/lib/discount-engine";
import { AddLineForm } from "./add-line-form";
import {
  removeLineAction,
  submitForApprovalAction,
  decideApprovalAction,
  addUpsellLineAction,
  getUpsellSuggestionsForQuotation,
  overrideFulfillmentAction,
  changeSubscriptionQtyAction,
  confirmOrderAction,
  recordPaymentAction,
} from "@/app/actions/quotations";

const ROLE_FOR_LEVEL = { MANAGER: "SALES_MANAGER", FINANCE: "FINANCE" } as const;

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireInternalUser();
  const { id } = await params;

  const quotation = await db.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      rep: true,
      lines: { include: { product: true, subscriptionPlan: true } },
      approvalSteps: { include: { reviewer: true }, orderBy: { sequence: "asc" } },
      splits: { include: { warehouse: true, quotationLine: { include: { product: true } } } },
      billingEntries: { include: { quotationLine: { include: { product: true } } }, orderBy: { periodStart: "asc" } },
      invoices: { include: { payments: true } },
    },
  });
  if (!quotation) notFound();

  const products = await db.product.findMany({ orderBy: { name: "asc" } });
  const plans = await db.subscriptionPlan.findMany({ orderBy: { name: "asc" } });
  const ceilings = await db.discountCeiling.findMany({ where: { tier: quotation.customer.tier } });
  const getCeiling = (tier: string, category: string) =>
    ceilings.find((c) => c.category === category)?.maxDiscountPct;

  const riskDetail = calculateBlendedRiskScore(
    quotation.lines.map((l) => ({
      category: l.product.category,
      discountPct: l.discountPct,
      lineTotal: l.qty * l.unitPrice,
    })),
    quotation.customer.tier,
    getCeiling,
  );

  const lineFinancials = quotation.lines.map((l) => {
    const netUnit = l.unitPrice * (1 - l.discountPct / 100);
    const lineTotal = netUnit * l.qty;
    const margin = (netUnit - l.product.unitCost) * l.qty;
    return { ...l, lineTotal, margin };
  });
  const orderTotal = lineFinancials.reduce((s, l) => s + l.lineTotal, 0);
  const orderMargin = lineFinancials.reduce((s, l) => s + l.margin, 0);

  const upsellSuggestions =
    quotation.status === "DRAFT" && quotation.lines.length > 0
      ? await getUpsellSuggestionsForQuotation(id)
      : [];

  const auditLogs = await db.auditLog.findMany({
    where: { entityId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const canManageApprovals = user.role === "ADMIN" || user.role === "SALES_MANAGER" || user.role === "FINANCE";
  const nextPendingStep = quotation.approvalSteps.find((s) => s.status === "PENDING");

  const invoice = quotation.invoices[0];

  return (
    <div className="space-y-6">
      <Link href="/workspace/quotations" className="text-sm text-slate-500 hover:underline">
        ← Back to Quotations
      </Link>

      <div className="bg-white border rounded-lg p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{quotation.customer.name}</h1>
          <p className="text-sm text-slate-500">
            {quotation.customer.tier} tier · Rep: {quotation.rep.name}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block text-xs px-2 py-1 rounded-full bg-slate-100 font-medium">
            {quotation.status.replace("_", " ")}
          </span>
          <p className="text-sm text-slate-500 mt-1">Risk score: {riskDetail.riskScore.toFixed(1)}</p>
          <p className="text-xs text-slate-400">
            Portal link: <code>/portal/quotations/{quotation.id}</code>
          </p>
        </div>
      </div>

      <section className="bg-white border rounded-lg p-5">
        <h2 className="font-medium mb-3">Quotation Lines</h2>
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-2">Product</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Discount</th>
              <th>Total</th>
              <th>Margin</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lineFinancials.map((l) => {
              const detail = riskDetail.lineDetails.find(
                (d) => d.category === l.product.category && d.discountPct === l.discountPct,
              );
              return (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="py-2">
                    {l.product.name}
                    {l.addedViaUpsell && (
                      <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">upsell</span>
                    )}
                  </td>
                  <td>{l.lineType === "SUBSCRIPTION" ? `Sub · ${l.subscriptionPlan?.name}` : "One-time"}</td>
                  <td>{l.qty}</td>
                  <td className={detail && detail.overagePts > 0 ? "text-red-600 font-medium" : ""}>
                    {l.discountPct}% {detail && detail.overagePts > 0 && `(+${detail.overagePts.toFixed(1)} over)`}
                  </td>
                  <td>${l.lineTotal.toFixed(2)}</td>
                  <td className={l.margin < 0 ? "text-red-600" : "text-emerald-700"}>${l.margin.toFixed(2)}</td>
                  <td>
                    {quotation.status === "DRAFT" && (
                      <form action={removeLineAction}>
                        <input type="hidden" name="lineId" value={l.id} />
                        <input type="hidden" name="quotationId" value={quotation.id} />
                        <button className="text-xs text-red-500 hover:underline">Remove</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {lineFinancials.length === 0 && (
              <tr><td colSpan={7} className="py-4 text-slate-400 text-center">No lines yet.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="font-medium border-t">
              <td className="py-2" colSpan={4}>Total</td>
              <td>${orderTotal.toFixed(2)}</td>
              <td className={orderMargin < 0 ? "text-red-600" : "text-emerald-700"}>${orderMargin.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        {quotation.status === "DRAFT" && (
          <AddLineForm quotationId={quotation.id} products={products} plans={plans} />
        )}
      </section>

      {upsellSuggestions.length > 0 && (
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-3">Upsell &amp; Cross-Sell Suggestions</h2>
          <div className="space-y-2">
            {upsellSuggestions.map((s) => (
              <div key={s.productId} className="flex items-center justify-between bg-indigo-50 rounded-md px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{s.productName}</span>
                  {s.promoted && <span className="ml-2 text-xs bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">promoted</span>}
                  <span className="ml-2 text-slate-500">margin +{s.marginPct.toFixed(0)}% · ${s.unitPrice}</span>
                </div>
                <form action={addUpsellLineAction}>
                  <input type="hidden" name="quotationId" value={quotation.id} />
                  <input type="hidden" name="productId" value={s.productId} />
                  <button className="text-xs bg-indigo-600 text-white rounded px-2 py-1 hover:bg-indigo-500">
                    Add to Quote
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {quotation.status === "DRAFT" && quotation.lines.length > 0 && (
        <form action={submitForApprovalAction}>
          <input type="hidden" name="quotationId" value={quotation.id} />
          <button className="bg-emerald-600 text-white rounded-md px-4 py-2 text-sm hover:bg-emerald-500">
            Submit Quotation
          </button>
        </form>
      )}

      {quotation.approvalSteps.length > 0 && (
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-3">Approval Chain</h2>
          <p className="text-sm text-slate-500 mb-3">Blended risk score: {riskDetail.riskScore.toFixed(1)} pts</p>
          <div className="space-y-3">
            {quotation.approvalSteps.map((step) => (
              <div key={step.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{step.level}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{step.status}</span>
                </div>
                {step.reviewer && (
                  <p className="text-xs text-slate-500 mt-1">
                    By {step.reviewer.name} · {step.reason || "no reason given"}
                  </p>
                )}
                {canManageApprovals &&
                  step.status === "PENDING" &&
                  step.id === nextPendingStep?.id &&
                  user.role === ROLE_FOR_LEVEL[step.level] && (
                    <form action={decideApprovalAction} className="mt-2 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="stepId" value={step.id} />
                      <input type="hidden" name="quotationId" value={quotation.id} />
                      <input
                        name="reason"
                        placeholder="Reason (optional)"
                        className="border rounded-md px-2 py-1 text-xs flex-1 min-w-[140px]"
                      />
                      <button name="decision" value="APPROVED" className="text-xs bg-emerald-600 text-white rounded px-2 py-1">
                        Approve
                      </button>
                      <button name="decision" value="REJECTED" className="text-xs bg-red-600 text-white rounded px-2 py-1">
                        Reject
                      </button>
                      <button name="decision" value="RETURNED" className="text-xs bg-amber-500 text-white rounded px-2 py-1">
                        Return for Revision
                      </button>
                    </form>
                  )}
              </div>
            ))}
          </div>
        </section>
      )}

      {quotation.splits.length > 0 && (
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-3">Fulfillment &amp; Warehouse Split</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Product</th>
                <th>Warehouse</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Override</th>
              </tr>
            </thead>
            <tbody>
              {quotation.splits.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-2">{s.quotationLine.product.name}</td>
                  <td>{s.status === "BACKORDER" ? "—" : s.warehouse.name}</td>
                  <td>{s.qty}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "BACKORDER" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <form action={overrideFulfillmentAction} className="flex items-center gap-1">
                      <input type="hidden" name="splitId" value={s.id} />
                      <input type="hidden" name="quotationId" value={quotation.id} />
                      <input name="qty" type="number" min={0} defaultValue={s.qty} className="w-16 border rounded px-1 py-0.5 text-xs" />
                      <button className="text-xs underline">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {quotation.lines.some((l) => l.lineType === "SUBSCRIPTION") && (
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-3">Subscription &amp; Billing Schedule</h2>
          {quotation.lines.filter((l) => l.lineType === "SUBSCRIPTION").map((l) => (
            <div key={l.id} className="mb-3 border rounded-md p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{l.product.name} · {l.subscriptionPlan?.name}</span>
                {(quotation.status === "APPROVED" || quotation.status === "CONFIRMED") && (
                  <form action={changeSubscriptionQtyAction} className="flex items-center gap-1">
                    <input type="hidden" name="lineId" value={l.id} />
                    <input type="hidden" name="quotationId" value={quotation.id} />
                    <input name="qty" type="number" min={1} defaultValue={l.qty} className="w-16 border rounded px-1 py-0.5 text-xs" />
                    <button className="text-xs bg-slate-900 text-white rounded px-2 py-1">Change Qty (prorate)</button>
                  </form>
                )}
              </div>
              <table className="w-full text-xs mt-2">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th>Period</th><th>Amount</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.billingEntries.filter((b) => b.quotationLineId === l.id).map((b) => (
                    <tr key={b.id}>
                      <td>{b.periodStart.toDateString()} → {b.periodEnd.toDateString()}</td>
                      <td>${b.amount.toFixed(2)}</td>
                      <td>{b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      {quotation.status === "CONFIRMED" && (
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-3">Payment</h2>
          {invoice ? (
            <div className="text-sm space-y-2">
              <p>Invoice: ${invoice.amount.toFixed(2)} · <span className="font-medium">{invoice.status}</span></p>
              {invoice.status !== "PAID" && (
                <form action={recordPaymentAction} className="flex items-center gap-2">
                  <input type="hidden" name="quotationId" value={quotation.id} />
                  <select name="method" className="border rounded px-2 py-1 text-sm">
                    <option>Bank</option>
                    <option>Cash</option>
                    <option>Card</option>
                  </select>
                  <button className="bg-emerald-600 text-white rounded px-3 py-1.5 text-sm">Record Payment</button>
                </form>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No invoice yet.</p>
          )}
        </section>
      )}

      {(quotation.status === "APPROVED" || quotation.status === "UNDER_NEGOTIATION") && (
        <div>
          <form action={confirmOrderAction}>
            <input type="hidden" name="quotationId" value={quotation.id} />
            <button className="bg-emerald-600 text-white rounded-md px-4 py-2 text-sm hover:bg-emerald-500">
              Confirm Order (internal)
            </button>
          </form>
        </div>
      )}

      {auditLogs.length > 0 && (
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-3 text-sm text-slate-500">Audit Trail</h2>
          <ul className="text-xs text-slate-500 space-y-1">
            {auditLogs.map((log) => (
              <li key={log.id}>
                {log.createdAt.toLocaleString()} — {log.action} {log.detail && `(${log.detail})`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
