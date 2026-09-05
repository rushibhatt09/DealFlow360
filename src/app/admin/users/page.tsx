import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import {
  createInternalUserAction,
  updateInternalUserAction,
  resetInternalUserPasswordAction,
} from "@/app/actions/admin";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/utils";

const ROLES = ["SALES_REP", "SALES_MANAGER", "FINANCE", "ADMIN"] as const;

export default async function UsersAdminPage() {
  const admin = await requireRole(["ADMIN"]);
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users &amp; Permissions"
        description="Create internal accounts, change roles, and control exactly what each person can see. Admin-only — the Admin role always has full access; everyone else starts with none of the backend and is granted section by section below."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add User</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createInternalUserAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input name="name" required className="w-44" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input name="email" type="email" required className="w-52" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input name="password" type="password" required minLength={6} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select name="role" className="w-40" defaultValue="SALES_REP">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Create Account</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {users.map((u) => {
          const isSelf = u.id === admin.userId;
          return (
            <Card key={u.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {u.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {u.name} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={u.role} />
                  <span className="text-xs text-muted-foreground">Joined {formatDate(u.createdAt)}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 md:grid-cols-2">
                <form action={updateInternalUserAction} className="space-y-3">
                  <input type="hidden" name="userId" value={u.id} />
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input name="name" defaultValue={u.name} className="h-8 w-32 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input name="email" type="email" defaultValue={u.email} className="h-8 w-40 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Role</Label>
                      {isSelf ? (
                        <>
                          {/* A disabled field is excluded from form submission entirely, so the
                              real value travels via this hidden input instead -- the visible
                              select below is purely a "you can't change this" display. */}
                          <input type="hidden" name="role" value={u.role} />
                          <Select
                            defaultValue={u.role}
                            disabled
                            title="You can't change your own role"
                            className="h-8 w-36 text-xs"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r.replaceAll("_", " ")}
                              </option>
                            ))}
                          </Select>
                        </>
                      ) : (
                        <Select name="role" defaultValue={u.role} className="h-8 w-36 text-xs">
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r.replaceAll("_", " ")}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md bg-muted/50 px-3 py-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Workspace
                    </span>
                    <Switch name="canViewPipeline" defaultChecked={u.canViewPipeline} label="Pipeline" />
                    <Switch name="canViewDealHealth" defaultChecked={u.canViewDealHealth} label="Deal Health" />
                    <Switch name="canSeeUpsellPanel" defaultChecked={u.canSeeUpsellPanel} label="Upsell panel" />
                  </div>

                  {u.role === "ADMIN" ? (
                    <p className="rounded-md bg-accent-soft px-3 py-2 text-xs text-muted-foreground">
                      Admin role always has full backend access — nothing to toggle here.
                    </p>
                  ) : (
                    <div className="rounded-md bg-muted/50 px-3 py-2">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Admin backend — View shows the data, Edit allows changes
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="py-1 pr-4 font-medium">Section</th>
                              <th className="px-2 py-1 font-medium">View</th>
                              <th className="px-2 py-1 font-medium">Edit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(
                              [
                                ["Products", "canViewProducts", "canEditProducts"],
                                ["Discount & Approval", "canViewDiscounts", "canEditDiscounts"],
                                ["Warehouses", "canViewWarehouses", "canEditWarehouses"],
                                ["Subscription Plans", "canViewSubscriptions", "canEditSubscriptions"],
                                ["Upsell Rules", "canViewUpsellRules", "canEditUpsellRules"],
                                ["Customers", "canViewCustomers", "canEditCustomers"],
                              ] as const
                            ).map(([label, viewField, editField]) => (
                              <tr key={label} className="border-t border-border/60">
                                <td className="py-1.5 pr-4 text-foreground">{label}</td>
                                <td className="px-2 py-1.5">
                                  <Switch name={viewField} defaultChecked={u[viewField]} />
                                </td>
                                <td className="px-2 py-1.5">
                                  <Switch name={editField} defaultChecked={u[editField]} />
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-border/60">
                              <td className="py-1.5 pr-4 text-foreground">Reports</td>
                              <td className="px-2 py-1.5">
                                <Switch name="canViewReports" defaultChecked={u.canViewReports} />
                              </td>
                              <td className="px-2 py-1.5 text-muted-foreground">— (nothing to edit)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <Button type="submit" size="sm" variant="outline">
                    Save
                  </Button>
                </form>

                <form action={resetInternalUserPasswordAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <div className="space-y-1">
                    <Label className="text-xs">New password</Label>
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
