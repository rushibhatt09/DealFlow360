"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getInternalSession, getPortalSession } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/login?error=invalid");
  }

  const session = await getInternalSession();
  session.userId = user.id;
  session.role = user.role;
  session.name = user.name;
  await session.save();

  redirect("/workspace");
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 6) {
    redirect("/signup?error=invalid");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) redirect("/signup?error=exists");

  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role: "SALES_REP" },
  });

  const session = await getInternalSession();
  session.userId = user.id;
  session.role = user.role;
  session.name = user.name;
  await session.save();

  redirect("/workspace");
}

export async function logoutAction() {
  const session = await getInternalSession();
  session.destroy();
  redirect("/login");
}

export async function portalLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const customer = await db.customer.findUnique({ where: { portalEmail: email } });
  if (!customer || !(await verifyPassword(password, customer.portalPasswordHash))) {
    redirect("/portal/login?error=invalid");
  }

  const session = await getPortalSession();
  session.customerId = customer.id;
  session.name = customer.name;
  await session.save();

  redirect("/portal");
}

export async function portalLogoutAction() {
  const session = await getPortalSession();
  session.destroy();
  redirect("/portal/login");
}
