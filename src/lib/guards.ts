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
  canManageProducts: true,
  canManageDiscounts: true,
  canManageWarehouses: true,
  canManageSubscriptions: true,
  canManageUpsellRules: true,
  canManageCustomers: true,
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
