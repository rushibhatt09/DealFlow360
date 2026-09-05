import { db } from "@/lib/db";
import { createWarehouseAction, setStockAction } from "@/app/actions/admin";

export default async function WarehousesAdminPage() {
  const warehouses = await db.warehouse.findMany({ include: { stockItems: { include: { product: true } } } });
  const products = await db.product.findMany({ where: { category: "Hardware" }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Warehouses &amp; Fulfillment Setup</h1>

      <form action={createWarehouseAction} className="bg-white border rounded-lg p-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name</label>
          <input name="name" required className="border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Shipping Cost Weight</label>
          <input name="shippingCostWeight" type="number" step="0.1" defaultValue={1} className="w-28 border rounded-md px-2 py-1.5 text-sm" />
        </div>
        <button className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-sm">Add Warehouse</button>
      </form>

      {warehouses.map((w) => (
        <div key={w.id} className="bg-white border rounded-lg p-4">
          <h2 className="font-medium mb-2">{w.name} <span className="text-xs text-slate-400">(shipping weight {w.shippingCostWeight})</span></h2>
          <table className="w-full text-sm mb-3">
            <thead><tr className="text-left text-slate-500 border-b"><th className="py-1">Product</th><th>Qty on hand</th></tr></thead>
            <tbody>
              {w.stockItems.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-1">{s.product.name}</td>
                  <td>{s.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <form action={setStockAction} className="flex items-end gap-2">
            <input type="hidden" name="warehouseId" value={w.id} />
            <select name="productId" className="border rounded-md px-2 py-1 text-xs">
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input name="qty" type="number" min={0} defaultValue={0} className="w-20 border rounded-md px-2 py-1 text-xs" />
            <button className="text-xs bg-slate-900 text-white rounded px-2 py-1">Set Stock</button>
          </form>
        </div>
      ))}
    </div>
  );
}
