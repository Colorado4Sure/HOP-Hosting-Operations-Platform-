'use client';

import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';

const invoiceStatusMap: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  paid: { label: 'Paid', variant: 'success' },
  unpaid: { label: 'Unpaid', variant: 'warning' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  draft: { label: 'Draft', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  refunded: { label: 'Refunded', variant: 'secondary' },
};

interface InvoiceStatusBadgeProps {
  status: string;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const config = invoiceStatusMap[status.toLowerCase()] ?? { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
