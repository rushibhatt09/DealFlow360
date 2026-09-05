export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  availableQty: number;
  shippingCostWeight: number;
}

export interface WarehouseAllocation {
  warehouseId: string;
  warehouseName: string;
  qty: number;
}

export interface WarehouseSplitResult {
  allocations: WarehouseAllocation[];
  backorderQty: number;
  estimatedShipments: number;
  estimatedShippingCost: number;
}

/**
 * Prefers a single warehouse that can cover the full quantity (fewest
 * shipments). When none can, it falls back to the fewest warehouses needed
 * to cover as much as possible, picking the largest stock first and using
 * shipping-cost weight as a tie-breaker.
 */
export function splitWarehouseFulfillment(
  qtyNeeded: number,
  warehouses: WarehouseStock[],
): WarehouseSplitResult {
  const candidates = warehouses.filter((w) => w.availableQty > 0);

  const singleCoverage = candidates
    .filter((w) => w.availableQty >= qtyNeeded)
    .sort((a, b) => a.shippingCostWeight - b.shippingCostWeight)[0];

  if (singleCoverage) {
    return {
      allocations: [
        {
          warehouseId: singleCoverage.warehouseId,
          warehouseName: singleCoverage.warehouseName,
          qty: qtyNeeded,
        },
      ],
      backorderQty: 0,
      estimatedShipments: 1,
      estimatedShippingCost: qtyNeeded * singleCoverage.shippingCostWeight,
    };
  }

  const sorted = [...candidates].sort(
    (a, b) =>
      b.availableQty - a.availableQty ||
      a.shippingCostWeight - b.shippingCostWeight,
  );

  const allocations: WarehouseAllocation[] = [];
  let remaining = qtyNeeded;
  let cost = 0;

  for (const wh of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, wh.availableQty);
    if (take <= 0) continue;
    allocations.push({
      warehouseId: wh.warehouseId,
      warehouseName: wh.warehouseName,
      qty: take,
    });
    cost += take * wh.shippingCostWeight;
    remaining -= take;
  }

  return {
    allocations,
    backorderQty: Math.max(0, remaining),
    estimatedShipments: allocations.length,
    estimatedShippingCost: cost,
  };
}
