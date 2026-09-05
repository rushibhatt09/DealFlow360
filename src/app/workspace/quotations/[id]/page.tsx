import { notFound } from "next/navigation";
import { AlertTriangle, Sparkles, MessageSquare } from "lucide-react";
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
  consolidateBackorderAction,
  changeSubscriptionQtyAction,
  cancelSubscriptionAction,
  confirmOrderAction,
  recordPaymentAction,
} from "@/app/actions/quotations";
import { submitRepReplyAction } from "@/app/actions/negotiation";
import { BackLink } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateTime, cn } from "@/lib/utils";

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
      negotiations: { orderBy: { createdAt: "asc" } },
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
      <BackLink href="/workspace/quotations" label="Back to Quotations" />

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{quotation.customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            <StatusBadge status={quotation.customer.tier} /> tier · Rep {quotation.rep.name}
          </p>
        </div>
        <div className="text-right">
          <StatusBadge status={quotation.status} />
          <p className="mt-1 text-sm text-muted-foreground">
            Risk score: <span className="font-medium text-foreground">{riskDetail.riskScore.toFixed(1)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Portal: <code className="text-muted-foreground">/portal/quotations/{quotation.id}</code>
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quotation Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineFinancials.map((l) => {
                const detail = riskDetail.lineDetails.find(
                  (d) => d.category === l.product.category && d.discountPct === l.discountPct,
                );
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-foreground">
                      {l.product.name}
                      {l.addedViaUpsell && (
                        <Badge variant="default" className="ml-2">
                          upsell
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.lineType === "SUBSCRIPTION" ? `Sub · ${l.subscriptionPlan?.name}` : "One-time"}
                    </TableCell>
                    <TableCell>{l.qty}</TableCell>
                    <TableCell className={detail && detail.overagePts > 0 ? "font-medium text-danger" : ""}>
                      {l.discountPct}% {detail && detail.overagePts > 0 && `(+${detail.overagePts.toFixed(1)} over)`}
                    </TableCell>
                    <TableCell>{formatCurrency(l.lineTotal)}</TableCell>
                    <TableCell className={l.margin < 0 ? "text-danger" : "text-success"}>
                      {formatCurrency(l.margin)}
                    </TableCell>
                    <TableCell>
                      {quotation.status === "DRAFT" && (
                        <form action={removeLineAction}>
                          <input type="hidden" name="lineId" value={l.id} />
                          <input type="hidden" name="quotationId" value={quotation.id} />
                          <button className="text-xs font-medium text-danger hover:underline">Remove</button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {lineFinancials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No lines yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {lineFinancials.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell>{formatCurrency(orderTotal)}</TableCell>
                  <TableCell className={orderMargin < 0 ? "text-danger" : "text-success"}>
                    {formatCurrency(orderMargin)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>

          {quotation.status === "DRAFT" && (
            <div className="mt-4">
              <AddLineForm quotationId={quotation.id} products={products} plans={plans} />
            </div>
          )}
        </CardContent>
      </Card>

      {upsellSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Upsell &amp; Cross-Sell Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upsellSuggestions.map((s) => (
              <div
                key={s.productId}
                className="flex items-center justify-between rounded-lg bg-primary-soft px-3 py-2.5 text-sm"
              >
                <div>
                  <span className="font-medium text-foreground">{s.productName}</span>
                  {s.promoted && (
                    <Badge variant="warning" className="ml-2">
                      promoted
                    </Badge>
                  )}
                  <span className="ml-2 text-muted-foreground">
                    margin +{s.marginPct.toFixed(0)}% · {formatCurrency(s.unitPrice)}
                  </span>
                </div>
                <form action={addUpsellLineAction}>
                  <input type="hidden" name="quotationId" value={quotation.id} />
                  <input type="hidden" name="productId" value={s.productId} />
                  <Button type="submit" size="sm">
                    Add to Quote
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {quotation.status === "DRAFT" && quotation.lines.length > 0 && (
        <form action={submitForApprovalAction}>
          <input type="hidden" name="quotationId" value={quotation.id} />
          <Button type="submit" variant="success">
            Submit Quotation
          </Button>
        </form>
      )}

      {quotation.approvalSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approval Chain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Blended risk score: <span className="font-medium text-foreground">{riskDetail.riskScore.toFixed(1)} pts</span>
            </p>
            {quotation.approvalSteps.map((step) => (
              <div key={step.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{step.level}</span>
                  <StatusBadge status={step.status} />
                </div>
                {step.reviewer && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    By {step.reviewer.name} · {step.reason || "no reason given"}
                  </p>
                )}
                {canManageApprovals &&
                  step.status === "PENDING" &&
                  step.id === nextPendingStep?.id &&
                  user.role === ROLE_FOR_LEVEL[step.level] && (
                    <form action={decideApprovalAction} className="mt-3 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="stepId" value={step.id} />
                      <input type="hidden" name="quotationId" value={quotation.id} />
                      <Input
                        name="reason"
                        placeholder="Reason (optional)"
                        className="min-w-[160px] flex-1"
                      />
                      <Button name="decision" value="APPROVED" size="sm" variant="success">
                        Approve
                      </Button>
                      <Button name="decision" value="REJECTED" size="sm" variant="destructive">
                        Reject
                      </Button>
                      <Button name="decision" value="RETURNED" size="sm" variant="outline">
                        Return for Revision
                      </Button>
                    </form>
                  )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {quotation.splits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fulfillment &amp; Warehouse Split</CardTitle>
          </CardHeader>
          <CardContent>
            {quotation.splits.some((s) => s.status === "BACKORDER") && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  Some quantity is on backorder. If stock has arrived, consolidate to check availability again.
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotation.splits.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-foreground">{s.quotationLine.product.name}</TableCell>
                    <TableCell>{s.status === "BACKORDER" ? "—" : s.warehouse.name}</TableCell>
                    <TableCell>{s.qty}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      {s.status === "BACKORDER" ? (
                        <form action={consolidateBackorderAction}>
                          <input type="hidden" name="splitId" value={s.id} />
                          <input type="hidden" name="quotationId" value={quotation.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Consolidate Remaining Backorder
                          </Button>
                        </form>
                      ) : (
                        <form action={overrideFulfillmentAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="splitId" value={s.id} />
                          <input type="hidden" name="quotationId" value={quotation.id} />
                          <Input
                            name="qty"
                            type="number"
                            min={0}
                            defaultValue={s.qty}
                            className="h-8 w-16 text-xs"
                          />
                          <Button type="submit" size="sm" variant="outline">
                            Override
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {quotation.lines.some((l) => l.lineType === "SUBSCRIPTION") && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription &amp; Billing Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quotation.lines
              .filter((l) => l.lineType === "SUBSCRIPTION")
              .map((l) => {
                const lineEntries = quotation.billingEntries.filter((b) => b.quotationLineId === l.id);
                const isCancelled = lineEntries.length > 0 && !lineEntries.some((b) => b.status === "UPCOMING");
                const canManage =
                  !isCancelled && (quotation.status === "APPROVED" || quotation.status === "CONFIRMED");
                return (
                  <div key={l.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {l.product.name} · {l.subscriptionPlan?.name}
                        {isCancelled && (
                          <Badge variant="danger" className="ml-2">
                            Cancelled
                          </Badge>
                        )}
                      </span>
                      {canManage && (
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={changeSubscriptionQtyAction} className="flex items-center gap-1.5">
                            <input type="hidden" name="lineId" value={l.id} />
                            <input type="hidden" name="quotationId" value={quotation.id} />
                            <Input name="qty" type="number" min={1} defaultValue={l.qty} className="h-8 w-16 text-xs" />
                            <Button type="submit" size="sm" variant="outline">
                              Change Qty (prorate)
                            </Button>
                          </form>
                          <form action={cancelSubscriptionAction}>
                            <input type="hidden" name="lineId" value={l.id} />
                            <input type="hidden" name="quotationId" value={quotation.id} />
                            <Button type="submit" size="sm" variant="destructive">
                              Cancel Subscription
                            </Button>
                          </form>
                        </div>
                      )}
                    </div>
                    <Table className="mt-2">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineEntries.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell>
                              {formatDate(b.periodStart)} → {formatDate(b.periodEnd)}
                            </TableCell>
                            <TableCell>{formatCurrency(b.amount)}</TableCell>
                            <TableCell>
                              <StatusBadge status={b.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {(quotation.negotiations.length > 0 ||
        quotation.status === "APPROVED" ||
        quotation.status === "UNDER_NEGOTIATION") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Customer Negotiation Thread
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
              {quotation.negotiations.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    n.author === "CUSTOMER" ? "bg-info-soft" : "bg-primary-soft",
                  )}
                >
                  <span className="block text-xs text-muted-foreground">
                    {n.author === "CUSTOMER" ? quotation.customer.name : "You"}
                  </span>
                  <span className="text-foreground">{n.message}</span>
                </div>
              ))}
              {quotation.negotiations.length === 0 && (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              )}
            </div>
            {(quotation.status === "APPROVED" || quotation.status === "UNDER_NEGOTIATION") && (
              <form action={submitRepReplyAction} className="flex items-center gap-2">
                <input type="hidden" name="quotationId" value={quotation.id} />
                <Input name="message" placeholder="Reply to the customer..." className="flex-1" />
                <Button type="submit">Send Reply</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {quotation.status === "CONFIRMED" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice ? (
              <div className="space-y-3 text-sm">
                <p className="text-foreground">
                  Invoice: <span className="font-medium">{formatCurrency(invoice.amount)}</span> ·{" "}
                  <StatusBadge status={invoice.status} />
                </p>
                {invoice.status !== "PAID" && (
                  <form action={recordPaymentAction} className="flex items-center gap-2">
                    <input type="hidden" name="quotationId" value={quotation.id} />
                    <Select name="method" className="w-32">
                      <option>Bank</option>
                      <option>Cash</option>
                      <option>Card</option>
                    </Select>
                    <Button type="submit" variant="success">
                      Record Payment
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No invoice yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {(quotation.status === "APPROVED" || quotation.status === "UNDER_NEGOTIATION") && (
        <form action={confirmOrderAction}>
          <input type="hidden" name="quotationId" value={quotation.id} />
          <Button type="submit" variant="success">
            Confirm Order (internal)
          </Button>
        </form>
      )}

      {auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {auditLogs.map((log) => (
                <li key={log.id}>
                  {formatDateTime(log.createdAt)} — {log.action} {log.detail && `(${log.detail})`}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
