import { db } from "@/lib/db";
import { createUpsellRuleAction } from "@/app/actions/admin";

export default async function UpsellRulesAdminPage() {
  const rules = await db.upsellRule.findMany({ include: { baseProduct: true, suggestedProduct: true } });
  const products = await db.product.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Upsell / Cross-Sell Rule Setup</h1>

      <form action={createUpsellRuleAction} className="bg-white border rounded-lg p-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">When cart has</label>
          <select name="baseProductId" className="border rounded-md px-2 py-1.5 text-sm">
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Suggest</label>
          <select name="suggestedProductId" className="border rounded-md px-2 py-1.5 text-sm">
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Min margin %</label>
          <input name="minMarginPct" type="number" defaultValue={0} className="w-20 border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="promoted" /> Promoted</label>
        <button className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-sm">Add Rule</button>
      </form>

      <table className="w-full text-sm bg-white border rounded-lg overflow-hidden">
        <thead><tr className="text-left text-slate-500 border-b bg-slate-50"><th className="py-2 px-3">Base Product</th><th>Suggested</th><th>Min Margin</th><th>Promoted</th></tr></thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2 px-3">{r.baseProduct.name}</td>
              <td>{r.suggestedProduct.name}</td>
              <td>{r.minMarginPct}%</td>
              <td>{r.promoted ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
