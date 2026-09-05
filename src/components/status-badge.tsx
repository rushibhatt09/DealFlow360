import { Badge, type BadgeProps } from "@/components/ui/badge";

type Variant = NonNullable<BadgeProps["variant"]>;

const STATUS_MAP: Record<string, { label: string; variant: Variant }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  RETURNED: { label: "Returned", variant: "warning" },
  UNDER_NEGOTIATION: { label: "Under Negotiation", variant: "info" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  FULFILLED: { label: "Fulfilled", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
  PENDING: { label: "Pending", variant: "warning" },

  PLANNED: { label: "Planned", variant: "info" },
  BACKORDER: { label: "Backorder", variant: "warning" },
  SHIPPED: { label: "Shipped", variant: "success" },

  UPCOMING: { label: "Upcoming", variant: "neutral" },
  INVOICED: { label: "Invoiced", variant: "info" },
  PAID: { label: "Paid", variant: "success" },
  CREDITED: { label: "Credited", variant: "warning" },

  SENT: { label: "Sent", variant: "info" },

  BRONZE: { label: "Bronze", variant: "neutral" },
  SILVER: { label: "Silver", variant: "info" },
  GOLD: { label: "Gold", variant: "warning" },
};

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_MAP[status] ?? { label: status, variant: "neutral" as Variant };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
