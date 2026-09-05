import { redirect } from "next/navigation";
import { requireInternalUser, getFeatureFlags, ADMIN_SECTIONS } from "@/lib/guards";

const ROUTES: Record<keyof typeof ADMIN_SECTIONS, string> = {
  products: "/admin/products",
  discounts: "/admin/discount-tiers",
  warehouses: "/admin/warehouses",
  subscriptions: "/admin/subscription-plans",
  upsellRules: "/admin/upsell-rules",
  customers: "/admin/customers",
};

export default async function AdminHome() {
  const user = await requireInternalUser();
  if (user.role === "ADMIN") redirect("/admin/products");

  const flags = await getFeatureFlags(user.userId);
  for (const section of Object.keys(ADMIN_SECTIONS) as (keyof typeof ADMIN_SECTIONS)[]) {
    const { view, edit } = ADMIN_SECTIONS[section];
    if (flags[view] || flags[edit]) redirect(ROUTES[section]);
  }
  if (flags.canViewReports) redirect("/admin/reports");
  redirect("/workspace/quotations");
}
