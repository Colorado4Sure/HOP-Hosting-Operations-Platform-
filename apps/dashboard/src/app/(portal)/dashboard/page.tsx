"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MessageSquare, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/features/PageHeader";
import { DataTable } from "@/components/features/DataTable";
import { InvoiceStatusBadge } from "@/components/features/InvoiceStatusBadge";
import { ServiceStatusBadge } from "@/components/features/ServiceStatusBadge";
import { TicketStatusBadge } from "@/components/features/TicketStatusBadge";
import { reportsApi } from "@/lib/api/reports";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PortalDashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["portal", "overview"],
    queryFn: reportsApi.getOverview,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Dashboard"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/billing">
                <CreditCard className="mr-1 h-4 w-4" />
                Pay Invoice
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/portal/support/new">
                <MessageSquare className="mr-1 h-4 w-4" />
                Open Ticket
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Active Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {overview?.activeServices ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Open Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {overview?.openTickets ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Credit Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(0, "USD")}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Active Services</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/portal/services">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={[
                { header: "Product", key: "productName" },
                {
                  header: "Status",
                  key: "status",
                  render: (v) => <ServiceStatusBadge status={String(v)} />,
                },
                {
                  header: "Next Due",
                  key: "nextDueDate",
                  render: (v) => formatDate(String(v)),
                },
              ]}
              data={[]}
              isLoading={isLoading}
              emptyMessage="No active services."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Due / Overdue Invoices</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/portal/billing">View all</Link>
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
              emptyMessage="No outstanding invoices."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recent Tickets</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/portal/support">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={[
              { header: "Subject", key: "subject" },
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
            data={(overview?.recentTickets as never[]) ?? []}
            isLoading={isLoading}
            emptyMessage="No tickets."
          />
        </CardContent>
      </Card>
    </div>
  );
}
