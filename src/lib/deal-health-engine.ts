export interface StalledCheckInput {
  id: string;
  status: string;
  lastActivityAt: Date;
}

const OPEN_STATUSES = new Set([
  "DRAFT",
  "PENDING_APPROVAL",
  "UNDER_NEGOTIATION",
]);

export function findStalledDeals(
  quotations: StalledCheckInput[],
  thresholdDays: number,
  now: Date = new Date(),
): string[] {
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  return quotations
    .filter(
      (q) =>
        OPEN_STATUSES.has(q.status) &&
        now.getTime() - q.lastActivityAt.getTime() > thresholdMs,
    )
    .map((q) => q.id);
}

export interface AnomalyResult {
  isAnomaly: boolean;
  deltaPts: number;
}

/**
 * Flags a quote whose average discount is meaningfully above the rep's own
 * historical average, so a rep who is normally disciplined but gives away
 * an unusually large discount gets surfaced even if the line-level ceilings
 * were technically respected.
 */
export function detectDiscountAnomaly(
  currentAvgDiscountPct: number,
  repHistoricalAvgDiscountPct: number,
  thresholdPts = 10,
): AnomalyResult {
  const deltaPts = currentAvgDiscountPct - repHistoricalAvgDiscountPct;
  return { isAnomaly: deltaPts > thresholdPts, deltaPts };
}

export function weightedAverageDiscount(
  lines: { discountPct: number; lineTotal: number }[],
): number {
  const totalValue = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  if (totalValue <= 0) return 0;
  const weighted = lines.reduce(
    (sum, l) => sum + l.discountPct * l.lineTotal,
    0,
  );
  return weighted / totalValue;
}
