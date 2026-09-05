import { redirect } from "next/navigation";
import { db } from "./db";
import {
  getInternalSession,
  getPortalSession,
  type InternalSessionData,
  type PortalSessionData,
} from "./session";

/**
 * The session cookie is trusted for identity but not existence -- if the
 * account behind it was deleted (or the dev database was reseeded with
 * fresh IDs), the old cookie is now pointing at nothing. Rather than let
 * every downstream query blow up with a Prisma "not found" error, catch
 * it here once and send them back to login -- the same outcome as if
 * they'd never been signed in. Note: Next.js only allows a cookie to be
 * *written* from a Server Action or Route Handler, never mid-render, so
 * this can't clear the stale cookie itself; logging in again overwrites
 * it via the login Server Action, which is allowed to write it.
 */
export async function requireInternalUser(): Promise<InternalSessionData> {
  const session = await getInternalSession();
  if (!session.userId) redirect("/login");

  const exists = await db.user.findUnique({ where: { id: session.userId }, select: { id: true } });
  if (!exists) redirect("/login");

  return session as InternalSessionData;
}

const FEATURE_SELECT = {
  canViewPipeline: true,
  canViewDealHealth: true,
  canSeeUpsellPanel: true,
  canViewProducts: true,
  canEditProducts: true,
  canViewDiscounts: true,
  canEditDiscounts: true,
  canViewWarehouses: true,
  canEditWarehouses: true,
  canViewSubscriptions: true,
  canEditSubscriptions: true,
  canViewUpsellRules: true,
  canEditUpsellRules: true,
  canViewCustomers: true,
  canEditCustomers: true,
  canViewReports: true,
  canApproveManagerStep: true,
  canApproveFinanceStep: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_SELECT;

/**
 * Feature toggles live on the User row, not the session cookie, so a
 * change an Admin makes takes effect on the user's very next request --
 * not just their next login. ADMIN bypasses every flag: it's the one
 * role that's always fully trusted, on purpose.
 */
export async function requireFeature(
  feature: FeatureFlag,
  fallback = "/workspace/quotations",
): Promise<InternalSessionData> {
  const user = await requireInternalUser();
  if (user.role === "ADMIN") return user;

  const record = await db.user.findUniqueOrThrow({
    where: { id: user.userId },
    select: FEATURE_SELECT,
  });
  if (!record[feature]) redirect(fallback);
  return user;
}

export async function getFeatureFlags(userId: string) {
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: FEATURE_SELECT,
  });
}

/** Admin backend sections that distinguish View (read-only) from Edit. */
export const ADMIN_SECTIONS = {
  products: { view: "canViewProducts", edit: "canEditProducts" },
  discounts: { view: "canViewDiscounts", edit: "canEditDiscounts" },
  warehouses: { view: "canViewWarehouses", edit: "canEditWarehouses" },
  subscriptions: { view: "canViewSubscriptions", edit: "canEditSubscriptions" },
  upsellRules: { view: "canViewUpsellRules", edit: "canEditUpsellRules" },
  customers: { view: "canViewCustomers", edit: "canEditCustomers" },
} as const satisfies Record<string, { view: FeatureFlag; edit: FeatureFlag }>;

export type AdminSection = keyof typeof ADMIN_SECTIONS;

/**
 * Gates entry to an admin section page. Grants entry on View OR Edit,
 * and hands back whether this visit is edit-capable so the page can
 * decide whether to render its create/change forms at all -- a
 * view-only user should see the data, never the controls to change it.
 */
export async function requireSectionView(
  section: AdminSection,
): Promise<InternalSessionData & { canEdit: boolean }> {
  const user = await requireInternalUser();
  const { view, edit } = ADMIN_SECTIONS[section];

  if (user.role === "ADMIN") return { ...user, canEdit: true };

  const flags = await db.user.findUniqueOrThrow({
    where: { id: user.userId },
    select: FEATURE_SELECT,
  });
  if (!flags[view] && !flags[edit]) redirect("/workspace/quotations");
  return { ...user, canEdit: Boolean(flags[edit]) };
}

/**
 * Gates the actual mutation -- used inside Server Actions as
 * defense-in-depth, so a view-only user can't hit create/update
 * endpoints directly even if they never see the button for it.
 */
export async function requireSectionEdit(section: AdminSection): Promise<InternalSessionData> {
  const user = await requireInternalUser();
  if (user.role === "ADMIN") return user;

  const { edit } = ADMIN_SECTIONS[section];
  const flags = await db.user.findUniqueOrThrow({
    where: { id: user.userId },
    select: FEATURE_SELECT,
  });
  if (!flags[edit]) redirect("/workspace/quotations");
  return user;
}

/**
 * Gates acting on an approval step. SALES_MANAGER/FINANCE always keep
 * authority over their own level, and ADMIN bypasses everything -- but
 * beyond that, authority is a per-user grant (canApproveManagerStep /
 * canApproveFinanceStep) an Admin can hand to any profile, so approval
 * rights aren't locked to those three roles.
 */
export async function requireApprovalAuthority(
  level: "MANAGER" | "FINANCE",
): Promise<InternalSessionData> {
  const user = await requireInternalUser();
  if (user.role === "ADMIN") return user;
  if (level === "MANAGER" && user.role === "SALES_MANAGER") return user;
  if (level === "FINANCE" && user.role === "FINANCE") return user;

  const flags = await db.user.findUniqueOrThrow({
    where: { id: user.userId },
    select: { canApproveManagerStep: true, canApproveFinanceStep: true },
  });
  const authorized = level === "MANAGER" ? flags.canApproveManagerStep : flags.canApproveFinanceStep;
  if (!authorized) redirect("/workspace/quotations");
  return user;
}

export async function requireRole(
  roles: InternalSessionData["role"][],
): Promise<InternalSessionData> {
  const user = await requireInternalUser();
  if (!roles.includes(user.role)) redirect("/workspace");
  return user;
}

export async function requirePortalCustomer(): Promise<PortalSessionData> {
  const session = await getPortalSession();
  if (!session.customerId) redirect("/portal/login");

  const exists = await db.customer.findUnique({ where: { id: session.customerId }, select: { id: true } });
  if (!exists) redirect("/portal/login");

  return session as PortalSessionData;
}
