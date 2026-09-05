import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireSectionView } from "@/lib/guards";
import {
  createCustomerAction,
  updateCustomerAction,
  resetCustomerPasswordAction,
} from "@/app/actions/admin";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { CustomerTier, Prisma } from "@prisma/client";

const TIERS = ["BRONZE", "SILVER", "GOLD"] as const;

export default async function CustomersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string }>;
}) {
  const { canEdit } = await requireSectionView("customers");
  const { q, tier } = await searchParams;
  const where: Prisma.CustomerWhereInput = {};
  if (q) where.name = { contains: q };
  if (tier) where.tier = tier as CustomerTier;

  const customers = await db.customer.findMany({ where, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers &amp; Portal Access"
        description={`${customers.length} account${customers.length === 1 ? "" : "s"} that can sign in to the customer negotiation portal.`}
      />

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Add Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCustomerAction} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input name="name" required className="w-48" />
              </div>
              <div className="space-y-1.5">
                <Label>Portal Email</Label>
                <Input name="portalEmail" type="email" required className="w-52" />
              </div>
              <div className="space-y-1.5">
                <Label>Portal Password</Label>
                <Input name="password" type="password" required minLength={6} className="w-40" />
              </div>
              <div className="space-y-1.5">
                <Label>Tier</Label>
                <Select name="tier" className="w-32" defaultValue="BRONZE">
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit">Create Customer</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label className="text-xs">Search by company</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q ?? ""} placeholder="e.g. Patel Electronics" className="pl-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tier</Label>
            <Select name="tier" defaultValue={tier ?? ""} className="w-36">
              <option value="">All tiers</option>
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="outline">
            Apply
          </Button>
          {(q || tier) && (
            <Link href="/admin/customers" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Clear
            </Link>
          )}
        </form>
      </Card>

      <div className="space-y-3">
        {customers.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.portalEmail}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.tier} />
                <span className="text-xs text-muted-foreground">Added {formatDate(c.createdAt)}</span>
              </div>
            </div>

            {canEdit && (
              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 md:grid-cols-2">
                <form action={updateCustomerAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="customerId" value={c.id} />
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input name="name" defaultValue={c.name} className="h-8 w-32 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Portal Email</Label>
                    <Input
                      name="portalEmail"
                      type="email"
                      defaultValue={c.portalEmail}
                      className="h-8 w-40 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tier</Label>
                    <Select name="tier" defaultValue={c.tier} className="h-8 w-28 text-xs">
                      {TIERS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button type="submit" size="sm" variant="outline">
                    Save
                  </Button>
                </form>

                <form action={resetCustomerPasswordAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="customerId" value={c.id} />
                  <div className="space-y-1">
                    <Label className="text-xs">New portal password</Label>
                    <Input
                      name="newPassword"
                      type="password"
                      minLength={6}
                      placeholder="min. 6 characters"
                      className="h-8 w-44 text-xs"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="outline">
                    Reset Password
                  </Button>
                </form>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
