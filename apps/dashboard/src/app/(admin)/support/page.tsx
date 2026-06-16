"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/features/PageHeader";
import { DataTable } from "@/components/features/DataTable";
import { TicketStatusBadge } from "@/components/features/TicketStatusBadge";
import { supportApi, type Ticket } from "@/lib/api/support";
import { formatDate } from "@/lib/utils";

const priorityVariant: Record<string, "destructive" | "warning" | "secondary"> =
  {
    urgent: "destructive",
    high: "warning",
    medium: "secondary",
    low: "secondary",
  };

export default function AdminSupportPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const { data: response, isLoading } = useQuery({
    queryKey: ["tickets", page, search, status, priority],
    queryFn: () =>
      supportApi.listTickets({
        page,
        perPage: 20,
        search: search || undefined,
        status: status !== "all" ? status : undefined,
        priority: priority !== "all" ? priority : undefined,
      }),
  });

  const tickets = response?.data ?? [];
  const total = response?.meta?.total ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Support Tickets"
        description="Manage customer support requests."
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={priority}
          onValueChange={(v) => {
            setPriority(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<Ticket>
        columns={[
          { header: "Ticket #", key: "number" },
          { header: "Subject", key: "subject" },
          { header: "Client", key: "clientId" },
          { header: "Dept", key: "departmentId" },
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
        emptyMessage="No tickets found."
        onRowClick={(row) => router.push(`/support/${row.id}`)}
        pagination={{ page, total, limit: 20, onPageChange: setPage }}
      />
    </div>
  );
}
