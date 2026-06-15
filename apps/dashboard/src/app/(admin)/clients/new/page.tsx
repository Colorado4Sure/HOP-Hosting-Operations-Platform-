"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Eye, EyeOff, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/features/PageHeader";
import { clientsApi } from "@/lib/api/clients";
import type { Permission } from "@hop/shared-types";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "NGN"];
const USER_ROLES = ["Client", "Reseller", "Staff", "Admin", "SuperAdmin"];

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: "Clients", permissions: ["clients:read", "clients:create", "clients:update", "clients:delete"] },
  { label: "Invoices", permissions: ["invoices:read", "invoices:create", "invoices:update", "invoices:delete", "invoices:pay"] },
  { label: "Products", permissions: ["products:read", "products:create", "products:update", "products:delete"] },
  { label: "Domains", permissions: ["domains:read", "domains:register", "domains:transfer", "domains:renew"] },
  { label: "Support", permissions: ["support:read", "support:reply", "support:close", "support:assign"] },
  { label: "Reports", permissions: ["reports:read"] },
  { label: "Settings", permissions: ["settings:read", "settings:update"] },
];

function permLabel(perm: string): string {
  return perm.split(":")[1].replace(/^./, (c) => c.toUpperCase());
}

export default function NewClientPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    phone: "",
    currencyCode: "USD",
    role: "Client",
    password: "",
    customPermissions: [] as Permission[],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => clientsApi.createClient({
      ...form,
      password: form.password || undefined,
    } as any),
    onSuccess: (res: any) => {
      if (res.temporaryPassword) {
        setTempPassword(res.temporaryPassword);
      } else {
        router.push(`/clients/${res.id}`);
      }
    },
    onError: (err: Error) => {
      setError(err.message ?? "Failed to create client");
    },
  });

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function togglePerm(perm: Permission) {
    setForm((prev) => ({
      ...prev,
      customPermissions: prev.customPermissions.includes(perm)
        ? prev.customPermissions.filter((p) => p !== perm)
        : [...prev.customPermissions, perm],
    }));
  }

  function toggleGroup(perms: Permission[]) {
    const allOn = perms.every((p) => form.customPermissions.includes(p));
    setForm((prev) => ({
      ...prev,
      customPermissions: allOn
        ? prev.customPermissions.filter((p) => !perms.includes(p))
        : Array.from(new Set([...prev.customPermissions, ...perms])),
    }));
  }

  function copyPassword() {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError("First name, last name and email are required.");
      return;
    }
    createMutation.mutate();
  };

  // ── Success: show temp password ──────────────────────────────────────────
  if (tempPassword) {
    return (
      <div className="space-y-6 max-w-lg">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">Client Created</p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  A temporary password has been generated. Share it securely with the client.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-green-800 dark:text-green-300">Temporary Password</Label>
              <div className="flex gap-2">
                <Input value={tempPassword} readOnly className="font-mono bg-white dark:bg-black/20" />
                <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The client should change this password after first login.
              </p>
            </div>
            <Button onClick={() => router.push("/clients")}>
              Go to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="New Client"
        description="Create a new client account."
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                <Input id="firstName" value={form.firstName} onChange={(e) => set("firstName")(e.target.value)} placeholder="John" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                <Input id="lastName" value={form.lastName} onChange={(e) => set("lastName")(e.target.value)} placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" value={form.companyName} onChange={(e) => set("companyName")(e.target.value)} placeholder="Acme Ltd. (optional)" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+1 555 000 0000" />
            </div>
          </CardContent>
        </Card>

        {/* Account & Role */}
        <Card>
          <CardHeader><CardTitle className="text-base">Account & Access</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currencyCode} onValueChange={set("currencyCode")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={set("role")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password
                <span className="ml-2 text-xs text-muted-foreground">(leave blank to auto-generate)</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password")(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Separator />

            {/* Custom Permissions */}
            <div>
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setShowPerms((v) => !v)}
              >
                Custom Permissions
                <span className="text-xs text-muted-foreground">
                  ({form.customPermissions.length} selected — optional overrides)
                </span>
              </button>

              {showPerms && (
                <div className="mt-3 space-y-3 pl-2 border-l-2 border-muted">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupOn = group.permissions.every((p) => form.customPermissions.includes(p));
                    return (
                      <div key={group.label}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Checkbox
                            id={`grp-${group.label}`}
                            checked={groupOn}
                            onCheckedChange={() => toggleGroup(group.permissions)}
                          />
                          <Label htmlFor={`grp-${group.label}`} className="text-xs font-semibold uppercase tracking-wide cursor-pointer">
                            {group.label}
                          </Label>
                        </div>
                        <div className="ml-6 grid grid-cols-2 sm:grid-cols-3 gap-1">
                          {group.permissions.map((perm) => (
                            <div key={perm} className="flex items-center gap-1.5">
                              <Checkbox
                                id={`perm-${perm}`}
                                checked={form.customPermissions.includes(perm)}
                                onCheckedChange={() => togglePerm(perm)}
                              />
                              <Label htmlFor={`perm-${perm}`} className="text-xs text-muted-foreground cursor-pointer">
                                {permLabel(perm)}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Client
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
