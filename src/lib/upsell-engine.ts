export interface UpsellRuleInput {
  suggestedProductId: string;
  suggestedProductName: string;
  suggestedUnitPrice: number;
  suggestedUnitCost: number;
  minMarginPct: number;
  promoted: boolean;
}

export interface UpsellSuggestion {
  productId: string;
  productName: string;
  unitPrice: number;
  marginPct: number;
  promoted: boolean;
}

function marginPct(price: number, cost: number) {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

/**
 * Ranks candidate upsell products for the items already in the cart.
 * Anything below its own configured minimum margin is filtered out so a
 * thin-margin item never gets pushed just because it was co-purchased
 * historically. Promoted items are ranked ahead of equal-margin ones.
 */
export function rankUpsellSuggestions(
  cartProductIds: string[],
  rulesByBaseProduct: Map<string, UpsellRuleInput[]>,
  alreadyInCart: Set<string>,
): UpsellSuggestion[] {
  const candidates = new Map<string, UpsellSuggestion>();

  for (const baseId of cartProductIds) {
    const rules = rulesByBaseProduct.get(baseId) ?? [];
    for (const rule of rules) {
      if (alreadyInCart.has(rule.suggestedProductId)) continue;
      const margin = marginPct(rule.suggestedUnitPrice, rule.suggestedUnitCost);
      if (margin < rule.minMarginPct) continue;

      const existing = candidates.get(rule.suggestedProductId);
      if (existing && existing.marginPct >= margin && !rule.promoted) continue;

      candidates.set(rule.suggestedProductId, {
        productId: rule.suggestedProductId,
        productName: rule.suggestedProductName,
        unitPrice: rule.suggestedUnitPrice,
        marginPct: margin,
        promoted: rule.promoted,
      });
    }
  }

  return [...candidates.values()].sort((a, b) => {
    if (a.promoted !== b.promoted) return a.promoted ? -1 : 1;
    return b.marginPct - a.marginPct;
  });
}
