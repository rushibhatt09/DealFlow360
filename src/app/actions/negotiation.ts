"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePortalCustomer, requireInternalUser } from "@/lib/guards";
import {
  computeAndPersistRiskScore,
  getApprovalRequirement,
  generateFulfillmentAndBilling,
  calculateOneTimeTotal,
  logAudit,
} from "@/lib/quotation-service";

async function assertOwnedByCustomer(quotationId: string, customerId: string) {
  const quotation = await db.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  if (quotation.customerId !== customerId) throw new Error("Not authorized");
  return quotation;
}

export async function submitChangeRequestAction(formData: FormData) {
  const session = await requirePortalCustomer();
  const quotationId = String(formData.get("quotationId"));
  const message = String(formData.get("message") ?? "").trim();
  await assertOwnedByCustomer(quotationId, session.customerId);
  if (!message) return;

  await db.negotiationMessage.create({
    data: { quotationId, author: "CUSTOMER", message },
  });
  await db.quotation.update({
    where: { id: quotationId },
    data: { status: "UNDER_NEGOTIATION", lastActivityAt: new Date() },
  });
  await logAudit("Quotation", quotationId, "CUSTOMER_MESSAGE", null, message);

  revalidatePath(`/portal/quotations/${quotationId}`);
}

export async function submitCounterDiscountAction(formData: FormData) {
  const session = await requirePortalCustomer();
  const quotationId = String(formData.get("quotationId"));
  const lineId = String(formData.get("lineId"));
  const counterDiscountPct = Number(formData.get("counterDiscountPct"));
  await assertOwnedByCustomer(quotationId, session.customerId);

  await db.quotationLine.update({ where: { id: lineId }, data: { discountPct: counterDiscountPct } });
  await db.negotiationMessage.create({
    data: {
      quotationId,
      author: "CUSTOMER",
      message: `Requested ${counterDiscountPct}% discount on a line`,
      counterDiscountPct,
    },
  });
  await db.quotation.update({
    where: { id: quotationId },
    data: { status: "UNDER_NEGOTIATION", lastActivityAt: new Date() },
  });
  await logAudit("Quotation", quotationId, "COUNTER_DISCOUNT", null, `${counterDiscountPct}%`);

  revalidatePath(`/portal/quotations/${quotationId}`);
}

export async function submitRepReplyAction(formData: FormData) {
  const user = await requireInternalUser();
  const quotationId = String(formData.get("quotationId"));
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return;

  await db.negotiationMessage.create({
    data: { quotationId, author: "REP", message },
  });
  await db.quotation.update({
    where: { id: quotationId },
    data: { lastActivityAt: new Date() },
  });
  await logAudit("Quotation", quotationId, "REP_REPLY", user.userId, message);

  revalidatePath(`/workspace/quotations/${quotationId}`);
  revalidatePath(`/portal/quotations/${quotationId}`);
}

export async function confirmQuotationAction(formData: FormData) {
  const session = await requirePortalCustomer();
  const quotationId = String(formData.get("quotationId"));
  await assertOwnedByCustomer(quotationId, session.customerId);

  const result = await computeAndPersistRiskScore(quotationId);
  const requirement = await getApprovalRequirement(result.riskScore);

  if (requirement.requiresManager || requirement.requiresFinance) {
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
      "REVERTED_TO_APPROVAL",
      null,
      `Customer terms raised risk score to ${result.riskScore.toFixed(1)}`,
    );
  } else {
    const amount = await calculateOneTimeTotal(quotationId);
    const existingInvoice = await db.invoice.findFirst({ where: { quotationId } });
    if (!existingInvoice) {
      await db.invoice.create({ data: { quotationId, amount, status: "SENT" } });
    }
    await generateFulfillmentAndBilling(quotationId);
    await db.quotation.update({
      where: { id: quotationId },
      data: { status: "CONFIRMED", lastActivityAt: new Date() },
    });
    await logAudit("Quotation", quotationId, "CUSTOMER_CONFIRMED", null);
  }

  revalidatePath(`/portal/quotations/${quotationId}`);
}
