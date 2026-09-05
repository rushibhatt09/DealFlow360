import { PrismaClient, type CustomerTier } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  calculateBlendedRiskScore,
  resolveApprovalRequirement,
  resolveVolumeBonus,
} from "../src/lib/discount-engine";

const db = new PrismaClient();

// Deterministic PRNG so re-seeding always produces the same "random" data.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260905);
const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];
function pickWeighted<T>(items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [item, w] of items) {
    if (r < w) return item;
    r -= w;
  }
  return items[items.length - 1][0];
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  await db.volumeDiscountRule.deleteMany();
  await db.warehouse.deleteMany();
  await db.product.deleteMany();
  await db.customer.deleteMany();
  await db.user.deleteMany();

  const pw = await bcrypt.hash("password123", 10);
  const portalPw = await bcrypt.hash("portal123", 10);

  // ---------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------
  const admin = await db.user.create({
    data: { name: "Rushi Bhatt", email: "admin@dealflow360.com", passwordHash: pw, role: "ADMIN" },
  });
  const manager = await db.user.create({
    data: {
      name: "Priya Shah",
      email: "manager@dealflow360.com",
      passwordHash: pw,
      role: "SALES_MANAGER",
      // Matches her documented job: "configures discount tiers and approval
      // chains." Everything else in the admin backend she has to be
      // granted explicitly, same as anyone else.
      canViewDiscounts: true,
      canEditDiscounts: true,
    },
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
  const rep3 = await db.user.create({
    data: { name: "Vikram Rao", email: "vikram@dealflow360.com", passwordHash: pw, role: "SALES_REP" },
  });
  const rep4 = await db.user.create({
    data: { name: "Sneha Iyer", email: "sneha@dealflow360.com", passwordHash: pw, role: "SALES_REP" },
  });
  const rep5 = await db.user.create({
    data: { name: "Arjun Malhotra", email: "arjun@dealflow360.com", passwordHash: pw, role: "SALES_REP" },
  });
  const rep6 = await db.user.create({
    data: { name: "Divya Nair", email: "divya@dealflow360.com", passwordHash: pw, role: "SALES_REP" },
  });
  const reps = [rep, rep2, rep3, rep4, rep5, rep6];

  // ---------------------------------------------------------------------
  // Customers -- the first of each tier are the hand-crafted "hero"
  // accounts used in the live demo walkthrough; the rest exist to give
  // search, filters, and reporting real volume to work with.
  // ---------------------------------------------------------------------
  const goldNames = [
    "Acme Corp",
    "Tata Consul Traders",
    "Reliance Digital Solutions",
    "Wipro Systems Hub",
    "Infosys Retail Ventures",
    "Mahindra AutoParts",
    "Bajaj Industrial Supplies",
    "Godrej Home Essentials",
  ];
  const silverNames = [
    "Beta Industries",
    "Sharma Textiles",
    "Patel Electronics",
    "Kumar Enterprises",
    "Singh Hardware Co",
    "Verma Furnishings",
    "Iyer Tech Solutions",
    "Chopra Logistics",
  ];
  const bronzeNames = [
    "Nimbus Retail",
    "Mumbai Traders",
    "Delhi Wholesale Mart",
    "Bangalore Byte Store",
    "Chennai Components",
    "Pune Precision Tools",
    "Kolkata Corner Shop",
    "Ahmedabad Agro Supplies",
  ];
  const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  // These three portal emails are hardcoded on purpose -- they're the
  // hero demo logins already documented and tested; do not derive them.
  const heroPortalEmails: Record<string, string> = {
    "Acme Corp": "acme@example.com",
    "Beta Industries": "beta@example.com",
    "Nimbus Retail": "nimbus@example.com",
  };

  const customers: { id: string; tier: CustomerTier; name: string }[] = [];
  for (const [names, tier] of [
    [goldNames, "GOLD"],
    [silverNames, "SILVER"],
    [bronzeNames, "BRONZE"],
  ] as [string[], CustomerTier][]) {
    for (const name of names) {
      const c = await db.customer.create({
        data: {
          name,
          tier,
          portalEmail: heroPortalEmails[name] ?? `${slugify(name)}@${slugify(name)}.co.in`,
          portalPasswordHash: portalPw,
        },
      });
      customers.push({ id: c.id, tier, name });
    }
  }
  const acme = customers.find((c) => c.name === "Acme Corp")!;
  const beta = customers.find((c) => c.name === "Beta Industries")!;
  const nimbus = customers.find((c) => c.name === "Nimbus Retail")!;

  // ---------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------
  type ProductSeed = { name: string; category: string; unitPrice: number; unitCost: number; unit?: string; taxPct?: number };
  const productSeeds: ProductSeed[] = [
    { name: "Laptop Pro 14", category: "Hardware", unitPrice: 1200, unitCost: 800, taxPct: 5 },
    { name: "Server Rack Unit", category: "Hardware", unitPrice: 3000, unitCost: 2100, taxPct: 5 },
    { name: "Wireless Router X", category: "Hardware", unitPrice: 150, unitCost: 90, taxPct: 5 },
    { name: "Desktop Workstation Pro", category: "Hardware", unitPrice: 650, unitCost: 450, taxPct: 5 },
    { name: "All-in-One Printer X200", category: "Hardware", unitPrice: 180, unitCost: 120, taxPct: 5 },
    { name: "27-inch Monitor UHD", category: "Hardware", unitPrice: 220, unitCost: 150, taxPct: 5 },
    { name: "Business Laptop Air", category: "Hardware", unitPrice: 850, unitCost: 600, taxPct: 5 },
    { name: "Network Switch 24-Port", category: "Hardware", unitPrice: 95, unitCost: 60, taxPct: 5 },
    { name: "Wireless Keyboard-Mouse Combo", category: "Hardware", unitPrice: 18, unitCost: 9, taxPct: 5 },
    { name: "Setup & Installation Service", category: "Services", unitPrice: 500, unitCost: 350, unit: "engagement" },
    { name: "Onsite Training Service", category: "Services", unitPrice: 800, unitCost: 600, unit: "engagement" },
    { name: "Priority Support Package", category: "Services", unitPrice: 400, unitCost: 250, unit: "engagement" },
    { name: "Data Migration Service", category: "Services", unitPrice: 150, unitCost: 90, unit: "engagement" },
    { name: "Annual Maintenance Contract", category: "Services", unitPrice: 250, unitCost: 150, unit: "engagement" },
    { name: "Custom Integration Service", category: "Services", unitPrice: 400, unitCost: 280, unit: "engagement" },
    { name: "Cloud Backup Plan", category: "Subscriptions", unitPrice: 50, unitCost: 20, unit: "seat" },
    { name: "Premium Support Subscription", category: "Subscriptions", unitPrice: 100, unitCost: 40, unit: "seat" },
    { name: "Analytics Suite License", category: "Subscriptions", unitPrice: 200, unitCost: 70, unit: "seat" },
    { name: "Advanced Security Suite", category: "Subscriptions", unitPrice: 35, unitCost: 15, unit: "seat" },
    { name: "Team Collaboration Suite", category: "Subscriptions", unitPrice: 25, unitCost: 9, unit: "seat" },
    { name: "Cloud Storage Pro", category: "Subscriptions", unitPrice: 15, unitCost: 6, unit: "seat" },
    { name: "Helpdesk Ticketing License", category: "Subscriptions", unitPrice: 18, unitCost: 7, unit: "seat" },
    { name: "CRM Starter Plan", category: "Subscriptions", unitPrice: 30, unitCost: 12, unit: "seat" },
    { name: "ERP Connector License", category: "Subscriptions", unitPrice: 50, unitCost: 20, unit: "seat" },
  ];
  const products = await Promise.all(
    productSeeds.map((p) =>
      db.product.create({
        data: {
          name: p.name,
          category: p.category,
          unitPrice: p.unitPrice,
          unitCost: p.unitCost,
          unit: p.unit ?? "unit",
          taxPct: p.taxPct ?? 0,
        },
      }),
    ),
  );
  const byName = (name: string) => products.find((p) => p.name === name)!;
  const laptop = byName("Laptop Pro 14");
  const serverRack = byName("Server Rack Unit");
  const router = byName("Wireless Router X");
  const trainingService = byName("Onsite Training Service");
  const supportPkg = byName("Priority Support Package");
  const cloudBackup = byName("Cloud Backup Plan");
  const hardwareProducts = products.filter((p) => p.category === "Hardware");
  const serviceProducts = products.filter((p) => p.category === "Services");
  const subscriptionProducts = products.filter((p) => p.category === "Subscriptions");

  // ---------------------------------------------------------------------
  // Warehouses & stock -- Main/East/West keep the exact levels the live
  // demo relies on for the multi-warehouse split & backorder story; the
  // two new warehouses carry stock for everything else so bulk history
  // doesn't draw down the hero pool.
  // ---------------------------------------------------------------------
  const mainWh = await db.warehouse.create({ data: { name: "Main Warehouse (Mumbai)", shippingCostWeight: 1.0 } });
  const eastWh = await db.warehouse.create({ data: { name: "East Depot (Kolkata)", shippingCostWeight: 1.3 } });
  const westWh = await db.warehouse.create({ data: { name: "West Hub (Ahmedabad)", shippingCostWeight: 1.6 } });
  const southWh = await db.warehouse.create({ data: { name: "South Warehouse (Bengaluru)", shippingCostWeight: 1.4 } });
  const northWh = await db.warehouse.create({ data: { name: "North Distribution Center (Delhi)", shippingCostWeight: 1.2 } });
  const warehouses = [mainWh, eastWh, westWh, southWh, northWh];

  const stock: [string, string, number][] = [
    [laptop.id, mainWh.id, 6],
    [laptop.id, eastWh.id, 5],
    [laptop.id, westWh.id, 0],
    [laptop.id, southWh.id, 0],
    [laptop.id, northWh.id, 0],
    [serverRack.id, mainWh.id, 2],
    [serverRack.id, eastWh.id, 1],
    [serverRack.id, westWh.id, 0],
    [serverRack.id, southWh.id, 0],
    [serverRack.id, northWh.id, 0],
    [router.id, mainWh.id, 100],
    [router.id, eastWh.id, 50],
    [router.id, westWh.id, 30],
    [router.id, southWh.id, 40],
    [router.id, northWh.id, 60],
  ];
  for (const p of hardwareProducts) {
    if ([laptop.id, serverRack.id, router.id].includes(p.id)) continue;
    for (const wh of warehouses) {
      stock.push([p.id, wh.id, randInt(20, 200)]);
    }
  }
  for (const [productId, warehouseId, qty] of stock) {
    await db.stockItem.create({ data: { productId, warehouseId, qty } });
  }

  // ---------------------------------------------------------------------
  // Discount ceilings & approval rules
  // ---------------------------------------------------------------------
  const ceilingSeeds: [CustomerTier, string, number][] = [
    ["GOLD", "Hardware", 15], ["GOLD", "Services", 10], ["GOLD", "Subscriptions", 12], ["GOLD", "ALL", 10],
    ["SILVER", "Hardware", 10], ["SILVER", "Services", 7], ["SILVER", "Subscriptions", 8], ["SILVER", "ALL", 7],
    ["BRONZE", "Hardware", 5], ["BRONZE", "Services", 3], ["BRONZE", "Subscriptions", 5], ["BRONZE", "ALL", 5],
  ];
  for (const [tier, category, maxDiscountPct] of ceilingSeeds) {
    await db.discountCeiling.create({ data: { tier, category, maxDiscountPct } });
  }
  const ceilings = await db.discountCeiling.findMany();
  const getCeiling = (tier: string, category: string) =>
    ceilings.find((c) => c.tier === tier && c.category === category)?.maxDiscountPct;

  await db.approvalRule.create({ data: { minScore: 0.01, maxScore: 5, requiresManager: true, requiresFinance: false } });
  await db.approvalRule.create({ data: { minScore: 5.01, maxScore: null, requiresManager: true, requiresFinance: true } });
  const approvalRules = await db.approvalRule.findMany();

  await db.volumeDiscountRule.create({ data: { minLineValue: 5000, bonusDiscountPct: 5 } });
  await db.volumeDiscountRule.create({ data: { minLineValue: 15000, bonusDiscountPct: 8 } });
  await db.volumeDiscountRule.create({ data: { minLineValue: 40000, bonusDiscountPct: 12 } });
  const volumeRules = await db.volumeDiscountRule.findMany();

  // ---------------------------------------------------------------------
  // Subscription plans & upsell rules
  // ---------------------------------------------------------------------
  const monthlyPlan = await db.subscriptionPlan.create({ data: { name: "Monthly Cloud Backup", interval: "MONTHLY", prorationEnabled: true } });
  const quarterlyPlan = await db.subscriptionPlan.create({ data: { name: "Quarterly Premium Support", interval: "QUARTERLY", prorationEnabled: true } });
  const yearlyPlan = await db.subscriptionPlan.create({ data: { name: "Yearly Analytics License", interval: "YEARLY", prorationEnabled: true } });
  const plans = [monthlyPlan, quarterlyPlan, yearlyPlan];

  await db.upsellRule.create({ data: { baseProductId: laptop.id, suggestedProductId: supportPkg.id, minMarginPct: 30, promoted: true } });
  await db.upsellRule.create({ data: { baseProductId: laptop.id, suggestedProductId: router.id, minMarginPct: 20, promoted: false } });
  await db.upsellRule.create({ data: { baseProductId: serverRack.id, suggestedProductId: trainingService.id, minMarginPct: 15, promoted: false } });
  await db.upsellRule.create({ data: { baseProductId: router.id, suggestedProductId: cloudBackup.id, minMarginPct: 15, promoted: true } });
  await db.upsellRule.create({ data: { baseProductId: byName("Desktop Workstation Pro").id, suggestedProductId: byName("27-inch Monitor UHD").id, minMarginPct: 20, promoted: true } });
  await db.upsellRule.create({ data: { baseProductId: byName("Business Laptop Air").id, suggestedProductId: byName("Advanced Security Suite").id, minMarginPct: 25, promoted: false } });

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  // ---------------------------------------------------------------------
  // Hero quotations -- exact scenarios the live demo script depends on.
  // ---------------------------------------------------------------------
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
    data: { customerId: acme.id, repId: rep.id, status: "DRAFT", lastActivityAt: now },
  });
  await db.quotationLine.create({
    data: { quotationId: draft.id, productId: laptop.id, qty: 2, unitPrice: laptop.unitPrice, discountPct: 8, lineType: "ONE_TIME" },
  });

  // ---------------------------------------------------------------------
  // Bulk history -- real volume for search, filters, grouping, reports,
  // and deal-health/anomaly detection to work against. Every risk score
  // below is computed with the same engine the live app uses, and every
  // status's supporting records (approvals, invoices, billing) are
  // generated to match, not just a label on a bare Quotation row.
  // ---------------------------------------------------------------------
  const STATUS_WEIGHTS: ["DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "UNDER_NEGOTIATION" | "CONFIRMED" | "FULFILLED" | "REJECTED" | "CANCELLED", number][] = [
    ["FULFILLED", 34],
    ["CONFIRMED", 18],
    ["PENDING_APPROVAL", 12],
    ["DRAFT", 12],
    ["UNDER_NEGOTIATION", 8],
    ["APPROVED", 9],
    ["REJECTED", 5],
    ["CANCELLED", 2],
  ];

  const BULK_COUNT = 120;
  let created = 0;
  const productById = (productId: string) => products.find((p) => p.id === productId)!;

  for (let i = 0; i < BULK_COUNT; i++) {
    const customer = pick(customers);
    const repForQuote = pick(reps);
    const ageDays = randInt(1, 180);
    const createdAt = daysAgo(ageDays);
    const status = pickWeighted(STATUS_WEIGHTS);

    const lineCount = randInt(1, 4);
    const linePool = shuffle([...hardwareProducts, ...serviceProducts, ...subscriptionProducts]).slice(0, lineCount);

    const lineInputs = linePool.map((product) => {
      const ceiling = getCeiling(customer.tier, product.category) ?? getCeiling(customer.tier, "ALL") ?? 5;
      const overage = rng() < 0.18;
      const baseDiscountPct = overage
        ? Math.min(45, ceiling + randInt(1, 15))
        : randInt(0, Math.max(0, Math.floor(ceiling)));
      const qty = randInt(1, 8);
      const volumeBonus = resolveVolumeBonus(qty * product.unitPrice, volumeRules);
      return { product, qty, discountPct: baseDiscountPct + volumeBonus };
    });

    const riskResult = calculateBlendedRiskScore(
      lineInputs.map((l) => ({ category: l.product.category, discountPct: l.discountPct, lineTotal: l.qty * l.product.unitPrice })),
      customer.tier,
      getCeiling,
    );

    const quotation = await db.quotation.create({
      data: {
        customerId: customer.id,
        repId: repForQuote.id,
        status,
        riskScore: riskResult.riskScore,
        createdAt,
        updatedAt: daysAgo(Math.max(0, ageDays - randInt(0, Math.min(ageDays, 10)))),
        lastActivityAt: daysAgo(Math.max(0, ageDays - randInt(0, Math.min(ageDays, 10)))),
      },
    });
    created++;

    const lines = [];
    for (const l of lineInputs) {
      const isSubscription = l.product.category === "Subscriptions";
      const line = await db.quotationLine.create({
        data: {
          quotationId: quotation.id,
          productId: l.product.id,
          qty: l.qty,
          unitPrice: l.product.unitPrice,
          discountPct: l.discountPct,
          lineType: isSubscription ? "SUBSCRIPTION" : "ONE_TIME",
          subscriptionPlanId: isSubscription ? pick(plans).id : null,
        },
      });
      lines.push(line);
    }

    await db.auditLog.create({ data: { entityType: "Quotation", entityId: quotation.id, action: "CREATED", userId: repForQuote.id } });

    const needsApproval = riskResult.riskScore > 0;
    const requirement = needsApproval ? resolveApprovalRequirement(riskResult.riskScore, approvalRules) : null;
    const pastApprovalStage = status === "APPROVED" || status === "UNDER_NEGOTIATION" || status === "CONFIRMED" || status === "FULFILLED";

    if (needsApproval && requirement && (requirement.requiresManager || requirement.requiresFinance)) {
      let seq = 1;
      if (requirement.requiresManager) {
        await db.approvalStep.create({
          data: {
            quotationId: quotation.id,
            level: "MANAGER",
            sequence: seq++,
            status: status === "REJECTED" ? "REJECTED" : pastApprovalStage || status === "PENDING_APPROVAL" ? "APPROVED" : "PENDING",
            reviewerId: manager.id,
            decidedAt: pastApprovalStage ? createdAt : null,
          },
        });
      }
      if (requirement.requiresFinance) {
        await db.approvalStep.create({
          data: {
            quotationId: quotation.id,
            level: "FINANCE",
            sequence: seq++,
            status: pastApprovalStage ? "APPROVED" : "PENDING",
            reviewerId: pastApprovalStage ? finance.id : null,
            decidedAt: pastApprovalStage ? createdAt : null,
          },
        });
      }
      await db.auditLog.create({
        data: { entityType: "Quotation", entityId: quotation.id, action: "SUBMITTED_FOR_APPROVAL", userId: repForQuote.id, detail: `Risk score ${riskResult.riskScore.toFixed(1)}` },
      });
    }

    const oneTimeHardwareLines = lines.filter((l) => l.lineType === "ONE_TIME" && productById(l.productId).category === "Hardware");

    if ((status === "APPROVED" || status === "CONFIRMED" || status === "FULFILLED") && oneTimeHardwareLines.length > 0) {
      for (const line of oneTimeHardwareLines) {
        await db.fulfillmentSplit.create({
          data: {
            quotationId: quotation.id,
            quotationLineId: line.id,
            warehouseId: pick([mainWh, eastWh, westWh, southWh, northWh]).id,
            qty: line.qty,
            status: status === "FULFILLED" ? "SHIPPED" : "PLANNED",
          },
        });
      }
    }

    const subscriptionLines = lines.filter((l) => l.lineType === "SUBSCRIPTION");
    if (subscriptionLines.length > 0 && (status === "APPROVED" || status === "CONFIRMED" || status === "FULFILLED")) {
      for (const line of subscriptionLines) {
        const net = line.unitPrice * (1 - line.discountPct / 100);
        await db.billingScheduleEntry.create({
          data: {
            quotationId: quotation.id,
            quotationLineId: line.id,
            periodStart: createdAt,
            periodEnd: daysAgo(Math.max(0, ageDays - 30)),
            amount: net * line.qty,
            status: status === "FULFILLED" ? "PAID" : status === "CONFIRMED" ? "INVOICED" : "UPCOMING",
          },
        });
        if (status !== "FULFILLED") {
          await db.billingScheduleEntry.create({
            data: {
              quotationId: quotation.id,
              quotationLineId: line.id,
              periodStart: daysAgo(Math.max(0, ageDays - 30)),
              periodEnd: daysAgo(Math.max(0, ageDays - 60)),
              amount: net * line.qty,
              status: "UPCOMING",
            },
          });
        }
      }
    }

    if (status === "CONFIRMED" || status === "FULFILLED") {
      const oneTimeTotal = lines
        .filter((l) => l.lineType === "ONE_TIME")
        .reduce((s, l) => {
          const product = productById(l.productId);
          const base = l.qty * l.unitPrice * (1 - l.discountPct / 100);
          return s + base * (1 + product.taxPct / 100);
        }, 0);
      if (oneTimeTotal > 0) {
        const invoice = await db.invoice.create({
          data: { quotationId: quotation.id, amount: oneTimeTotal, status: status === "FULFILLED" ? "PAID" : "SENT" },
        });
        if (status === "FULFILLED") {
          await db.payment.create({
            data: { invoiceId: invoice.id, amount: oneTimeTotal, method: pick(["Bank", "Cash", "Card"]) },
          });
        }
      }
      await db.auditLog.create({ data: { entityType: "Quotation", entityId: quotation.id, action: "CONFIRMED", userId: repForQuote.id } });
    }

    if (status === "UNDER_NEGOTIATION") {
      await db.negotiationMessage.create({
        data: {
          quotationId: quotation.id,
          author: "CUSTOMER",
          message: pick([
            "Could we get a better rate on the larger quantities here?",
            "Can you confirm the delivery timeline before we sign off?",
            "We'd like a small discount adjustment on the service line.",
            "Please clarify the renewal terms on the subscription line.",
          ]),
        },
      });
    }
  }

  console.log(`Seed complete. ${created} bulk quotations generated alongside the hero demo scenarios.`);
  console.log("Internal logins (password: password123):");
  console.log("  admin@dealflow360.com / manager@dealflow360.com / finance@dealflow360.com / rep@dealflow360.com / ananya@dealflow360.com / vikram@dealflow360.com / sneha@dealflow360.com / arjun@dealflow360.com / divya@dealflow360.com");
  console.log("Customer portal logins (password: portal123):");
  console.log("  acme@example.com (GOLD) / beta@example.com (SILVER) / nimbus@example.com (BRONZE) -- plus 21 more seeded companies");
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
