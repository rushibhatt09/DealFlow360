import { redirect } from "next/navigation";
import { requireInternalUser, getFeatureFlags } from "@/lib/guards";
import { logoutAction } from "@/app/actions/auth";
import { AppShell, type NavItem } from "@/components/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireInternalUser();
  const isAdmin = user.role === "ADMIN";
  const flags = await getFeatureFlags(user.userId);

  const sections: (NavItem & { allowed: boolean })[] = [
    { href: "/admin/products", label: "Products", icon: "package", allowed: isAdmin || flags.canManageProducts },
    {
      href: "/admin/discount-tiers",
      label: "Discount & Approval",
      icon: "percent",
      allowed: isAdmin || flags.canManageDiscounts,
    },
    {
      href: "/admin/warehouses",
      label: "Warehouses & Stock",
      icon: "warehouse",
      allowed: isAdmin || flags.canManageWarehouses,
    },
    {
      href: "/admin/subscription-plans",
      label: "Subscription Plans",
      icon: "repeat",
      allowed: isAdmin || flags.canManageSubscriptions,
    },
    {
      href: "/admin/upsell-rules",
      label: "Upsell Rules",
      icon: "sparkles",
      allowed: isAdmin || flags.canManageUpsellRules,
    },
    {
      href: "/admin/customers",
      label: "Customers",
      icon: "building",
      allowed: isAdmin || flags.canManageCustomers,
    },
    { href: "/admin/reports", label: "Reports", icon: "bar-chart", allowed: isAdmin || flags.canViewReports },
  ];

  if (!isAdmin && !sections.some((s) => s.allowed)) {
    redirect("/workspace/quotations");
  }

  const navItems: NavItem[] = [
    ...sections
      .filter((s) => s.allowed)
      .map((s): NavItem => ({ href: s.href, label: s.label, icon: s.icon, matchExact: s.matchExact })),
    ...(isAdmin ? [{ href: "/admin/users", label: "Users & Permissions", icon: "users" } as NavItem] : []),
  ];

  return (
    <AppShell
      brand="DealFlow360 · Admin"
      brandHref="/admin"
      navItems={navItems}
      userName={user.name}
      userRole={user.role}
      logoutAction={logoutAction}
      secondaryLink={{ href: "/workspace", label: "Back to Workspace", icon: "arrow-left" }}
    >
      {children}
    </AppShell>
  );
}
