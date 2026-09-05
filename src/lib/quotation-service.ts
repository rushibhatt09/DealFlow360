import { db } from "@/lib/db";
import {
  calculateBlendedRiskScore,
  resolveApprovalRequirement,
} from "@/lib/discount-engine";
import { splitWarehouseFulfillment } from "@/lib/warehouse-engine";
import { generateUpcomingBillingEntries } from "@/lib/billing-engine";

export async function computeAndPersistRiskScore(quotationId: string) {
  const quotation = await db.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { lines: { include: { product: true } }, customer: true },
  });

  const lineInputs = quotation.lines.map((l) => ({
    category: l.product.category,
    discountPct: l.discountPct,
    lineTotal: l.qty * l.unitPrice,
  }));

  const ceilings = await db.discountCeiling.findMany({
    where: { tier: quotation.customer.tier },
  });
  const getCeiling = (tier: string, category: string) =>
    ceilings.find((c) => c.category === category)?.maxDiscountPct;

  const result = calculateBlendedRiskScore(
    lineInputs,
    quotation.customer.tier,
    getCeiling,
  );

  await db.quotation.update({
    where: { id: quotationId },
    data: { riskScore: result.riskScore },
  });

  return result;
}

export async function getApprovalRequirement(riskScore: number) {
  const rules = await db.approvalRule.findMany();
  return resolveApprovalRequirement(
    riskScore,
    rules.map((r) => ({
      minScore: r.minScore,
      maxScore: r.maxScore,
      requiresManager: r.requiresManager,
      requiresFinance: r.requiresFinance,
    })),
  );
}

const HARDWARE_CATEGORY = "Hardware";

export async function generateFulfillmentAndBilling(quotationId: string) {
  const quotation = await db.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { lines: { include: { product: true, subscriptionPlan: true } } },
  });

  const previousSplits = await db.fulfillmentSplit.findMany({
    where: { quotationId, status: { not: "BACKORDER" } },
    include: { quotationLine: true },
  });
  for (const prev of previousSplits) {
    await db.stockItem.updateMany({
      where: { warehouseId: prev.warehouseId, productId: prev.quotationLine.productId },
      data: { qty: { increment: prev.qty } },
    });
  }

  await db.fulfillmentSplit.deleteMany({ where: { quotationId } });
  await db.billingScheduleEntry.deleteMany({ where: { quotationId } });

  const warehouses = await db.warehouse.findMany({ include: { stockItems: true } });

  for (const line of quotation.lines) {
    if (line.lineType === "ONE_TIME" && line.product.category === HARDWARE_CATEGORY) {
      const stockByWarehouse = warehouses.map((w) => {
        const item = w.stockItems.find((s) => s.productId === line.productId);
        return {
          warehouseId: w.id,
          warehouseName: w.name,
          availableQty: item?.qty ?? 0,
          shippingCostWeight: w.shippingCostWeight,
        };
      });

      const split = splitWarehouseFulfillment(line.qty, stockByWarehouse);

      for (const alloc of split.allocations) {
        await db.fulfillmentSplit.create({
          data: {
            quotationId,
            quotationLineId: line.id,
            warehouseId: alloc.warehouseId,
            qty: alloc.qty,
            status: "PLANNED",
          },
        });
        await db.stockItem.updateMany({
          where: { warehouseId: alloc.warehouseId, productId: line.productId },
          data: { qty: { decrement: alloc.qty } },
        });
      }

      if (split.backorderQty > 0) {
        await db.fulfillmentSplit.create({
          data: {
            quotationId,
            quotationLineId: line.id,
            warehouseId: warehouses[0].id,
            qty: split.backorderQty,
            status: "BACKORDER",
          },
        });
      }
    }

    if (line.lineType === "SUBSCRIPTION" && line.subscriptionPlan) {
      const entries = generateUpcomingBillingEntries(
        line.subscriptionPlan.interval,
        quotation.updatedAt,
        line.unitPrice * (1 - line.discountPct / 100),
        line.qty,
        3,
      );
      for (const entry of entries) {
        await db.billingScheduleEntry.create({
          data: {
            quotationId,
            quotationLineId: line.id,
            periodStart: entry.periodStart,
            periodEnd: entry.periodEnd,
            amount: entry.amount,
            status: "UPCOMING",
          },
        });
      }
    }
  }
}

export async function consolidateBackorder(quotationId: string, splitId: string) {
  const backorder = await db.fulfillmentSplit.findUniqueOrThrow({
    where: { id: splitId },
    include: { quotationLine: { include: { product: true } } },
  });
  if (backorder.status !== "BACKORDER") return { resolvedQty: 0, stillBackordered: 0 };

  const warehouses = await db.warehouse.findMany({ include: { stockItems: true } });
  const stockByWarehouse = warehouses.map((w) => {
    const item = w.stockItems.find((s) => s.productId === backorder.quotationLine.productId);
    return {
      warehouseId: w.id,
      warehouseName: w.name,
      availableQty: item?.qty ?? 0,
      shippingCostWeight: w.shippingCostWeight,
    };
  });

  const split = splitWarehouseFulfillment(backorder.qty, stockByWarehouse);

  for (const alloc of split.allocations) {
    await db.fulfillmentSplit.create({
      data: {
        quotationId,
        quotationLineId: backorder.quotationLineId,
        warehouseId: alloc.warehouseId,
        qty: alloc.qty,
        status: "PLANNED",
      },
    });
    await db.stockItem.updateMany({
      where: { warehouseId: alloc.warehouseId, productId: backorder.quotationLine.productId },
      data: { qty: { decrement: alloc.qty } },
    });
  }

  if (split.backorderQty > 0) {
    await db.fulfillmentSplit.update({
      where: { id: splitId },
      data: { qty: split.backorderQty },
    });
  } else {
    await db.fulfillmentSplit.delete({ where: { id: splitId } });
  }

  const resolvedQty = backorder.qty - split.backorderQty;
  return { resolvedQty, stillBackordered: split.backorderQty };
}

export async function calculateOneTimeTotal(quotationId: string) {
  const lines = await db.quotationLine.findMany({
    where: { quotationId, lineType: "ONE_TIME" },
    include: { product: true },
  });
  return lines.reduce((sum, l) => {
    const base = l.qty * l.unitPrice * (1 - l.discountPct / 100);
    return sum + base * (1 + l.product.taxPct / 100);
  }, 0);
}

export async function logAudit(
  entityType: string,
  entityId: string,
  action: string,
  userId: string | null,
  detail?: string,
) {
  await db.auditLog.create({
    data: { entityType, entityId, action, userId, detail },
  });
}
