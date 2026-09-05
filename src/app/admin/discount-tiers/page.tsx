import { db } from "@/lib/db";
import { requireSectionView } from "@/lib/guards";
import {
  createDiscountCeilingAction,
  createApprovalRuleAction,
  createVolumeDiscountRuleAction,
} from "@/app/actions/admin";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/utils";

export default async function DiscountTiersAdminPage() {
  const { canEdit } = await requireSectionView("discounts");
  const ceilings = await db.discountCeiling.findMany({ orderBy: [{ tier: "asc" }, { category: "asc" }] });
  const rules = await db.approvalRule.findMany({ orderBy: { minScore: "asc" } });
  const volumeRules = await db.volumeDiscountRule.findMany({ orderBy: { minLineValue: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discount Tier & Approval Chain Setup"
        description="Per-category discount ceilings and the risk-score thresholds that trigger approval."
      />

      <Card>
        <CardHeader>
          <CardTitle>Discount Ceilings (by tier &amp; category)</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit && (
            <form action={createDiscountCeilingAction} className="mb-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Tier</Label>
                <Select name="tier" className="w-32">
                  <option>BRONZE</option>
                  <option>SILVER</option>
                  <option>GOLD</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category (or ALL)</Label>
                <Input name="category" required className="w-40" />
              </div>
              <div className="space-y-1.5">
                <Label>Max %</Label>
                <Input name="maxDiscountPct" type="number" step="0.1" required className="w-24" />
              </div>
              <Button type="submit">Save Ceiling</Button>
            </form>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Max Discount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ceilings.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <StatusBadge status={c.tier} />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{c.category}</TableCell>
                  <TableCell>{c.maxDiscountPct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval Chain Rules (by blended risk score)</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit && (
            <form action={createApprovalRuleAction} className="mb-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Min score</Label>
                <Input name="minScore" type="number" step="0.1" required className="w-24" />
              </div>
              <div className="space-y-1.5">
                <Label>Max score (blank = no limit)</Label>
                <Input name="maxScore" type="number" step="0.1" className="w-28" />
              </div>
              <label className="flex items-center gap-1.5 pb-2 text-sm text-foreground">
                <input type="checkbox" name="requiresManager" defaultChecked className="accent-primary" /> Manager
              </label>
              <label className="flex items-center gap-1.5 pb-2 text-sm text-foreground">
                <input type="checkbox" name="requiresFinance" className="accent-primary" /> Finance
              </label>
              <Button type="submit">Add Rule</Button>
            </form>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score Range</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Finance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">
                    {r.minScore} – {r.maxScore ?? "∞"}
                  </TableCell>
                  <TableCell>{r.requiresManager ? "Yes" : "No"}</TableCell>
                  <TableCell>{r.requiresFinance ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Volume Discount Rules</CardTitle>
          <p className="text-sm text-muted-foreground">
            A line whose value crosses the threshold automatically earns the bonus on top of
            whatever discount the rep enters manually.
          </p>
        </CardHeader>
        <CardContent>
          {canEdit && (
            <form action={createVolumeDiscountRuleAction} className="mb-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Min line value (₹)</Label>
                <Input name="minLineValue" type="number" step="1" required className="w-32" />
              </div>
              <div className="space-y-1.5">
                <Label>Bonus discount %</Label>
                <Input name="bonusDiscountPct" type="number" step="0.1" required className="w-32" />
              </div>
              <Button type="submit">Add Volume Rule</Button>
            </form>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line value at or above</TableHead>
                <TableHead>Bonus discount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {volumeRules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{formatCurrency(r.minLineValue)}</TableCell>
                  <TableCell className="text-success">+{r.bonusDiscountPct}%</TableCell>
                </TableRow>
              ))}
              {volumeRules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                    No volume rules configured yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
