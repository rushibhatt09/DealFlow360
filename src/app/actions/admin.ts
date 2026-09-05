"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";

export async function createProductAction(formData: FormData) {
  await requireRole(["ADMIN", "SALES_MANAGER"]);
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
  await requireRole(["ADMIN", "SALES_MANAGER"]);
  await db.warehouse.create({
    data: {
      name: String(formData.get("name")),
      shippingCostWeight: Number(formData.get("shippingCostWeight") || 1),
    },
  });
  revalidatePath("/admin/warehouses");
}

export async function setStockAction(formData: FormData) {
  await requireRole(["ADMIN", "SALES_MANAGER"]);
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
  await requireRole(["ADMIN", "SALES_MANAGER"]);
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
  await requireRole(["ADMIN", "SALES_MANAGER"]);
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
  await requireRole(["ADMIN", "SALES_MANAGER"]);
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
  await requireRole(["ADMIN", "SALES_MANAGER"]);
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
