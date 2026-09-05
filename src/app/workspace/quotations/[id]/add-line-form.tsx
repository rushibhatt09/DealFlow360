"use client";

import { useState } from "react";
import { addLineAction } from "@/app/actions/quotations";

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
    <form action={addLineAction} className="flex flex-wrap items-end gap-2 bg-slate-50 border rounded-lg p-3">
      <input type="hidden" name="quotationId" value={quotationId} />
      <input type="hidden" name="lineType" value={isSubscription ? "SUBSCRIPTION" : "ONE_TIME"} />

      <div>
        <label className="block text-xs text-slate-500 mb-1">Product</label>
        <select
          name="productId"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="border rounded-md px-2 py-1.5 text-sm"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (${p.unitPrice}) — {p.category}
            </option>
          ))}
        </select>
      </div>

      {isSubscription && (
        <div>
          <label className="block text-xs text-slate-500 mb-1">Plan</label>
          <select name="subscriptionPlanId" required className="border rounded-md px-2 py-1.5 text-sm">
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs text-slate-500 mb-1">Qty</label>
        <input name="qty" type="number" min={1} defaultValue={1} className="w-20 border rounded-md px-2 py-1.5 text-sm" />
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Discount %</label>
        <input name="discountPct" type="number" min={0} max={100} defaultValue={0} className="w-24 border rounded-md px-2 py-1.5 text-sm" />
      </div>

      <button type="submit" className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-sm hover:bg-slate-800">
        Add to Quote
      </button>
    </form>
  );
}
