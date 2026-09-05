import { db } from "@/lib/db";
import { createSubscriptionPlanAction } from "@/app/actions/admin";

export default async function SubscriptionPlansAdminPage() {
  const plans = await db.subscriptionPlan.findMany();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Subscription / Recurring Plan Setup</h1>

      <form action={createSubscriptionPlanAction} className="bg-white border rounded-lg p-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name</label>
          <input name="name" required className="border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Interval</label>
          <select name="interval" className="border rounded-md px-2 py-1.5 text-sm">
            <option>MONTHLY</option><option>QUARTERLY</option><option>YEARLY</option>
          </select>
        </div>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="prorationEnabled" defaultChecked /> Proration enabled</label>
        <button className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-sm">Add Plan</button>
      </form>

      <table className="w-full text-sm bg-white border rounded-lg overflow-hidden">
        <thead><tr className="text-left text-slate-500 border-b bg-slate-50"><th className="py-2 px-3">Name</th><th>Interval</th><th>Proration</th></tr></thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="py-2 px-3">{p.name}</td><td>{p.interval}</td><td>{p.prorationEnabled ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
