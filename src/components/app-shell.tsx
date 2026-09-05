"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Settings,
  ArrowLeft,
  FileText,
  KanbanSquare,
  HeartPulse,
  Package,
  Percent,
  Warehouse,
  Repeat,
  Sparkles,
  BarChart3,
  Users,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ICONS = {
  "file-text": FileText,
  kanban: KanbanSquare,
  "heart-pulse": HeartPulse,
  package: Package,
  percent: Percent,
  warehouse: Warehouse,
  repeat: Repeat,
  sparkles: Sparkles,
  "bar-chart": BarChart3,
  "arrow-left": ArrowLeft,
  settings: Settings,
  users: Users,
  building: Building2,
} as const;

export type IconKey = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
  matchExact?: boolean;
}

export function AppShell({
  brand,
  brandHref,
  navItems,
  userName,
  userRole,
  logoutAction,
  secondaryLink,
  children,
}: {
  brand: string;
  brandHref: string;
  navItems: NavItem[];
  userName: string;
  userRole: string;
  logoutAction: () => Promise<void>;
  secondaryLink?: { href: string; label: string; icon?: IconKey };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const SecondaryIcon = ICONS[secondaryLink?.icon ?? "settings"];

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Link href={brandHref} className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              D
            </span>
            {brand}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = item.matchExact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          {secondaryLink && (
            <Link
              href={secondaryLink.href}
              className="mb-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <SecondaryIcon className="h-4 w-4" />
              {secondaryLink.label}
            </Link>
          )}
          <div className="flex items-center gap-3 rounded-md px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {userRole.replaceAll("_", " ")}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Log out"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex-1 pl-60">
        <main className="mx-auto max-w-6xl px-8 py-8">{children}</main>
      </div>
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
