"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireFeature } from "@/lib/guards";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/quotation-service";

const USER_ROLES = ["SALES_REP", "SALES_MANAGER", "FINANCE", "ADMIN"] as const;

export async function createInternalUserAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role")) as (typeof USER_ROLES)[number];

  if (!name || !email || password.length < 6 || !USER_ROLES.includes(role)) {
    return;
  }

  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role },
  });
  await logAudit("User", user.id, "USER_CREATED", admin.userId, `${name} (${role})`);
  revalidatePath("/admin/users");
}

export async function updateInternalUserAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const userId = String(formData.get("userId"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role")) as (typeof USER_ROLES)[number];
  const canViewPipeline = formData.get("canViewPipeline") === "on";
  const canViewDealHealth = formData.get("canViewDealHealth") === "on";
  const canSeeUpsellPanel = formData.get("canSeeUpsellPanel") === "on";
  const canManageProducts = formData.get("canManageProducts") === "on";
  const canManageDiscounts = formData.get("canManageDiscounts") === "on";
  const canManageWarehouses = formData.get("canManageWarehouses") === "on";
  const canManageSubscriptions = formData.get("canManageSubscriptions") === "on";
  const canManageUpsellRules = formData.get("canManageUpsellRules") === "on";
  const canManageCustomers = formData.get("canManageCustomers") === "on";
  const canViewReports = formData.get("canViewReports") === "on";

  if (!name || !email || !USER_ROLES.includes(role)) return;

  await db.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      role,
      canViewPipeline,
      canViewDealHealth,
      canSeeUpsellPanel,
      canManageProducts,
      canManageDiscounts,
      canManageWarehouses,
      canManageSubscriptions,
      canManageUpsellRules,
      canManageCustomers,
      canViewReports,
    },
  });
  await logAudit("User", userId, "USER_UPDATED", admin.userId, `${name} -> ${role}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin", "layout");
}

export async function resetInternalUserPasswordAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const userId = String(formData.get("userId"));
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 6) return;

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  await logAudit("User", userId, "PASSWORD_RESET", admin.userId);
  revalidatePath("/admin/users");
}

export async function createCustomerAction(formData: FormData) {
  const admin = await requireFeature("canManageCustomers");
  const name = String(formData.get("name") ?? "").trim();
  const portalEmail = String(formData.get("portalEmail") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const tier = String(formData.get("tier")) as "BRONZE" | "SILVER" | "GOLD";

  if (!name || !portalEmail || password.length < 6) return;

  const customer = await db.customer.create({
    data: { name, tier, portalEmail, portalPasswordHash: await hashPassword(password) },
  });
  await logAudit("Customer", customer.id, "CUSTOMER_CREATED", admin.userId, name);
  revalidatePath("/admin/customers");
}

export async function updateCustomerAction(formData: FormData) {
  const admin = await requireFeature("canManageCustomers");
  const customerId = String(formData.get("customerId"));
  const name = String(formData.get("name") ?? "").trim();
  const portalEmail = String(formData.get("portalEmail") ?? "").trim().toLowerCase();
  const tier = String(formData.get("tier")) as "BRONZE" | "SILVER" | "GOLD";

  if (!name || !portalEmail) return;

  await db.customer.update({ where: { id: customerId }, data: { name, portalEmail, tier } });
  await logAudit("Customer", customerId, "CUSTOMER_UPDATED", admin.userId, `${name} -> ${tier}`);
  revalidatePath("/admin/customers");
}

export async function resetCustomerPasswordAction(formData: FormData) {
  const admin = await requireFeature("canManageCustomers");
  const customerId = String(formData.get("customerId"));
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 6) return;

  await db.customer.update({
    where: { id: customerId },
    data: { portalPasswordHash: await hashPassword(newPassword) },
  });
  await logAudit("Customer", customerId, "PORTAL_PASSWORD_RESET", admin.userId);
  revalidatePath("/admin/customers");
}

export async function createProductAction(formData: FormData) {
  await requireFeature("canManageProducts");
  await db.product.create({
    data: {
      name: String(formData.get("name")),
      category: String(formData.get("category")),
      unitPrice: Number(formData.get("unitPrice")),
      unitCost: Number(formData.get("unitCost")),
      unit: String(formData.get("unit") || "unit"),
      taxPct: Number(formData.get("taxPct") || 0),
    },
  });
  revalidatePath("/admin/products");
}

export async function createWarehouseAction(formData: FormData) {
  await requireFeature("canManageWarehouses");
  await db.warehouse.create({
    data: {
      name: String(formData.get("name")),
      shippingCostWeight: Number(formData.get("shippingCostWeight") || 1),
    },
  });
  revalidatePath("/admin/warehouses");
}

export async function setStockAction(formData: FormData) {
  await requireFeature("canManageWarehouses");
  const warehouseId = String(formData.get("warehouseId"));
  const productId = String(formData.get("productId"));
  const qty = Number(formData.get("qty"));

  await db.stockItem.upsert({
    where: { warehouseId_productId: { warehouseId, productId } },
    update: { qty },
    create: { warehouseId, productId, qty },
  });
  revalidatePath("/admin/warehouses");
}

export async function createDiscountCeilingAction(formData: FormData) {
  await requireFeature("canManageDiscounts");
  const tier = String(formData.get("tier")) as "BRONZE" | "SILVER" | "GOLD";
  const category = String(formData.get("category"));
  const maxDiscountPct = Number(formData.get("maxDiscountPct"));

  await db.discountCeiling.upsert({
    where: { tier_category: { tier, category } },
    update: { maxDiscountPct },
    create: { tier, category, maxDiscountPct },
  });
  revalidatePath("/admin/discount-tiers");
}

export async function createApprovalRuleAction(formData: FormData) {
  await requireFeature("canManageDiscounts");
  const minScore = Number(formData.get("minScore"));
  const maxScoreRaw = formData.get("maxScore");
  await db.approvalRule.create({
    data: {
      minScore,
      maxScore: maxScoreRaw ? Number(maxScoreRaw) : null,
      requiresManager: formData.get("requiresManager") === "on",
      requiresFinance: formData.get("requiresFinance") === "on",
    },
  });
  revalidatePath("/admin/discount-tiers");
}

export async function createSubscriptionPlanAction(formData: FormData) {
  await requireFeature("canManageSubscriptions");
  await db.subscriptionPlan.create({
    data: {
      name: String(formData.get("name")),
      interval: String(formData.get("interval")) as "MONTHLY" | "QUARTERLY" | "YEARLY",
      prorationEnabled: formData.get("prorationEnabled") === "on",
    },
  });
  revalidatePath("/admin/subscription-plans");
}

export async function createUpsellRuleAction(formData: FormData) {
  await requireFeature("canManageUpsellRules");
  await db.upsellRule.create({
    data: {
      baseProductId: String(formData.get("baseProductId")),
      suggestedProductId: String(formData.get("suggestedProductId")),
      minMarginPct: Number(formData.get("minMarginPct") || 0),
      promoted: formData.get("promoted") === "on",
    },
  });
  revalidatePath("/admin/upsell-rules");
}

export async function createVolumeDiscountRuleAction(formData: FormData) {
  await requireFeature("canManageDiscounts");
  const minLineValue = Number(formData.get("minLineValue"));
  const bonusDiscountPct = Number(formData.get("bonusDiscountPct"));
  if (!Number.isFinite(minLineValue) || !Number.isFinite(bonusDiscountPct)) return;

  await db.volumeDiscountRule.create({ data: { minLineValue, bonusDiscountPct } });
  revalidatePath("/admin/discount-tiers");
  revalidatePath("/workspace/quotations", "layout");
}
