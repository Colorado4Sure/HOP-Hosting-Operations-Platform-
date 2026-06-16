"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/features/PageHeader";
import { DataTable } from "@/components/features/DataTable";
import { InvoiceStatusBadge } from "@/components/features/InvoiceStatusBadge";
import { billingApi } from "@/lib/api/billing";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, Transaction } from "@hop/shared-types";

export default function PortalBillingPage() {
  const [invoicePage, setInvoicePage] = useState(1);
  const [txPage, setTxPage] = useState(1);

  const { data: invResponse, isLoading: invLoading } = useQuery({
    queryKey: ["portal-invoices", invoicePage],
    queryFn: () => billingApi.listInvoices({ page: invoicePage, perPage: 20 }),
  });

  const { data: txResponse, isLoading: txLoading } = useQuery({
    queryKey: ["portal-transactions", txPage],
    queryFn: () => billingApi.listTransactions({ page: txPage, perPage: 20 }),
  });

  const invoices = invResponse?.data ?? [];
  const invTotal = invResponse?.meta?.total ?? 0;
  const transactions = txResponse?.data ?? [];
  const txTotal = txResponse?.meta?.total ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing"
        description="Manage your invoices and payment history."
      />

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <DataTable<Invoice>
            columns={[
              { header: "Invoice #", key: "invoiceNumber" },
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
                header: "",
                key: "id",
                render: (_, row) =>
                row.status !== "Paid" && row.status !== "Cancelled" ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/portal/billing/pay/${row.id}`}>Pay Now</a>
                    </Button>
                  ) : null,
              },
            ]}
            data={invoices}
            isLoading={invLoading}
            emptyMessage="No invoices found."
            pagination={{
                    page: invoicePage,
                    total: invTotal,
                    limit: 20,
                    onPageChange: setInvoicePage,
                  }}
          />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <DataTable<Transaction>
            columns={[
              {
                header: "Date",
                key: "createdAt",
                render: (v) => formatDate(String(v)),
              },
              { header: "Description", key: "description" },
              {
                header: "Amount",
                key: "amount",
                render: (v) => formatCurrency(Number(v ?? 0), "USD"),
              },
              { header: "Type", key: "type" },
            ]}
            data={transactions}
            isLoading={txLoading}
            emptyMessage="No transactions."
            pagination={{
                    page: txPage,
                    total: txTotal,
                    limit: 20,
                    onPageChange: setTxPage,
                  }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
