import { db } from "@/lib/db";
import { requireFeature } from "@/lib/guards";
import { createWarehouseAction, setStockAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default async function WarehousesAdminPage() {
  await requireFeature("canManageWarehouses");
  const warehouses = await db.warehouse.findMany({ include: { stockItems: { include: { product: true } } } });
  const products = await db.product.findMany({ where: { category: "Hardware" }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses & Fulfillment Setup"
        description="Stock levels and shipping-cost weighting used by the auto-split logic."
      />

      <Card>
        <CardContent className="pt-5">
          <form action={createWarehouseAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input name="name" required className="w-48" />
            </div>
            <div className="space-y-1.5">
              <Label>Shipping Cost Weight</Label>
              <Input name="shippingCostWeight" type="number" step="0.1" defaultValue={1} className="w-28" />
            </div>
            <Button type="submit">Add Warehouse</Button>
          </form>
        </CardContent>
      </Card>

      {warehouses.map((w) => (
        <Card key={w.id}>
          <CardHeader>
            <CardTitle>
              {w.name}{" "}
              <span className="font-normal text-muted-foreground">(shipping weight {w.shippingCostWeight})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="mb-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty on hand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {w.stockItems.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-foreground">{s.product.name}</TableCell>
                    <TableCell>{s.qty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <form action={setStockAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="warehouseId" value={w.id} />
              <Select name="productId" className="w-48">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Input name="qty" type="number" min={0} defaultValue={0} className="w-24" />
              <Button type="submit" size="sm" variant="outline">
                Set Stock
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
