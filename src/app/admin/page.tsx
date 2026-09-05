import { redirect } from "next/navigation";
import { requireInternalUser, getFeatureFlags } from "@/lib/guards";

export default async function AdminHome() {
  const user = await requireInternalUser();
  if (user.role === "ADMIN") redirect("/admin/products");

  const flags = await getFeatureFlags(user.userId);
  if (flags.canManageProducts) redirect("/admin/products");
  if (flags.canManageDiscounts) redirect("/admin/discount-tiers");
  if (flags.canManageWarehouses) redirect("/admin/warehouses");
  if (flags.canManageSubscriptions) redirect("/admin/subscription-plans");
  if (flags.canManageUpsellRules) redirect("/admin/upsell-rules");
  if (flags.canManageCustomers) redirect("/admin/customers");
  if (flags.canViewReports) redirect("/admin/reports");
  redirect("/workspace/quotations");
}
