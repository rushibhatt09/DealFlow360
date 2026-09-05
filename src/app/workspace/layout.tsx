import { requireInternalUser, getFeatureFlags } from "@/lib/guards";
import { logoutAction } from "@/app/actions/auth";
import { AppShell, type NavItem } from "@/components/app-shell";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireInternalUser();
  const flags = await getFeatureFlags(user.userId);
  const canSeeAdmin = user.role === "ADMIN" || user.role === "SALES_MANAGER";

  const navItems: NavItem[] = [
    { href: "/workspace/quotations", label: "Quotations", icon: "file-text", matchExact: true },
    ...(flags.canViewPipeline
      ? [{ href: "/workspace/pipeline", label: "Pipeline", icon: "kanban", matchExact: true } as NavItem]
      : []),
    ...(flags.canViewDealHealth
      ? [{ href: "/workspace/dashboard", label: "Deal Health", icon: "heart-pulse" } as NavItem]
      : []),
  ];

  return (
    <AppShell
      brand="DealFlow360"
      brandHref="/workspace"
      navItems={navItems}
      userName={user.name}
      userRole={user.role}
      logoutAction={logoutAction}
      secondaryLink={canSeeAdmin ? { href: "/admin", label: "Go to Back-end", icon: "settings" } : undefined}
    >
      {children}
    </AppShell>
  );
}
