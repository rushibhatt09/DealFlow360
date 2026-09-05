import {
  addMonths,
  addQuarters,
  addYears,
  differenceInCalendarDays,
} from "date-fns";

export type SubscriptionInterval = "MONTHLY" | "QUARTERLY" | "YEARLY";

function advance(date: Date, interval: SubscriptionInterval): Date {
  if (interval === "MONTHLY") return addMonths(date, 1);
  if (interval === "QUARTERLY") return addQuarters(date, 1);
  return addYears(date, 1);
}

export function getPeriodBounds(
  interval: SubscriptionInterval,
  periodStart: Date,
) {
  return { periodStart, periodEnd: advance(periodStart, interval) };
}

export interface BillingEntryPreview {
  periodStart: Date;
  periodEnd: Date;
  amount: number;
}

export function generateUpcomingBillingEntries(
  interval: SubscriptionInterval,
  startDate: Date,
  unitPrice: number,
  qty: number,
  count = 3,
): BillingEntryPreview[] {
  const entries: BillingEntryPreview[] = [];
  let cursor = startDate;
  for (let i = 0; i < count; i++) {
    const { periodStart, periodEnd } = getPeriodBounds(interval, cursor);
    entries.push({ periodStart, periodEnd, amount: unitPrice * qty });
    cursor = periodEnd;
  }
  return entries;
}

export interface ProrationInput {
  periodStart: Date;
  periodEnd: Date;
  changeDate: Date;
  oldQty: number;
  newQty: number;
  unitPrice: number;
}

export interface ProrationResult {
  daysRemaining: number;
  daysInPeriod: number;
  creditAmount: number;
  chargeAmount: number;
  netAmount: number;
}

/**
 * Mid-cycle quantity change: refund the unused portion of the old quantity
 * for the remaining days in the period, then charge the new quantity for
 * those same remaining days.
 */
export function prorateQuantityChange(input: ProrationInput): ProrationResult {
  const daysInPeriod = Math.max(
    1,
    differenceInCalendarDays(input.periodEnd, input.periodStart),
  );
  const daysRemaining = Math.max(
    0,
    differenceInCalendarDays(input.periodEnd, input.changeDate),
  );
  const dailyRatePerUnit = input.unitPrice / daysInPeriod;

  const creditAmount = input.oldQty * dailyRatePerUnit * daysRemaining;
  const chargeAmount = input.newQty * dailyRatePerUnit * daysRemaining;

  return {
    daysRemaining,
    daysInPeriod,
    creditAmount,
    chargeAmount,
    netAmount: chargeAmount - creditAmount,
  };
}
