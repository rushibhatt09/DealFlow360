export interface DiscountLineInput {
  category: string;
  discountPct: number;
  lineTotal: number;
}

export interface CeilingLookup {
  (tier: string, category: string): number | undefined;
}

export interface LineRiskDetail {
  category: string;
  discountPct: number;
  allowedPct: number;
  overagePts: number;
}

export interface RiskScoreResult {
  riskScore: number;
  worstLineOverage: number;
  blendedOverage: number;
  lineDetails: LineRiskDetail[];
}

/**
 * A quote is flagged if either a single line blows past its own category
 * ceiling, or many lines each shave off a little and the total giveaway
 * adds up. The score is whichever signal is larger.
 */
export function calculateBlendedRiskScore(
  lines: DiscountLineInput[],
  tier: string,
  getCeiling: CeilingLookup,
): RiskScoreResult {
  const lineDetails: LineRiskDetail[] = lines.map((line) => {
    const allowedPct =
      getCeiling(tier, line.category) ?? getCeiling(tier, "ALL") ?? 0;
    const overagePts = Math.max(0, line.discountPct - allowedPct);
    return {
      category: line.category,
      discountPct: line.discountPct,
      allowedPct,
      overagePts,
    };
  });

  const worstLineOverage = lineDetails.reduce(
    (max, l) => Math.max(max, l.overagePts),
    0,
  );
  const blendedOverage = lineDetails.reduce((sum, l) => sum + l.overagePts, 0);

  return {
    riskScore: Math.max(worstLineOverage, blendedOverage),
    worstLineOverage,
    blendedOverage,
    lineDetails,
  };
}

export interface ApprovalRuleInput {
  minScore: number;
  maxScore: number | null;
  requiresManager: boolean;
  requiresFinance: boolean;
}

export interface ApprovalRequirement {
  requiresManager: boolean;
  requiresFinance: boolean;
}

export function resolveApprovalRequirement(
  score: number,
  rules: ApprovalRuleInput[],
): ApprovalRequirement {
  if (score <= 0) return { requiresManager: false, requiresFinance: false };

  const sorted = [...rules].sort((a, b) => a.minScore - b.minScore);
  const match = sorted.find(
    (r) => score >= r.minScore && (r.maxScore === null || score <= r.maxScore),
  );

  if (!match) return { requiresManager: true, requiresFinance: false };
  return {
    requiresManager: match.requiresManager,
    requiresFinance: match.requiresFinance,
  };
}
