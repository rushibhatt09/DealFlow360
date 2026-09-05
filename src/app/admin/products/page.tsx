import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireSectionView } from "@/lib/guards";
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
import type { Prisma } from "@prisma/client";

const CATEGORIES = ["Hardware", "Services", "Subscriptions"] as const;

export default async function ProductsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { canEdit } = await requireSectionView("products");
  const { q, category } = await searchParams;
  const where: Prisma.ProductWhereInput = {};
  if (q) where.name = { contains: q };
  if (category) where.category = category;

  const products = await db.product.findMany({ where, orderBy: [{ category: "asc" }, { name: "asc" }] });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Price List"
        description={`${products.length} product${products.length === 1 ? "" : "s"} in the catalog.`}
      />

      {canEdit && (
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
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
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
      )}

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label className="text-xs">Search by name</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q ?? ""} placeholder="e.g. Laptop" className="pl-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select name="category" defaultValue={category ?? ""} className="w-40">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="outline">
            Apply
          </Button>
          {(q || category) && (
            <Link href="/admin/products" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Clear
            </Link>
          )}
        </form>
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
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  No products match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
