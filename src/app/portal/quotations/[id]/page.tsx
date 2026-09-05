import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePortalCustomer } from "@/lib/guards";
import { portalLogoutAction } from "@/app/actions/auth";
import {
  submitChangeRequestAction,
  submitCounterDiscountAction,
  confirmQuotationAction,
} from "@/app/actions/negotiation";
import { PortalHeader } from "@/components/portal-header";
import { BackLink } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen">
      <PortalHeader name={session.name} logoutAction={portalLogoutAction} />
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <BackLink href="/portal" label="Back" />

        <Card className="flex items-center justify-between p-5">
          <h1 className="text-lg font-semibold text-foreground">Quotation #{quotation.id.slice(-6)}</h1>
          <StatusBadge status={quotation.status} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Total</TableHead>
                  {canAct && <TableHead>Counter</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotation.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-foreground">{l.product.name}</TableCell>
                    <TableCell>{l.qty}</TableCell>
                    <TableCell>{l.discountPct}%</TableCell>
                    <TableCell>{formatCurrency(l.qty * l.unitPrice * (1 - l.discountPct / 100))}</TableCell>
                    {canAct && (
                      <TableCell>
                        <form action={submitCounterDiscountAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="quotationId" value={quotation.id} />
                          <input type="hidden" name="lineId" value={l.id} />
                          <Input
                            name="counterDiscountPct"
                            type="number"
                            min={0}
                            max={100}
                            defaultValue={l.discountPct}
                            className="h-8 w-16 text-xs"
                          />
                          <Button type="submit" size="sm">
                            Propose
                          </Button>
                        </form>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell>{formatCurrency(total)}</TableCell>
                  {canAct && <TableCell />}
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions &amp; Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
              {quotation.negotiations.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    n.author === "CUSTOMER" ? "bg-primary-soft" : "bg-muted",
                  )}
                >
                  <span className="block text-xs text-muted-foreground">{n.author}</span>
                  <span className="text-foreground">{n.message}</span>
                </div>
              ))}
              {quotation.negotiations.length === 0 && (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              )}
            </div>
            {canAct && (
              <form action={submitChangeRequestAction} className="flex items-center gap-2">
                <input type="hidden" name="quotationId" value={quotation.id} />
                <Input name="message" placeholder="Ask a question or request a change..." className="flex-1" />
                <Button type="submit">Submit Request</Button>
              </form>
            )}
          </CardContent>
        </Card>

        {canAct && (
          <form action={confirmQuotationAction}>
            <input type="hidden" name="quotationId" value={quotation.id} />
            <Button type="submit" variant="success">
              Confirm Quotation
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
