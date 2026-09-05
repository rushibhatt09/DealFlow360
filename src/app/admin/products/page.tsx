import { db } from "@/lib/db";
import { createProductAction } from "@/app/actions/admin";

export default async function ProductsAdminPage() {
  const products = await db.product.findMany({ orderBy: { category: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Products &amp; Price List</h1>

      <form action={createProductAction} className="bg-white border rounded-lg p-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name</label>
          <input name="name" required className="border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Category</label>
          <select name="category" className="border rounded-md px-2 py-1.5 text-sm">
            <option>Hardware</option>
            <option>Services</option>
            <option>Subscriptions</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Price</label>
          <input name="unitPrice" type="number" step="0.01" required className="w-24 border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Cost</label>
          <input name="unitCost" type="number" step="0.01" required className="w-24 border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Unit</label>
          <input name="unit" defaultValue="unit" className="w-20 border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tax %</label>
          <input name="taxPct" type="number" step="0.01" defaultValue={0} className="w-20 border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <button className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-sm">Add Product</button>
      </form>

      <table className="w-full text-sm bg-white border rounded-lg overflow-hidden">
        <thead>
          <tr className="text-left text-slate-500 border-b bg-slate-50">
            <th className="py-2 px-3">Name</th><th>Category</th><th>Price</th><th>Cost</th><th>Margin</th><th>Tax</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="py-2 px-3">{p.name}</td>
              <td>{p.category}</td>
              <td>${p.unitPrice.toFixed(2)}</td>
              <td>${p.unitCost.toFixed(2)}</td>
              <td>{(((p.unitPrice - p.unitCost) / p.unitPrice) * 100).toFixed(0)}%</td>
              <td>{p.taxPct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
