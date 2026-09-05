import { redirect } from "next/navigation";
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
