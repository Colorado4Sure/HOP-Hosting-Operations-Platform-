"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/features/PageHeader";
import { DataTable } from "@/components/features/DataTable";
import { clientsApi } from "@/lib/api/clients";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client } from "@hop/shared-types";

const statusVariantMap: Record<
  string,
  "success" | "destructive" | "secondary" | "warning"
> = {
  active: "success",
  suspended: "destructive",
  inactive: "secondary",
  pending: "warning",
};

export default function ClientsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data: response, isLoading } = useQuery({
    queryKey: ["clients", page, search, status],
    queryFn: () =>
      clientsApi.listClients({
        page,
        perPage: 20,
        search: search || undefined,
        status: status !== "all" ? status : undefined,
      }),
  });

  const clients = response?.data ?? [];
  const total = response?.meta?.total ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        description="Manage your client accounts."
        action={
          <Button asChild>
            <a href="/clients/new">
              <Plus className="mr-1 h-4 w-4" />
              New Client
            </a>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<Client>
        columns={[
          {
            header: "Name",
            key: "firstName",
            render: (_, row) =>
              `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim(),
          },
          { header: "Email", key: "email" },
          {
            header: "Status",
            key: "status",
            render: (v) => (
              <Badge variant={statusVariantMap[String(v)] ?? "secondary"}>
                {String(v)}
              </Badge>
            ),
          },
          {
            header: "Credit",
            key: "creditBalance",
            render: (v) => formatCurrency(Number(v ?? 0), "USD"),
          },
          {
            header: "Created",
            key: "createdAt",
            render: (v) => formatDate(String(v)),
          },
        ]}
        data={clients}
        isLoading={isLoading}
        emptyMessage="No clients found."
        onRowClick={(row) => router.push(`/clients/${row.id}`)}
        pagination={{ page, total, limit: 20, onPageChange: setPage }}
      />
    </div>
  );
}
