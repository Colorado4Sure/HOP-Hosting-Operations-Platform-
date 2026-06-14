"use client";

import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

const serviceStatusMap: Record<
  string,
  { label: string; variant: BadgeProps["variant"] }
> = {
  active: { label: "Active", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  suspended: { label: "Suspended", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "secondary" },
  terminated: { label: "Terminated", variant: "outline" },
  fraud: { label: "Fraud", variant: "destructive" },
};

interface ServiceStatusBadgeProps {
  status: string;
}

export function ServiceStatusBadge({ status }: ServiceStatusBadgeProps) {
  const config = serviceStatusMap[status.toLowerCase()] ?? {
    label: status,
    variant: "secondary" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
