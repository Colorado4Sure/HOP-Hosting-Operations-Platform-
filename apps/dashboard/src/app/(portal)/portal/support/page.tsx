"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/features/PageHeader";
import { DataTable } from "@/components/features/DataTable";
import { TicketStatusBadge } from "@/components/features/TicketStatusBadge";
import { supportApi, type Ticket } from "@/lib/api/support";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const priorityVariant: Record<string, "destructive" | "warning" | "secondary"> =
  {
    urgent: "destructive",
    high: "warning",
    medium: "secondary",
    low: "secondary",
  };

export default function PortalSupportPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data: response, isLoading } = useQuery({
    queryKey: ["portal-tickets", page],
    queryFn: () => supportApi.listTickets({ page, perPage: 20 }),
  });

  const tickets = response?.data ?? [];
  const total = response?.meta?.total ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Support Tickets"
        description="View and manage your support requests."
        action={
          <Button asChild>
            <a href="/portal/support/new">
              <Plus className="mr-1 h-4 w-4" />
              Open Ticket
            </a>
          </Button>
        }
      />

      <DataTable<Ticket>
        columns={[
          { header: "Ticket #", key: "number" },
          { header: "Subject", key: "subject" },
          {
            header: "Priority",
            key: "priority",
            render: (v) => (
              <Badge variant={priorityVariant[String(v)] ?? "secondary"}>
                {String(v)}
              </Badge>
            ),
          },
          {
            header: "Status",
            key: "status",
            render: (v) => <TicketStatusBadge status={String(v)} />,
          },
          {
            header: "Created",
            key: "createdAt",
            render: (v) => formatDate(String(v)),
          },
        ]}
        data={tickets}
        isLoading={isLoading}
        emptyMessage="You have no support tickets."
        onRowClick={(row) => router.push(`/portal/support/${row.id}`)}
        pagination={{ page, total, limit: 20, onPageChange: setPage }}
      />
    </div>
  );
}
