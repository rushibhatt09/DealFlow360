import { redirect } from "next/navigation";
import { db } from "./db";
import {
  getInternalSession,
  getPortalSession,
  type InternalSessionData,
  type PortalSessionData,
} from "./session";

export async function requireInternalUser(): Promise<InternalSessionData> {
  const session = await getInternalSession();
  if (!session.userId) redirect("/login");
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
  return session as PortalSessionData;
}
