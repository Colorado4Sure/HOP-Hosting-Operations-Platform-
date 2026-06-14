"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, DollarSign, XCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/features/PageHeader";
import { InvoiceStatusBadge } from "@/components/features/InvoiceStatusBadge";
import { DataTable } from "@/components/features/DataTable";
import { billingApi } from "@/lib/api/billing";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [payDialog, setPayDialog] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("manual");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => billingApi.getInvoice(id),
  });

  const sendInvoice = useMutation({
    mutationFn: () => billingApi.sendInvoice(id),
  });

  const recordPayment = useMutation({
    mutationFn: () =>
      billingApi.recordPayment(id, {
        amount: Number(payAmount),
        method: payMethod,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      setPayDialog(false);
    },
  });

  const cancelInvoice = useMutation({
    mutationFn: () => billingApi.cancelInvoice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoice", id] }),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!invoice)
    return <p className="text-muted-foreground">Invoice not found.</p>;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Invoice #${invoice.number ?? id}`}
        description={`Created ${formatDate(invoice.createdAt)}`}
        action={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendInvoice.mutate()}
              isLoading={sendInvoice.isPending}
            >
              <Send className="mr-1 h-4 w-4" />
              Send
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPayDialog(true)}
            >
              <DollarSign className="mr-1 h-4 w-4" />
              Record Payment
            </Button>
            <Button variant="outline" size="sm" onClick={() => {}}>
              <Printer className="mr-1 h-4 w-4" />
              Print
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => cancelInvoice.mutate()}
              isLoading={cancelInvoice.isPending}
            >
              <XCircle className="mr-1 h-4 w-4" />
              Cancel
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <InvoiceStatusBadge status={invoice.status} />
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={[
                { header: "Description", key: "description" },
                { header: "Qty", key: "quantity" },
                {
                  header: "Unit Price",
                  key: "unitPrice",
                  render: (v) => formatCurrency(Number(v), "USD"),
                },
                {
                  header: "Total",
                  key: "total",
                  render: (v) => formatCurrency(Number(v), "USD"),
                },
              ]}
              data={
                (invoice as unknown as { lineItems?: never[] }).lineItems ?? []
              }
              emptyMessage="No line items."
            />
            <div className="border-t px-4 py-3 text-right text-sm font-semibold">
              Total: {formatCurrency(Number(invoice.total ?? 0), "USD")}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span>{formatDate(invoice.dueDate ?? "")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Due</span>
                <span className="font-semibold">
                  {formatCurrency(
                    Number(invoice.amountDue ?? invoice.total ?? 0),
                    "USD",
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label>Method</Label>
              <Input
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                placeholder="e.g. bank transfer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordPayment.mutate()}
              isLoading={recordPayment.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
