"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Loader2, Package, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/features/PageHeader";
import { billingApi } from "@/lib/api/billing";
import { clientsApi } from "@/lib/api/clients";
import { productsApi } from "@/lib/api/products";
import { formatCurrency } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

const BILLING_CYCLES = [
  "Monthly", "Quarterly", "Semi-Annually", "Annually", "Biennially", "Triennially",
];

const newLine = (): LineItem => ({ description: "", quantity: 1, unitPrice: 0 });

export default function NewInvoicePage() {
  const router = useRouter();

  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([newLine()]);
  const [error, setError] = useState<string | null>(null);

  // Recurring billing
  const [isRecurring, setIsRecurring] = useState(false);
  const [billingCycle, setBillingCycle] = useState("Monthly");
  const [nextDueDate, setNextDueDate] = useState("");

  // Product picker
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const { data: clientsData } = useQuery({
    queryKey: ["clients-select"],
    queryFn: () => clientsApi.listClients({ perPage: 200 }),
  });
  const clients = clientsData?.data ?? [];

  const { data: productsData } = useQuery({
    queryKey: ["products-invoice-select"],
    queryFn: () => productsApi.listProducts({ perPage: 200, status: "Active" }),
  });
  const products = productsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      billingApi.createInvoice({
        clientId,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        items,
        ...(isRecurring
          ? { isRecurring: true, billingCycle, nextDueDate: nextDueDate || undefined }
          : {}),
      } as any),
    onSuccess: (inv: any) => {
      router.push(`/billing/invoices/${inv.id}`);
    },
    onError: (err: Error) => {
      setError(err.message ?? "Failed to create invoice");
    },
  });

  const updateLine = (i: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const removeLine = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  /** Add a product as a prefilled line item */
  const addProductLine = (product: any) => {
    const prices = product.pricing ?? [];
    const price = prices.length > 0 ? prices[0].price : 0;
    setItems((prev) => [
      ...prev,
      { description: product.name, quantity: 1, unitPrice: price },
    ]);
    setProductPickerOpen(false);
    setProductSearch("");
  };

  const total = items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!clientId) { setError("Please select a client."); return; }
    if (items.some((it) => !it.description.trim())) {
      setError("All line items must have a description.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="New Invoice"
        description="Create a new invoice for a client."
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client & dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="client">
                Client <span className="text-destructive">*</span>
              </Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="client">
                  <SelectValue placeholder="Select a client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.companyName ? ` (${c.companyName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-48"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes / Terms</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, notes for the client…"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Recurring billing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              Recurring Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="recurring" className="cursor-pointer">
                Enable recurring billing
              </Label>
            </div>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="billingCycle">Billing Cycle</Label>
                  <Select value={billingCycle} onValueChange={setBillingCycle}>
                    <SelectTrigger id="billingCycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_CYCLES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nextDueDate">Next Due Date</Label>
                  <Input
                    id="nextDueDate"
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_100px_36px] gap-2 text-xs text-muted-foreground font-medium px-1">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span />
            </div>

            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-start">
                <Input
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) => updateLine(i, "description", e.target.value)}
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateLine(i, "quantity", Number(e.target.value))
                  }
                  className="text-right"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateLine(i, "unitPrice", Number(e.target.value))
                  }
                  className="text-right"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  disabled={items.length === 1}
                  onClick={() => removeLine(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItems((prev) => [...prev, newLine()])}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>

              {/* Product picker */}
              <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Package className="h-4 w-4 mr-1" />
                    Add from Products
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="start">
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search products…"
                      className="pl-7 h-8 text-sm"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {products
                      .filter((p) =>
                        p.name.toLowerCase().includes(productSearch.toLowerCase()),
                      )
                      .map((p) => {
                        const prices = (p as any).pricing ?? [];
                        const price = prices.length > 0 ? prices[0].price : null;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addProductLine(p)}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground text-sm transition-colors"
                          >
                            <span className="font-medium block">{p.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {price != null ? formatCurrency(price, "USD") : "No pricing"}
                            </span>
                          </button>
                        );
                      })}
                    {products.filter((p) =>
                      p.name.toLowerCase().includes(productSearch.toLowerCase()),
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground px-2 py-3 text-center">
                        No products found.
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(total, "USD")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Invoice
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
