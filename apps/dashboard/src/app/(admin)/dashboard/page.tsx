"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Users,
  DollarSign,
  Server,
  MessageSquare,
  Plus,
  FileText,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/features/DataTable";
import { InvoiceStatusBadge } from "@/components/features/InvoiceStatusBadge";
import { TicketStatusBadge } from "@/components/features/TicketStatusBadge";
import { PageHeader } from "@/components/features/PageHeader";
import { reportsApi } from "@/lib/api/reports";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["reports", "overview"],
    queryFn: reportsApi.getOverview,
  });

  const statCards = [
    {
      title: "Total Clients",
      value: overview?.totalClients ?? 0,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(overview?.monthlyRevenue ?? 0, "USD"),
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Active Services",
      value: overview?.activeServices ?? 0,
      icon: <Server className="h-4 w-4" />,
    },
    {
      title: "Open Tickets",
      value: overview?.openTickets ?? 0,
      icon: <MessageSquare className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back — here's what's happening."
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/billing/invoices/new">
                <FileText className="mr-1 h-4 w-4" />
                New Invoice
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/clients/new">
                <Plus className="mr-1 h-4 w-4" />
                New Client
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          : statCards.map((s) => <StatCard key={s.title} {...s} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/billing/invoices">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={[
                { header: "Invoice #", key: "number" },
                {
                  header: "Amount",
                  key: "total",
                  render: (v) => formatCurrency(Number(v), "USD"),
                },
                {
                  header: "Status",
                  key: "status",
                  render: (v) => <InvoiceStatusBadge status={String(v)} />,
                },
                {
                  header: "Due",
                  key: "dueDate",
                  render: (v) => formatDate(String(v)),
                },
              ]}
              data={(overview?.recentInvoices as never[]) ?? []}
              isLoading={isLoading}
              emptyMessage="No invoices yet."
            />
          </CardContent>
        </Card>

        {/* Recent tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Tickets</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/support">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={[
                { header: "Subject", key: "subject" },
                { header: "Priority", key: "priority" },
                {
                  header: "Status",
                  key: "status",
                  render: (v) => <TicketStatusBadge status={String(v)} />,
                },
              ]}
              data={(overview?.recentTickets as never[]) ?? []}
              isLoading={isLoading}
              emptyMessage="No tickets yet."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
