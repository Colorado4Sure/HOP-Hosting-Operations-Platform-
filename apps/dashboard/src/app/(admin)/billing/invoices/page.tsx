"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/features/PageHeader";
import { DataTable } from "@/components/features/DataTable";
import { InvoiceStatusBadge } from "@/components/features/InvoiceStatusBadge";
import { billingApi } from "@/lib/api/billing";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@hop/shared-types";

export default function InvoicesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", page, search, status],
    queryFn: () =>
      billingApi.listInvoices({
        page,
        limit: 20,
        search: search || undefined,
        status: status !== "all" ? status : undefined,
      }),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        description="Manage client invoices and payments."
        action={
          <Button asChild>
            <a href="/billing/invoices/new">
              <Plus className="mr-1 h-4 w-4" />
              New Invoice
            </a>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices…"
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
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<Invoice>
        columns={[
          { header: "Invoice #", key: "invoiceNumber" },
          { header: "Client", key: "clientId" },
          {
            header: "Amount",
            key: "total",
            render: (v) => formatCurrency(Number(v ?? 0), "USD"),
          },
          {
            header: "Status",
            key: "status",
            render: (v) => <InvoiceStatusBadge status={String(v)} />,
          },
          {
            header: "Due Date",
            key: "dueDate",
            render: (v) => formatDate(String(v)),
          },
          {
            header: "Created",
            key: "createdAt",
            render: (v) => formatDate(String(v)),
          },
        ]}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="No invoices found."
        onRowClick={(row) => router.push(`/billing/invoices/${row.id}`)}
        pagination={
          data
            ? { page, total: data.total, limit: 20, onPageChange: setPage }
            : undefined
        }
      />
    </div>
  );
}
