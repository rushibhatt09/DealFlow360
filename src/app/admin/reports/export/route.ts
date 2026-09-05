import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import type { Prisma, QuotationStatus } from "@prisma/client";

function csvEscape(value: string | number) {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  await requireRole(["ADMIN", "SALES_MANAGER"]);

  const { searchParams } = new URL(request.url);
  const repId = searchParams.get("repId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const where: Prisma.QuotationWhereInput = {};
  if (repId) where.repId = repId;
  if (status) where.status = status as QuotationStatus;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (category) {
    where.lines = { some: { product: { category } } };
  }

  const quotations = await db.quotation.findMany({
    where,
    include: { customer: true, rep: true, lines: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = [
    ["Customer", "Tier", "Rep", "Status", "Risk Score", "Created", "Line Count", "Order Total", "Products"],
  ];

  for (const q of quotations) {
    const total = q.lines.reduce((s, l) => s + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0);
    const productNames = q.lines.map((l) => l.product.name).join("; ");
    rows.push([
      q.customer.name,
      q.customer.tier,
      q.rep.name,
      q.status,
      q.riskScore.toFixed(1),
      q.createdAt.toISOString().slice(0, 10),
      String(q.lines.length),
      total.toFixed(2),
      productNames,
    ]);
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dealflow360-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
