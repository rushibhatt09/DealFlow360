import { requireRole } from "@/lib/guards";
import { logoutAction } from "@/app/actions/auth";
import { AppShell, type NavItem } from "@/components/app-shell";

const navItems: NavItem[] = [
  { href: "/admin/products", label: "Products", icon: "package" },
  { href: "/admin/discount-tiers", label: "Discount & Approval", icon: "percent" },
  { href: "/admin/warehouses", label: "Warehouses & Stock", icon: "warehouse" },
  { href: "/admin/subscription-plans", label: "Subscription Plans", icon: "repeat" },
  { href: "/admin/upsell-rules", label: "Upsell Rules", icon: "sparkles" },
  { href: "/admin/reports", label: "Reports", icon: "bar-chart" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["ADMIN", "SALES_MANAGER"]);

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
