"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInternalUser, requireRole } from "@/lib/guards";
import {
  computeAndPersistRiskScore,
  getApprovalRequirement,
  generateFulfillmentAndBilling,
  consolidateBackorder,
  calculateOneTimeTotal,
  logAudit,
} from "@/lib/quotation-service";
import { rankUpsellSuggestions, type UpsellRuleInput } from "@/lib/upsell-engine";
import { prorateQuantityChange } from "@/lib/billing-engine";

export async function createQuotationAction(formData: FormData) {
  const user = await requireInternalUser();
  const customerId = String(formData.get("customerId"));

  const quotation = await db.quotation.create({
    data: { customerId, repId: user.userId, status: "DRAFT" },
  });
  await logAudit("Quotation", quotation.id, "CREATED", user.userId);

  redirect(`/workspace/quotations/${quotation.id}`);
}

export async function addLineAction(formData: FormData) {
  const user = await requireInternalUser();
  const quotationId = String(formData.get("quotationId"));
  const productId = String(formData.get("productId"));
  const qty = Number(formData.get("qty") ?? 1);
  const discountPct = Number(formData.get("discountPct") ?? 0);
  const lineType = String(formData.get("lineType") ?? "ONE_TIME") as
    | "ONE_TIME"
    | "SUBSCRIPTION";
  const subscriptionPlanId = formData.get("subscriptionPlanId")
    ? String(formData.get("subscriptionPlanId"))
    : null;

  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });

  await db.quotationLine.create({
    data: {
      quotationId,
      productId,
      qty,
      unitPrice: product.unitPrice,
      discountPct,
      lineType,
      subscriptionPlanId,
    },
  });
  await db.quotation.update({
    where: { id: quotationId },
    data: { lastActivityAt: new Date() },
  });
  await computeAndPersistRiskScore(quotationId);
  await logAudit("Quotation", quotationId, "LINE_ADDED", user.userId, product.name);

  revalidatePath(`/workspace/quotations/${quotationId}`);
}

export async function addUpsellLineAction(formData: FormData) {
  const user = await requireInternalUser();
  const quotationId = String(formData.get("quotationId"));
  const productId = String(formData.get("productId"));

  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });

  await db.quotationLine.create({
    data: {
      quotationId,
      productId,
      qty: 1,
      unitPrice: product.unitPrice,
      discountPct: 0,
      lineType: "ONE_TIME",
      addedViaUpsell: true,
    },
  });
  await db.quotation.update({
    where: { id: quotationId },
    data: { lastActivityAt: new Date() },
  });
  await computeAndPersistRiskScore(quotationId);
  await logAudit("Quotation", quotationId, "UPSELL_ADDED", user.userId, product.name);

  revalidatePath(`/workspace/quotations/${quotationId}`);
}

export async function removeLineAction(formData: FormData) {
  const user = await requireInternalUser();
  const lineId = String(formData.get("lineId"));
  const quotationId = String(formData.get("quotationId"));

  await db.quotationLine.delete({ where: { id: lineId } });
  await computeAndPersistRiskScore(quotationId);
  await logAudit("Quotation", quotationId, "LINE_REMOVED", user.userId);

  revalidatePath(`/workspace/quotations/${quotationId}`);
}

export async function submitForApprovalAction(formData: FormData) {
  const user = await requireInternalUser();
  const quotationId = String(formData.get("quotationId"));

  const result = await computeAndPersistRiskScore(quotationId);
  const requirement = await getApprovalRequirement(result.riskScore);

  if (!requirement.requiresManager && !requirement.requiresFinance) {
    await db.quotation.update({
      where: { id: quotationId },
      data: { status: "APPROVED", lastActivityAt: new Date() },
    });
    await generateFulfillmentAndBilling(quotationId);
    await logAudit("Quotation", quotationId, "AUTO_APPROVED", user.userId, "No discount overage");
  } else {
    await db.approvalStep.deleteMany({ where: { quotationId } });
    let sequence = 1;
    if (requirement.requiresManager) {
      await db.approvalStep.create({
        data: { quotationId, level: "MANAGER", sequence: sequence++, status: "PENDING" },
      });
    }
    if (requirement.requiresFinance) {
      await db.approvalStep.create({
        data: { quotationId, level: "FINANCE", sequence: sequence++, status: "PENDING" },
      });
    }
    await db.quotation.update({
      where: { id: quotationId },
      data: { status: "PENDING_APPROVAL", lastActivityAt: new Date() },
    });
    await logAudit(
      "Quotation",
      quotationId,
      "SUBMITTED_FOR_APPROVAL",
      user.userId,
      `Risk score ${result.riskScore.toFixed(1)}`,
    );
  }

  revalidatePath(`/workspace/quotations/${quotationId}`);
}

