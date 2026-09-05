import { db } from "@/lib/db";
import { createSubscriptionPlanAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function SubscriptionPlansAdminPage() {
  const plans = await db.subscriptionPlan.findMany();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription / Recurring Plan Setup"
        description="Recurring plans that can be attached to specific products."
      />

      <Card>
        <CardContent className="pt-5">
          <form action={createSubscriptionPlanAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input name="name" required className="w-48" />
            </div>
            <div className="space-y-1.5">
              <Label>Interval</Label>
              <Select name="interval" className="w-36">
                <option>MONTHLY</option>
                <option>QUARTERLY</option>
                <option>YEARLY</option>
              </Select>
            </div>
            <label className="flex items-center gap-1.5 pb-2 text-sm text-foreground">
              <input type="checkbox" name="prorationEnabled" defaultChecked className="accent-primary" /> Proration
              enabled
            </label>
            <Button type="submit">Add Plan</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Proration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{p.interval}</Badge>
                </TableCell>
                <TableCell>{p.prorationEnabled ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
