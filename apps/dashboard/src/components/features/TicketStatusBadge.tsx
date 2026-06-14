"use client";

import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

const ticketStatusMap: Record<
  string,
  { label: string; variant: BadgeProps["variant"] }
> = {
  open: { label: "Open", variant: "default" },
  answered: { label: "Answered", variant: "success" },
  customer_reply: { label: "Customer Reply", variant: "warning" },
  on_hold: { label: "On Hold", variant: "warning" },
  in_progress: { label: "In Progress", variant: "default" },
  closed: { label: "Closed", variant: "secondary" },
};

interface TicketStatusBadgeProps {
  status: string;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const config = ticketStatusMap[status.toLowerCase()] ?? {
    label: status,
    variant: "secondary" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
