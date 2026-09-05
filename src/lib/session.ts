import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";

export interface InternalSessionData {
  userId: string;
  role: "SALES_REP" | "SALES_MANAGER" | "FINANCE" | "ADMIN";
  name: string;
}

export interface PortalSessionData {
  customerId: string;
  name: string;
}

const password = process.env.SESSION_SECRET!;

export async function getInternalSession(): Promise<
  IronSession<InternalSessionData>
> {
  return getIronSession<InternalSessionData>(await cookies(), {
    password,
    cookieName: "dealflow_internal",
  });
}

export async function getPortalSession(): Promise<
  IronSession<PortalSessionData>
> {
  return getIronSession<PortalSessionData>(await cookies(), {
    password,
    cookieName: "dealflow_portal",
  });
}
