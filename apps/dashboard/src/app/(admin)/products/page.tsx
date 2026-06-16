"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Search,
  Trash2,
  Loader2,
  FolderOpen,
  Layers,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { productsApi, type CreateProductPayload, type ProductGroup } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";

const PRODUCT_TYPES = ["Shared", "Reseller", "VPS", "Dedicated", "Domain", "SSL", "Other"];
const BILLING_CYCLES = ["Monthly", "Quarterly", "Semi-Annually", "Annually", "Biennially", "Triennially"];

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  Hidden: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const emptyProduct = () => ({
  name: "", description: "", type: "Shared", status: "Active",
  groupId: "", basePrice: "", billingCycle: "Monthly",
});

const emptyGroup = () => ({ name: "", headline: "", description: "" });

export default function AdminProductsPage() {
  const qc = useQueryClient();

  // filters
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");

  // dialogs
  const [productOpen, setProductOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState<string | null>(null); // product id

  // forms
  const [productForm, setProductForm] = useState(emptyProduct());
  const [groupForm, setGroupForm] = useState(emptyGroup());
  const [pricingForm, setPricingForm] = useState({ billingCycle: "Monthly", currency: "USD", price: "", setupFee: "" });
  const [productError, setProductError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // â”€â”€ Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["product-groups"],
    queryFn: () => productsApi.listProductGroups(),
  });

  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products", search, selectedGroupId],
    queryFn: () =>
      productsApi.listProducts({
        search: search || undefined,
        groupId: selectedGroupId !== "all" ? selectedGroupId : undefined,
        perPage: 100,
      }),
  });

  const products = productsResponse?.data ?? [];

  // â”€â”€ Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const createGroupMutation = useMutation({
    mutationFn: () => productsApi.createProductGroup(groupForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-groups"] });
      setGroupOpen(false);
      setGroupForm(emptyGroup());
      setGroupError(null);
    },
    onError: (e: Error) => setGroupError(e.message),
  });

  const createProductMutation = useMutation({
    mutationFn: () => {
      const payload: CreateProductPayload = {
        name: productForm.name,
        description: productForm.description || undefined,
        type: productForm.type,
        status: productForm.status,
        groupId: productForm.groupId || undefined,
      };
      if (productForm.basePrice) {
        payload.pricing = [{
          billingCycle: productForm.billingCycle,
          currency: "USD",
          price: parseFloat(productForm.basePrice),
        }];
      }
      return productsApi.createProduct(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setProductOpen(false);
      setProductForm(emptyProduct());
      setProductError(null);
    },
    onError: (e: Error) => setProductError(e.message),
  });

  const addPricingMutation = useMutation({
    mutationFn: (productId: string) =>
      productsApi.addPricing(productId, {
        billingCycle: pricingForm.billingCycle,
        currency: pricingForm.currency,
        price: parseFloat(pricingForm.price),
        setupFee: pricingForm.setupFee ? parseFloat(pricingForm.setupFee) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setPricingOpen(null);
      setPricingForm({ billingCycle: "Monthly", currency: "USD", price: "", setupFee: "" });
      setPricingError(null);
    },
    onError: (e: Error) => setPricingError(e.message),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => productsApi.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const isLoading = groupsLoading || productsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products & Pricing</h1>
          <p className="text-muted-foreground mt-1">Manage hosting plans, addons, and pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setGroupOpen(true)}>
            <FolderOpen className="h-4 w-4 mr-2" />
            New Group
          </Button>
          <Button onClick={() => setProductOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-6">
        {/* â”€â”€ Groups sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 mb-2">
            Groups
          </p>
          <button
            onClick={() => setSelectedGroupId("all")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedGroupId === "all"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground hover:text-accent-foreground"
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            All Products
            <span className="ml-auto text-xs opacity-70">{productsResponse?.meta?.total ?? 0}</span>
          </button>

          {groupsLoading ? (
            <div className="space-y-1 px-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-2">No groups yet</p>
          ) : (
            groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedGroupId === g.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground hover:text-accent-foreground"
                }`}
              >
                <ChevronRight className="h-4 w-4 shrink-0" />
                <span className="truncate">{g.name}</span>
              </button>
            ))
          )}
        </div>

        {/* â”€â”€ Products list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search productsâ€¦"
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); }}
            />
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No products found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedGroupId !== "all" ? "No products in this group." : "Create your first product to start selling."}
                  </p>
                  <Button className="mt-4" size="sm" onClick={() => setProductOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {products.map((product) => {
                    const prices = product.pricing ?? [];
                    const minPrice = prices.length > 0
                      ? Math.min(...prices.map((p) => p.price))
                      : null;
                    return (
                      <div key={product.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{product.name}</span>
                            <Badge className={`text-xs ${statusColors[product.status] ?? ""}`}>
                              {product.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">{product.type}</Badge>
                            {product.group && (
                              <Badge variant="secondary" className="text-xs">{product.group.name}</Badge>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-lg">{product.description}</p>
                          )}
                          {/* Pricing pills */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {prices.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">No pricing set</span>
                            ) : (
                              prices.map((pr) => (
                                <span key={pr.id} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                                  <DollarSign className="h-3 w-3" />
                                  {formatCurrency(pr.price, pr.currency)} / {pr.billingCycle}
                                  {pr.setupFee ? ` + ${formatCurrency(pr.setupFee, pr.currency)} setup` : ""}
                                </span>
                              ))
                            )}
                            <button
                              onClick={() => setPricingOpen(product.id)}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Plus className="h-3 w-3" /> Add price
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm(`Delete "${product.name}"?`)) deleteProductMutation.mutate(product.id); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* â”€â”€ Create Group Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Product Group</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="g-name">Name <span className="text-destructive">*</span></Label>
              <Input id="g-name" value={groupForm.name}
                onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Shared Hosting" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-headline">Headline</Label>
              <Input id="g-headline" value={groupForm.headline}
                onChange={(e) => setGroupForm((p) => ({ ...p, headline: e.target.value }))}
                placeholder="Short tagline shown to clients" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-desc">Description</Label>
              <Textarea id="g-desc" rows={3} value={groupForm.description}
                onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe this product groupâ€¦" />
            </div>
            {groupError && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded">{groupError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!groupForm.name.trim()) { setGroupError("Name is required."); return; } createGroupMutation.mutate(); }} disabled={createGroupMutation.isPending}>
              {createGroupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Create Product Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name <span className="text-destructive">*</span></Label>
              <Input id="p-name" value={productForm.name}
                onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Starter Shared Hosting" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" rows={2} value={productForm.description}
                onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief descriptionâ€¦" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Group</Label>
                <Select value={productForm.groupId || "none"}
                  onValueChange={(v) => setProductForm((p) => ({ ...p, groupId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="No group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No group</SelectItem>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={productForm.type} onValueChange={(v) => setProductForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={productForm.status} onValueChange={(v) => setProductForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Base Price (USD)</Label>
                <Input id="p-price" type="number" min={0} step="0.01"
                  value={productForm.basePrice}
                  onChange={(e) => setProductForm((p) => ({ ...p, basePrice: e.target.value }))}
                  placeholder="9.99" />
              </div>
              <div className="space-y-1.5">
                <Label>Billing Cycle</Label>
                <Select value={productForm.billingCycle} onValueChange={(v) => setProductForm((p) => ({ ...p, billingCycle: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {productError && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded">{productError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!productForm.name.trim()) { setProductError("Name is required."); return; } createProductMutation.mutate(); }} disabled={createProductMutation.isPending}>
              {createProductMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Add Pricing Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={!!pricingOpen} onOpenChange={(o) => { if (!o) { setPricingOpen(null); setPricingError(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Pricing Tier</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Billing Cycle</Label>
              <Select value={pricingForm.billingCycle} onValueChange={(v) => setPricingForm((p) => ({ ...p, billingCycle: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pr-price">Price <span className="text-destructive">*</span></Label>
                <Input id="pr-price" type="number" min={0} step="0.01"
                  value={pricingForm.price}
                  onChange={(e) => setPricingForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="9.99" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr-setup">Setup Fee</Label>
                <Input id="pr-setup" type="number" min={0} step="0.01"
                  value={pricingForm.setupFee}
                  onChange={(e) => setPricingForm((p) => ({ ...p, setupFee: e.target.value }))}
                  placeholder="0.00" />
              </div>
            </div>
            {pricingError && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded">{pricingError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingOpen(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!pricingForm.price) { setPricingError("Price is required."); return; }
              if (pricingOpen) addPricingMutation.mutate(pricingOpen);
            }} disabled={addPricingMutation.isPending}>
              {addPricingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