export async function decideApprovalAction(formData: FormData) {
  const user = await requireRole(["SALES_MANAGER", "FINANCE", "ADMIN"]);
  const stepId = String(formData.get("stepId"));
  const quotationId = String(formData.get("quotationId"));
  const decision = String(formData.get("decision")) as
    | "APPROVED"
    | "REJECTED"
    | "RETURNED";
  const reason = String(formData.get("reason") ?? "");

  await db.approvalStep.update({
    where: { id: stepId },
    data: { status: decision, reviewerId: user.userId, reason, decidedAt: new Date() },
  });
  await logAudit(
    "Quotation",
    quotationId,
    `APPROVAL_${decision}`,
    user.userId,
    reason || undefined,
  );

  if (decision === "REJECTED") {
    await db.quotation.update({
      where: { id: quotationId },
      data: { status: "REJECTED", lastActivityAt: new Date() },
    });
  } else if (decision === "RETURNED") {
    await db.quotation.update({
      where: { id: quotationId },
      data: { status: "DRAFT", lastActivityAt: new Date() },
    });
    await db.approvalStep.deleteMany({ where: { quotationId } });
  } else {
    const remaining = await db.approvalStep.count({
      where: { quotationId, status: "PENDING" },
    });
    if (remaining === 0) {
      await db.quotation.update({
        where: { id: quotationId },
        data: { status: "APPROVED", lastActivityAt: new Date() },
      });
      await generateFulfillmentAndBilling(quotationId);
    }
  }

  revalidatePath(`/workspace/quotations/${quotationId}`);
}

export async function nudgeQuotationAction(formData: FormData) {
  const user = await requireRole(["SALES_MANAGER", "ADMIN"]);
  const quotationId = String(formData.get("quotationId"));

  await logAudit(
    "Quotation",
    quotationId,
    "NUDGE_SENT",
    user.userId,
    "Manager nudge: this deal needs attention",
  );

  revalidatePath("/workspace/dashboard");
  revalidatePath(`/workspace/quotations/${quotationId}`);
}

export async function getUpsellSuggestionsForQuotation(quotationId: string) {
  const lines = await db.quotationLine.findMany({
    where: { quotationId },
    include: { product: true },
  });
  const productIds = lines.map((l) => l.productId);
  const inCart = new Set(productIds);

  const rules = await db.upsellRule.findMany({
    where: { baseProductId: { in: productIds } },
    include: { suggestedProduct: true },
  });

  const rulesByBase = new Map<string, UpsellRuleInput[]>();
  for (const rule of rules) {
    const list = rulesByBase.get(rule.baseProductId) ?? [];
    list.push({
      suggestedProductId: rule.suggestedProductId,
      suggestedProductName: rule.suggestedProduct.name,
      suggestedUnitPrice: rule.suggestedProduct.unitPrice,
      suggestedUnitCost: rule.suggestedProduct.unitCost,
      minMarginPct: rule.minMarginPct,
      promoted: rule.promoted,
    });
    rulesByBase.set(rule.baseProductId, list);
  }

  return rankUpsellSuggestions(productIds, rulesByBase, inCart);
}

export async function overrideFulfillmentAction(formData: FormData) {
  const user = await requireInternalUser();
  const splitId = String(formData.get("splitId"));
  const quotationId = String(formData.get("quotationId"));
  const newQty = Number(formData.get("qty"));

  await db.fulfillmentSplit.update({ where: { id: splitId }, data: { qty: newQty } });
  await logAudit("Quotation", quotationId, "MANUAL_OVERRIDE", user.userId, `qty=${newQty}`);

  revalidatePath(`/workspace/quotations/${quotationId}`);
}

export async function consolidateBackorderAction(formData: FormData) {
  const user = await requireInternalUser();
  const splitId = String(formData.get("splitId"));
  const quotationId = String(formData.get("quotationId"));

  const result = await consolidateBackorder(quotationId, splitId);
  await logAudit(
    "Quotation",
    quotationId,
    "BACKORDER_CONSOLIDATED",
    user.userId,
    `resolved ${result.resolvedQty}, still backordered ${result.stillBackordered}`,
  );

  revalidatePath(`/workspace/quotations/${quotationId}`);
}

