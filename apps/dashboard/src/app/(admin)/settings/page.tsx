"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/features/PageHeader";
import { RolesTab } from "@/components/features/RolesTab";
import { EmailTemplatesTab } from "@/components/features/EmailTemplatesTab";
import { UsersTab } from "@/components/features/UsersTab";
import { settingsApi } from "@/lib/api/settings";
import { apiClient } from "@/lib/api/client";
import { toast } from "@/components/ui/toaster";
import { Loader2, Upload } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SettingsMap = Record<string, string>;

function toMap(arr: any[]): SettingsMap {
  const out: SettingsMap = {};
  for (const item of arr) {
    if (item.key) out[item.key] = item.value ?? "";
  }
  return out;
}

function toEntries(map: SettingsMap, group: string) {
  return Object.entries(map).map(([key, value]) => ({ key, value, group }));
}

// ─── ImageUploader ────────────────────────────────────────────────────────────

function ImageUploader({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-3 items-start">
        {value && (
          <img
            src={value}
            alt={label}
            className="h-12 w-auto rounded border bg-muted object-contain p-1 shrink-0"
          />
        )}
        <div className="flex-1 space-y-1.5">
          <Input
            placeholder="https://example.com/logo.png or upload a file"
            value={value.startsWith("data:") ? "(uploaded file)" : value}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => ref.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload File
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onChange("")}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

interface AutomationJob {
  id: string;
  name: string;
  enabled: boolean;
  lastRun?: string;
}

export default function SettingsPage() {
  const [general, setGeneral] = useState<SettingsMap>({
    "general.companyName": "",
    "general.companyEmail": "",
    "general.defaultCurrency": "USD",
    "general.timezone": "UTC",
    "branding.logoUrl": "",
    "branding.faviconUrl": "",
  });

  const [billing, setBilling] = useState<SettingsMap>({
    "billing.invoicePrefix": "INV-",
    "billing.invoiceDueDays": "14",
    "billing.gracePeriodDays": "3",
    "billing.suspensionDays": "7",
  });

  const [jobs, setJobs] = useState<AutomationJob[]>([]);

  useQuery({
    queryKey: ["settings-all"],
    queryFn: async () => {
      const data = await settingsApi.getAll();
      const map = toMap(data as any);
      setGeneral((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(map).filter(
            ([k]) => k.startsWith("general.") || k.startsWith("branding."),
          ),
        ),
      }));
      setBilling((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(map).filter(([k]) => k.startsWith("billing.")),
        ),
      }));
      return data;
    },
    staleTime: 60_000,
  });

  useQuery({
    queryKey: ["automation-jobs"],
    queryFn: async () => {
      const data = await apiClient.get<AutomationJob[]>("/automation/jobs");
      setJobs(Array.isArray(data) ? data : []);
      return data;
    },
  });

  const saveGeneralMutation = useMutation({
    mutationFn: () =>
      settingsApi.update([
        ...toEntries(
          Object.fromEntries(
            Object.entries(general).filter(([k]) => k.startsWith("general.")),
          ),
          "general",
        ),
        { key: "branding.logoUrl", value: general["branding.logoUrl"] ?? "", group: "branding" },
        { key: "branding.faviconUrl", value: general["branding.faviconUrl"] ?? "", group: "branding" },
      ]),
    onSuccess: () => toast({ title: "General settings saved." }),
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveBillingMutation = useMutation({
    mutationFn: () => settingsApi.update(toEntries(billing, "billing")),
    onSuccess: () => toast({ title: "Billing settings saved." }),
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function setG(key: string) {
    return (value: string) => setGeneral((p) => ({ ...p, [key]: value }));
  }
  function setGe(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setGeneral((p) => ({ ...p, [key]: e.target.value }));
  }
  function setB(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setBilling((p) => ({ ...p, [key]: e.target.value }));
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Configure your platform settings." />

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="email">Email Templates</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Company Name</Label>
                  <Input value={general["general.companyName"]} onChange={setGe("general.companyName")} placeholder="Acme Hosting Ltd." />
                </div>
                <div className="space-y-1.5">
                  <Label>Company Email</Label>
                  <Input type="email" value={general["general.companyEmail"]} onChange={setGe("general.companyEmail")} placeholder="billing@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Default Currency</Label>
                  <Input value={general["general.defaultCurrency"]} onChange={setGe("general.defaultCurrency")} placeholder="USD" />
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Input value={general["general.timezone"]} onChange={setGe("general.timezone")} placeholder="UTC" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Upload or link your logo and favicon. Supports PNG, SVG, ICO, JPG.
                Files are encoded and stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUploader
                label="Logo"
                value={general["branding.logoUrl"]}
                onChange={setG("branding.logoUrl")}
              />
              <ImageUploader
                label="Favicon"
                value={general["branding.faviconUrl"]}
                onChange={setG("branding.faviconUrl")}
              />
            </CardContent>
          </Card>

          <Button onClick={() => saveGeneralMutation.mutate()} disabled={saveGeneralMutation.isPending}>
            {saveGeneralMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </TabsContent>

        {/* ── Billing ── */}
        <TabsContent value="billing" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Billing Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Invoice Prefix</Label>
                  <Input value={billing["billing.invoicePrefix"]} onChange={setB("billing.invoicePrefix")} placeholder="INV-" />
                </div>
                <div className="space-y-1.5">
                  <Label>Invoice Due Days</Label>
                  <Input type="number" value={billing["billing.invoiceDueDays"]} onChange={setB("billing.invoiceDueDays")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Grace Period Days</Label>
                  <Input type="number" value={billing["billing.gracePeriodDays"]} onChange={setB("billing.gracePeriodDays")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Suspension Days (after due)</Label>
                  <Input type="number" value={billing["billing.suspensionDays"]} onChange={setB("billing.suspensionDays")} />
                </div>
              </div>
              <Button onClick={() => saveBillingMutation.mutate()} disabled={saveBillingMutation.isPending}>
                {saveBillingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email Templates ── */}
        <TabsContent value="email" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Manage templates used by automation and system events. Use{" "}
                <code className="bg-muted px-1 rounded text-xs">{"{variable}"}</code> syntax.
                System templates can be edited but not deleted.
              </CardDescription>
            </CardHeader>
            <CardContent><EmailTemplatesTab /></CardContent>
          </Card>
        </TabsContent>

        {/* ── Roles ── */}
        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>
                Define roles and assign granular permissions to control staff access.
              </CardDescription>
            </CardHeader>
            <CardContent><RolesTab /></CardContent>
          </Card>
        </TabsContent>

        {/* ── Users ── */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View all users, update their role, set custom capability overrides, or suspend accounts.
              </CardDescription>
            </CardHeader>
            <CardContent><UsersTab /></CardContent>
          </Card>
        </TabsContent>

        {/* ── Automation ── */}
        <TabsContent value="automation" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Automation Jobs</CardTitle></CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No automation jobs configured.</p>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{job.name}</p>
                        {job.lastRun && (
                          <p className="text-xs text-muted-foreground">
                            Last run: {new Date(job.lastRun).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={job.enabled}
                          onCheckedChange={(v) =>
                            setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, enabled: v } : j))
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            apiClient
                              .post(`/automation/jobs/${job.id}/run`, {})
                              .then(() => toast({ title: `${job.name} triggered.` }))
                              .catch((err: Error) =>
                                toast({ title: "Error", description: err.message, variant: "destructive" }),
                              )
                          }
                        >
                          Run Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
