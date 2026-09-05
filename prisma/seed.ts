import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  await db.payment.deleteMany();
  await db.invoice.deleteMany();
  await db.negotiationMessage.deleteMany();
  await db.billingScheduleEntry.deleteMany();
  await db.fulfillmentSplit.deleteMany();
  await db.approvalStep.deleteMany();
  await db.auditLog.deleteMany();
  await db.quotationLine.deleteMany();
  await db.quotation.deleteMany();
  await db.upsellRule.deleteMany();
  await db.stockItem.deleteMany();
  await db.subscriptionPlan.deleteMany();
  await db.discountCeiling.deleteMany();
  await db.approvalRule.deleteMany();
  await db.warehouse.deleteMany();
  await db.product.deleteMany();
  await db.customer.deleteMany();
  await db.user.deleteMany();

  const pw = await bcrypt.hash("password123", 10);
  const portalPw = await bcrypt.hash("portal123", 10);

  const admin = await db.user.create({
    data: { name: "Rushi Bhatt", email: "admin@dealflow360.com", passwordHash: pw, role: "ADMIN" },
  });
  const manager = await db.user.create({
    data: { name: "Priya Shah", email: "manager@dealflow360.com", passwordHash: pw, role: "SALES_MANAGER" },
  });
  const finance = await db.user.create({
    data: { name: "Karan Mehta", email: "finance@dealflow360.com", passwordHash: pw, role: "FINANCE" },
  });
  const rep = await db.user.create({
    data: { name: "Rohan Verma", email: "rep@dealflow360.com", passwordHash: pw, role: "SALES_REP" },
  });
  const rep2 = await db.user.create({
    data: { name: "Ananya Singh", email: "ananya@dealflow360.com", passwordHash: pw, role: "SALES_REP" },
  });

  const acme = await db.customer.create({
    data: { name: "Acme Corp", tier: "GOLD", portalEmail: "acme@example.com", portalPasswordHash: portalPw },
  });
  const beta = await db.customer.create({
    data: { name: "Beta Industries", tier: "SILVER", portalEmail: "beta@example.com", portalPasswordHash: portalPw },
  });
  const nimbus = await db.customer.create({
    data: { name: "Nimbus Retail", tier: "BRONZE", portalEmail: "nimbus@example.com", portalPasswordHash: portalPw },
  });

  const laptop = await db.product.create({
    data: { name: "Laptop Pro 14", category: "Hardware", unitPrice: 1200, unitCost: 800, unit: "unit", taxPct: 5 },
  });
  const serverRack = await db.product.create({
    data: { name: "Server Rack Unit", category: "Hardware", unitPrice: 3000, unitCost: 2100, unit: "unit", taxPct: 5 },
  });
  const router = await db.product.create({
    data: { name: "Wireless Router X", category: "Hardware", unitPrice: 150, unitCost: 90, unit: "unit", taxPct: 5 },
  });
  const setupService = await db.product.create({
    data: { name: "Setup & Installation Service", category: "Services", unitPrice: 500, unitCost: 350, unit: "engagement", taxPct: 0 },
  });
  const trainingService = await db.product.create({
    data: { name: "Onsite Training Service", category: "Services", unitPrice: 800, unitCost: 600, unit: "engagement", taxPct: 0 },
  });
  const supportPkg = await db.product.create({
    data: { name: "Priority Support Package", category: "Services", unitPrice: 400, unitCost: 250, unit: "engagement", taxPct: 0 },
  });
  const cloudBackup = await db.product.create({
    data: { name: "Cloud Backup Plan", category: "Subscriptions", unitPrice: 50, unitCost: 20, unit: "seat", taxPct: 0 },
  });
  const premiumSupportSub = await db.product.create({
    data: { name: "Premium Support Subscription", category: "Subscriptions", unitPrice: 100, unitCost: 40, unit: "seat", taxPct: 0 },
  });
  const analyticsLicense = await db.product.create({
    data: { name: "Analytics Suite License", category: "Subscriptions", unitPrice: 200, unitCost: 70, unit: "seat", taxPct: 0 },
  });

  const mainWh = await db.warehouse.create({ data: { name: "Main Warehouse", shippingCostWeight: 1.0 } });
  const eastWh = await db.warehouse.create({ data: { name: "East Depot", shippingCostWeight: 1.3 } });
  const westWh = await db.warehouse.create({ data: { name: "West Hub", shippingCostWeight: 1.6 } });

  const stock: [string, string, number][] = [
    [laptop.id, mainWh.id, 6],
    [laptop.id, eastWh.id, 5],
    [laptop.id, westWh.id, 0],
    [serverRack.id, mainWh.id, 2],
    [serverRack.id, eastWh.id, 1],
    [serverRack.id, westWh.id, 0],
    [router.id, mainWh.id, 100],
    [router.id, eastWh.id, 50],
    [router.id, westWh.id, 30],
  ];
  for (const [productId, warehouseId, qty] of stock) {
    await db.stockItem.create({ data: { productId, warehouseId, qty } });
  }

  const ceilings: [ "GOLD" | "SILVER" | "BRONZE", string, number ][] = [
    ["GOLD", "Hardware", 15], ["GOLD", "Services", 10], ["GOLD", "Subscriptions", 12], ["GOLD", "ALL", 10],
    ["SILVER", "Hardware", 10], ["SILVER", "Services", 7], ["SILVER", "Subscriptions", 8], ["SILVER", "ALL", 7],
    ["BRONZE", "Hardware", 5], ["BRONZE", "Services", 3], ["BRONZE", "Subscriptions", 5], ["BRONZE", "ALL", 5],
  ];
  for (const [tier, category, maxDiscountPct] of ceilings) {
    await db.discountCeiling.create({ data: { tier, category, maxDiscountPct } });
  }

  await db.approvalRule.create({ data: { minScore: 0.01, maxScore: 5, requiresManager: true, requiresFinance: false } });
  await db.approvalRule.create({ data: { minScore: 5.01, maxScore: null, requiresManager: true, requiresFinance: true } });

  const monthlyBackup = await db.subscriptionPlan.create({ data: { name: "Monthly Cloud Backup", interval: "MONTHLY", prorationEnabled: true } });
  const quarterlySupport = await db.subscriptionPlan.create({ data: { name: "Quarterly Premium Support", interval: "QUARTERLY", prorationEnabled: true } });
  const yearlyAnalytics = await db.subscriptionPlan.create({ data: { name: "Yearly Analytics License", interval: "YEARLY", prorationEnabled: true } });
  void monthlyBackup; void quarterlySupport; void yearlyAnalytics; void cloudBackup; void premiumSupportSub; void analyticsLicense;

  await db.upsellRule.create({ data: { baseProductId: laptop.id, suggestedProductId: supportPkg.id, minMarginPct: 30, promoted: true } });
  await db.upsellRule.create({ data: { baseProductId: laptop.id, suggestedProductId: router.id, minMarginPct: 20, promoted: false } });
  await db.upsellRule.create({ data: { baseProductId: serverRack.id, suggestedProductId: trainingService.id, minMarginPct: 15, promoted: false } });
  await db.upsellRule.create({ data: { baseProductId: router.id, suggestedProductId: cloudBackup.id, minMarginPct: 15, promoted: true } });

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  for (let i = 0; i < 4; i++) {
    const q = await db.quotation.create({
      data: {
        customerId: [acme, beta, nimbus][i % 3].id,
        repId: rep.id,
        status: "CONFIRMED",
        riskScore: 0,
        createdAt: daysAgo(30 - i * 3),
        updatedAt: daysAgo(28 - i * 3),
        lastActivityAt: daysAgo(28 - i * 3),
      },
    });
    await db.quotationLine.create({
      data: { quotationId: q.id, productId: router.id, qty: 5, unitPrice: router.unitPrice, discountPct: 4 + i, lineType: "ONE_TIME" },
    });
  }

  const stalled = await db.quotation.create({
    data: {
      customerId: beta.id,
      repId: rep2.id,
      status: "PENDING_APPROVAL",
      riskScore: 6,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(7),
      lastActivityAt: daysAgo(7),
    },
  });
  await db.quotationLine.create({
    data: { quotationId: stalled.id, productId: serverRack.id, qty: 1, unitPrice: serverRack.unitPrice, discountPct: 15, lineType: "ONE_TIME" },
  });
  await db.approvalStep.create({ data: { quotationId: stalled.id, level: "MANAGER", sequence: 1, status: "PENDING" } });
  await db.approvalStep.create({ data: { quotationId: stalled.id, level: "FINANCE", sequence: 2, status: "PENDING" } });

  const draft = await db.quotation.create({
    data: {
      customerId: acme.id,
      repId: rep.id,
      status: "DRAFT",
      lastActivityAt: now,
    },
  });
  await db.quotationLine.create({
    data: { quotationId: draft.id, productId: laptop.id, qty: 2, unitPrice: laptop.unitPrice, discountPct: 8, lineType: "ONE_TIME" },
  });

  console.log("Seed complete.");
  console.log("Internal logins (password: password123):");
  console.log("  admin@dealflow360.com / manager@dealflow360.com / finance@dealflow360.com / rep@dealflow360.com / ananya@dealflow360.com");
  console.log("Customer portal logins (password: portal123):");
  console.log("  acme@example.com (GOLD) / beta@example.com (SILVER) / nimbus@example.com (BRONZE)");
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