export async function changeSubscriptionQtyAction(formData: FormData) {
  const user = await requireInternalUser();
  const lineId = String(formData.get("lineId"));
  const quotationId = String(formData.get("quotationId"));
  const newQty = Number(formData.get("qty"));

  const line = await db.quotationLine.findUniqueOrThrow({ where: { id: lineId } });
  const nextEntry = await db.billingScheduleEntry.findFirst({
    where: { quotationLineId: lineId, status: "UPCOMING" },
    orderBy: { periodStart: "asc" },
  });

  if (nextEntry) {
    const proration = prorateQuantityChange({
      periodStart: nextEntry.periodStart,
      periodEnd: nextEntry.periodEnd,
      changeDate: new Date(),
      oldQty: line.qty,
      newQty,
      unitPrice: line.unitPrice * (1 - line.discountPct / 100),
    });

    await db.billingScheduleEntry.create({
      data: {
        quotationId,
        quotationLineId: lineId,
        periodStart: new Date(),
        periodEnd: nextEntry.periodEnd,
        amount: proration.netAmount,
        status: proration.netAmount < 0 ? "CREDITED" : "UPCOMING",
      },
    });
  }

  await db.quotationLine.update({ where: { id: lineId }, data: { qty: newQty } });
  await logAudit(
    "Quotation",
    quotationId,
    "SUBSCRIPTION_QTY_CHANGED",
    user.userId,
    `qty -> ${newQty}`,
  );

  revalidatePath(`/workspace/quotations/${quotationId}`);
}

export async function cancelSubscriptionAction(formData: FormData) {
  const user = await requireInternalUser();
  const lineId = String(formData.get("lineId"));
  const quotationId = String(formData.get("quotationId"));

  const line = await db.quotationLine.findUniqueOrThrow({ where: { id: lineId } });
  const nextEntry = await db.billingScheduleEntry.findFirst({
    where: { quotationLineId: lineId, status: "UPCOMING" },
    orderBy: { periodStart: "asc" },
  });

  let creditAmount = 0;
  if (nextEntry) {
    const proration = prorateQuantityChange({
      periodStart: nextEntry.periodStart,
      periodEnd: nextEntry.periodEnd,
      changeDate: new Date(),
      oldQty: line.qty,
      newQty: 0,
      unitPrice: line.unitPrice * (1 - line.discountPct / 100),
    });
    creditAmount = -proration.netAmount;

    if (creditAmount > 0) {
      await db.billingScheduleEntry.create({
        data: {
          quotationId,
          quotationLineId: lineId,
          periodStart: new Date(),
          periodEnd: nextEntry.periodEnd,
          amount: -creditAmount,
          status: "CREDITED",
        },
      });
    }
  }

  await db.billingScheduleEntry.deleteMany({
    where: { quotationLineId: lineId, status: "UPCOMING" },
  });

  await logAudit(
    "Quotation",
    quotationId,
    "SUBSCRIPTION_CANCELLED",
    user.userId,
    creditAmount > 0 ? `credit note ${creditAmount.toFixed(2)}` : "no credit due",
  );

  revalidatePath(`/workspace/quotations/${quotationId}`);
}

export async function confirmOrderAction(formData: FormData) {
  const user = await requireInternalUser();
  const quotationId = String(formData.get("quotationId"));

  const amount = await calculateOneTimeTotal(quotationId);
  const existingInvoice = await db.invoice.findFirst({ where: { quotationId } });
  if (!existingInvoice) {
    await db.invoice.create({ data: { quotationId, amount, status: "SENT" } });
  }

  await db.quotation.update({
    where: { id: quotationId },
    data: { status: "CONFIRMED", lastActivityAt: new Date() },
  });
  await logAudit("Quotation", quotationId, "CONFIRMED", user.userId);

  revalidatePath(`/workspace/quotations/${quotationId}`);
}

export async function recordPaymentAction(formData: FormData) {
  const user = await requireInternalUser();
  const quotationId = String(formData.get("quotationId"));
  const method = String(formData.get("method") ?? "Bank");

  const invoice = await db.invoice.findFirstOrThrow({ where: { quotationId } });
  await db.payment.create({ data: { invoiceId: invoice.id, amount: invoice.amount, method } });
  await db.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } });
  await db.quotation.update({
    where: { id: quotationId },
    data: { status: "FULFILLED", lastActivityAt: new Date() },
  });
  await logAudit("Quotation", quotationId, "PAID", user.userId, method);

  revalidatePath(`/workspace/quotations/${quotationId}`);
}
