"use client";

import { useState } from "react";
import { addLineAction } from "@/app/actions/quotations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
}

export function AddLineForm({
  quotationId,
  products,
  plans,
}: {
  quotationId: string;
  products: Product[];
  plans: SubscriptionPlan[];
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId);
  const isSubscription = product?.category === "Subscriptions";

  return (
    <form
      action={addLineAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border bg-muted/50 p-4"
    >
      <input type="hidden" name="quotationId" value={quotationId} />
      <input type="hidden" name="lineType" value={isSubscription ? "SUBSCRIPTION" : "ONE_TIME"} />

      <div className="space-y-1.5">
        <Label>Product</Label>
        <Select
          name="productId"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-56"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({formatCurrency(p.unitPrice)}) — {p.category}
            </option>
          ))}
        </Select>
      </div>

      {isSubscription && (
        <div className="space-y-1.5">
          <Label>Plan</Label>
          <Select name="subscriptionPlanId" required className="w-44">
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Qty</Label>
        <Input name="qty" type="number" min={1} defaultValue={1} className="w-20" />
      </div>

      <div className="space-y-1.5">
        <Label>Discount %</Label>
        <Input name="discountPct" type="number" min={0} max={100} defaultValue={0} className="w-24" />
      </div>

      <Button type="submit">Add to Quote</Button>
    </form>
  );
}
