import { db } from "@/lib/db";
import { createUpsellRuleAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function UpsellRulesAdminPage() {
  const rules = await db.upsellRule.findMany({ include: { baseProduct: true, suggestedProduct: true } });
  const products = await db.product.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upsell / Cross-Sell Rule Setup"
        description="Product pairings that surface as suggestions while a rep builds a quote."
      />

      <Card>
        <CardContent className="pt-5">
          <form action={createUpsellRuleAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>When cart has</Label>
              <Select name="baseProductId" className="w-48">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Suggest</Label>
              <Select name="suggestedProductId" className="w-48">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Min margin %</Label>
              <Input name="minMarginPct" type="number" defaultValue={0} className="w-24" />
            </div>
            <label className="flex items-center gap-1.5 pb-2 text-sm text-foreground">
              <input type="checkbox" name="promoted" className="accent-primary" /> Promoted
            </label>
            <Button type="submit">Add Rule</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Base Product</TableHead>
              <TableHead>Suggested</TableHead>
              <TableHead>Min Margin</TableHead>
              <TableHead>Promoted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-foreground">{r.baseProduct.name}</TableCell>
                <TableCell>{r.suggestedProduct.name}</TableCell>
                <TableCell>{r.minMarginPct}%</TableCell>
                <TableCell>{r.promoted ? <Badge variant="warning">Promoted</Badge> : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
