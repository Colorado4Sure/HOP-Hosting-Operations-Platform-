"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Server,
  Plus,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { servicesApi } from "@/lib/api/services";
import { clientsApi } from "@/lib/api/clients";
import { productsApi } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Suspended: "bg-red-100 text-red-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Terminated: "bg-gray-100 text-gray-600",
  Cancelled: "bg-gray-100 text-gray-600",
};

const BILLING_CYCLES = [
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "SemiAnnually", label: "Semi-Annually" },
  { value: "Annually", label: "Annually" },
  { value: "Biennially", label: "Biennially" },
];

export default function AdminServicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientId: "",
    productId: "",
    billingCycle: "Monthly",
    nextDueDate: "",
    notes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-services", page, statusFilter],
    queryFn: () =>
      servicesApi.list({
        page,
        perPage: 25,
        status: statusFilter !== "all" ? statusFilter : undefined,
      }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients-select"],
    queryFn: () => clientsApi.listClients({ limit: 200 }),
    enabled: open,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-select"],
    queryFn: () => productsApi.listProducts({ limit: 200 }),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => servicesApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      setOpen(false);
      setForm({ clientId: "", productId: "", billingCycle: "Monthly", nextDueDate: "", notes: "" });
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message ?? "Failed to create service");
    },
  });

  const services: any[] = (data as any)?.data ?? [];
  const clients = clientsData?.data ?? [];
  const products = (productsData as any)?.data ?? [];

  const filtered = search
    ? services.filter(
        (s) =>
          s.domain?.toLowerCase().includes(search.toLowerCase()) ||
          s.client?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
          s.client?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
          s.product?.name?.toLowerCase().includes(search.toLowerCase()),
      )
    : services;

  const handleCreate = () => {
    setError(null);
    if (!form.clientId) { setError("Please select a client."); return; }
    if (!form.productId) { setError("Please select a product."); return; }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground mt-1">
            Manage all client hosting services
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by domain, client, product…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Terminated">Terminated</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_120px_120px] gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Client / Product</span>
            <span>Domain</span>
            <span>Status</span>
            <span>Next Due</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Server className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No services found</p>
              <p className="text-sm text-muted-foreground mb-4">
                {search ? "Try a different search term" : "Create the first service to get started"}
              </p>
              {!search && (
                <Button size="sm" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((svc) => (
                <div
                  key={svc.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_120px] gap-2 px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {svc.client?.firstName} {svc.client?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{svc.product?.name}</p>
                  </div>
                  <p className="text-sm self-center">{svc.domain ?? "—"}</p>
                  <div className="self-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[svc.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {svc.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground self-center">
                    {svc.nextDueDate
                      ? new Date(svc.nextDueDate).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Service Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="svc-client">
                Client <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
              >
                <SelectTrigger id="svc-client">
                  <SelectValue placeholder="Select client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.companyName ? ` · ${c.companyName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-product">
                Product <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.productId}
                onValueChange={(v) => setForm((p) => ({ ...p, productId: v }))}
              >
                <SelectTrigger id="svc-product">
                  <SelectValue placeholder="Select product…" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((pr: any) => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-cycle">Billing Cycle</Label>
              <Select
                value={form.billingCycle}
                onValueChange={(v) => setForm((p) => ({ ...p, billingCycle: v }))}
              >
                <SelectTrigger id="svc-cycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-due">Next Due Date</Label>
              <Input
                id="svc-due"
                type="date"
                value={form.nextDueDate}
                onChange={(e) => setForm((p) => ({ ...p, nextDueDate: e.target.value }))}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
