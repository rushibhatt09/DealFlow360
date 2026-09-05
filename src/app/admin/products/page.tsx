import { db } from "@/lib/db";
import { createProductAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default async function ProductsAdminPage() {
  const products = await db.product.findMany({ orderBy: { category: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Products & Price List" description="General product catalog used across quotations." />

      <Card>
        <CardContent className="pt-5">
          <form action={createProductAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input name="name" required className="w-44" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select name="category" className="w-36">
                <option>Hardware</option>
                <option>Services</option>
                <option>Subscriptions</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Price</Label>
              <Input name="unitPrice" type="number" step="0.01" required className="w-24" />
            </div>
            <div className="space-y-1.5">
              <Label>Cost</Label>
              <Input name="unitCost" type="number" step="0.01" required className="w-24" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input name="unit" defaultValue="unit" className="w-20" />
            </div>
            <div className="space-y-1.5">
              <Label>Tax %</Label>
              <Input name="taxPct" type="number" step="0.01" defaultValue={0} className="w-20" />
            </div>
            <Button type="submit">Add Product</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Tax</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{p.category}</Badge>
                </TableCell>
                <TableCell>{formatCurrency(p.unitPrice)}</TableCell>
                <TableCell>{formatCurrency(p.unitCost)}</TableCell>
                <TableCell className="text-success">
                  {(((p.unitPrice - p.unitCost) / p.unitPrice) * 100).toFixed(0)}%
                </TableCell>
                <TableCell>{p.taxPct}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
