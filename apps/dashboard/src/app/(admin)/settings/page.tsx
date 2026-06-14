"use client";

import { useState } from "react";
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
import { apiClient } from "@/lib/api/client";
import { toast } from "@/components/ui/toaster";

interface Settings {
  companyName?: string;
  companyEmail?: string;
  defaultCurrency?: string;
  invoicePrefix?: string;
  invoiceDueDays?: number;
  gracePeriodDays?: number;
  suspensionDays?: number;
}

interface AutomationJob {
  id: string;
  name: string;
  enabled: boolean;
  lastRun?: string;
}

function SettingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [jobs, setJobs] = useState<AutomationJob[]>([]);

  useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const data = await apiClient.get<Settings>("/settings");
      setSettings(data);
      return data;
    },
  });

  useQuery({
    queryKey: ["automation-jobs"],
    queryFn: async () => {
      const data = await apiClient.get<AutomationJob[]>("/automation/jobs");
      setJobs(data);
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: Settings) => apiClient.patch("/settings", data),
    onSuccess: () => toast({ title: "Settings saved." }),
  });

  function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Configure your platform settings."
      />

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="email">Email Templates</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingField
                label="Company Name"
                value={settings.companyName ?? ""}
                onChange={(v) => setSetting("companyName", v)}
              />
              <SettingField
                label="Company Email"
                value={settings.companyEmail ?? ""}
                onChange={(v) => setSetting("companyEmail", v)}
              />
              <SettingField
                label="Default Currency"
                value={settings.defaultCurrency ?? "USD"}
                onChange={(v) => setSetting("defaultCurrency", v)}
              />
              <Button
                onClick={() => saveMutation.mutate(settings)}
                isLoading={saveMutation.isPending}
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingField
                label="Invoice Prefix"
                value={settings.invoicePrefix ?? "INV-"}
                onChange={(v) => setSetting("invoicePrefix", v)}
              />
              <div className="space-y-1">
                <Label>Invoice Due Days</Label>
                <Input
                  type="number"
                  value={settings.invoiceDueDays ?? 14}
                  onChange={(e) =>
                    setSetting("invoiceDueDays", Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Grace Period Days</Label>
                <Input
                  type="number"
                  value={settings.gracePeriodDays ?? 3}
                  onChange={(e) =>
                    setSetting("gracePeriodDays", Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Suspension Days (after due)</Label>
                <Input
                  type="number"
                  value={settings.suspensionDays ?? 7}
                  onChange={(e) =>
                    setSetting("suspensionDays", Number(e.target.value))
                  }
                />
              </div>
              <Button
                onClick={() => saveMutation.mutate(settings)}
                isLoading={saveMutation.isPending}
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Customise automated email templates. (Coming soon)
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>
                Manage admin roles and access. (Coming soon)
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No automation jobs configured.
                </p>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between rounded-md border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{job.name}</p>
                        {job.lastRun && (
                          <p className="text-xs text-muted-foreground">
                            Last run: {job.lastRun}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={job.enabled}
                          onCheckedChange={(v) =>
                            setJobs((prev) =>
                              prev.map((j) =>
                                j.id === job.id ? { ...j, enabled: v } : j,
                              ),
                            )
                          }
                        />
                        <Button variant="outline" size="sm">
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

        <TabsContent value="plugins" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Plugins</CardTitle>
              <CardDescription>
                Manage installed platform plugins. (Coming soon)
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
