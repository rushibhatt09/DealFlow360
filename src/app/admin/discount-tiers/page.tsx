import { db } from "@/lib/db";
import { createDiscountCeilingAction, createApprovalRuleAction } from "@/app/actions/admin";

export default async function DiscountTiersAdminPage() {
  const ceilings = await db.discountCeiling.findMany({ orderBy: [{ tier: "asc" }, { category: "asc" }] });
  const rules = await db.approvalRule.findMany({ orderBy: { minScore: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Discount Tier &amp; Approval Chain Setup</h1>

      <section className="bg-white border rounded-lg p-4">
        <h2 className="font-medium mb-3">Discount Ceilings (by tier &amp; category)</h2>
        <form action={createDiscountCeilingAction} className="flex flex-wrap items-end gap-2 mb-4">
          <select name="tier" className="border rounded-md px-2 py-1.5 text-sm">
            <option>BRONZE</option><option>SILVER</option><option>GOLD</option>
          </select>
          <input name="category" placeholder="Category (or ALL)" className="border rounded-md px-2 py-1.5 text-sm" required />
          <input name="maxDiscountPct" type="number" step="0.1" placeholder="Max %" required className="w-24 border rounded-md px-2 py-1.5 text-sm" />
          <button className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-sm">Save Ceiling</button>
        </form>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="py-1">Tier</th><th>Category</th><th>Max Discount</th></tr></thead>
          <tbody>
            {ceilings.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-1">{c.tier}</td><td>{c.category}</td><td>{c.maxDiscountPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white border rounded-lg p-4">
        <h2 className="font-medium mb-3">Approval Chain Rules (by blended risk score)</h2>
        <form action={createApprovalRuleAction} className="flex flex-wrap items-end gap-2 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Min score</label>
            <input name="minScore" type="number" step="0.1" required className="w-24 border rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Max score (blank = no limit)</label>
            <input name="maxScore" type="number" step="0.1" className="w-28 border rounded-md px-2 py-1.5 text-sm" />
          </div>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="requiresManager" defaultChecked /> Manager</label>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="requiresFinance" /> Finance</label>
          <button className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-sm">Add Rule</button>
        </form>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="py-1">Score Range</th><th>Manager</th><th>Finance</th></tr></thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-1">{r.minScore} – {r.maxScore ?? "∞"}</td>
                <td>{r.requiresManager ? "Yes" : "No"}</td>
                <td>{r.requiresFinance ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
