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

export type FeatureFlag = "canViewPipeline" | "canViewDealHealth" | "canSeeUpsellPanel";

/**
 * Feature toggles live on the User row, not the session cookie, so a
 * change an Admin makes takes effect on the user's very next request --
 * not just their next login.
 */
export async function requireFeature(feature: FeatureFlag): Promise<InternalSessionData> {
  const user = await requireInternalUser();
  const record = await db.user.findUniqueOrThrow({
    where: { id: user.userId },
    select: { canViewPipeline: true, canViewDealHealth: true, canSeeUpsellPanel: true },
  });
  if (!record[feature]) redirect("/workspace/quotations");
  return user;
}

export async function getFeatureFlags(userId: string) {
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { canViewPipeline: true, canViewDealHealth: true, canSeeUpsellPanel: true },
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
