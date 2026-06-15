"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Puzzle,
  Power,
  PowerOff,
  Settings,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Plus,
  Loader2,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { pluginsApi } from "@/lib/api/plugins";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toaster";

// ─── Manifest docs ────────────────────────────────────────────────────────────

const MANIFEST_EXAMPLE = `{
  "slug": "stripe-payment",
  "name": "Stripe Payment Gateway",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Accept payments via Stripe",
  "type": "payment",
  "configSchema": [
    { "key": "secretKey", "label": "Secret Key", "type": "string", "secret": true },
    { "key": "webhookSecret", "label": "Webhook Secret", "type": "string", "secret": true },
    { "key": "currency", "label": "Currency", "type": "string" }
  ]
}`;

const MANIFEST_FIELDS = [
  { field: "slug", req: true, desc: "Unique identifier (kebab-case)" },
  { field: "name", req: true, desc: "Display name" },
  { field: "version", req: true, desc: "SemVer string e.g. 1.0.0" },
  { field: "author", req: true, desc: "Author name or organisation" },
  { field: "description", req: false, desc: "Short description" },
  { field: "type", req: true, desc: "payment | provisioning | registrar | notification | widget | hook" },
  { field: "configSchema", req: false, desc: "Array of config field definitions" },
];

// ─── Install Dialog ───────────────────────────────────────────────────────────

function InstallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [json, setJson] = useState(MANIFEST_EXAMPLE);
  const [trustLevel, setTrustLevel] = useState<"verified" | "sandboxed">("sandboxed");
  const [showDocs, setShowDocs] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const installMutation = useMutation({
    mutationFn: (manifest: object) => pluginsApi.install({ manifest, trustLevel }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plugins"] });
      toast({ title: "Plugin installed." });
      onClose();
    },
    onError: (err: Error) => setError(err.message ?? "Installation failed"),
  });

  function handleInstall() {
    setError(null);
    setParseError(null);
    let manifest: object;
    try {
      manifest = JSON.parse(json);
    } catch (e: any) {
      setParseError("Invalid JSON: " + e.message);
      return;
    }
    installMutation.mutate(manifest);
  }

  function handleJsonChange(v: string) {
    setJson(v);
    setParseError(null);
    try { JSON.parse(v); } catch (e: any) { setParseError(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Install Plugin</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Docs toggle */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowDocs((v) => !v)}
            >
              <BookOpen className="h-4 w-4" />
              Plugin Manifest Reference
              {showDocs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showDocs && (
              <div className="mt-3 rounded-md border bg-muted/40 p-4 space-y-3 text-sm">
                <p className="font-semibold">Required manifest fields</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-1 pr-4">Field</th>
                      <th className="pb-1 pr-4">Required</th>
                      <th className="pb-1">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {MANIFEST_FIELDS.map((f) => (
                      <tr key={f.field}>
                        <td className="py-1 pr-4 font-mono text-foreground">{f.field}</td>
                        <td className="py-1 pr-4">
                          {f.req ? (
                            <span className="text-destructive font-semibold">Yes</span>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </td>
                        <td className="py-1 text-muted-foreground">{f.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div>
                  <p className="font-semibold mb-1">configSchema field format</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Each entry defines a configuration field shown in the Configure dialog.
                  </p>
                  <pre className="text-xs bg-background rounded p-2 overflow-x-auto">
{`{ "key": "apiKey", "label": "API Key", "type": "string", "secret": true }`}
                  </pre>
                  <p className="text-xs text-muted-foreground mt-1">
                    Types: <code>string</code> | <code>number</code> | <code>boolean</code> | <code>select</code>
                  </p>
                </div>

                <p className="font-semibold">Trust levels</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li><span className="text-foreground font-medium">Sandboxed</span> — Limited access to HOP internals (recommended)</li>
                  <li><span className="text-foreground font-medium">Verified</span> — Full trusted access, only for audited plugins</li>
                </ul>
              </div>
            )}
          </div>

          <Separator />

          {/* Trust level */}
          <div className="space-y-1.5">
            <Label>Trust Level</Label>
            <Select value={trustLevel} onValueChange={(v) => setTrustLevel(v as any)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandboxed">Sandboxed (recommended)</SelectItem>
                <SelectItem value="verified">Verified (trusted)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* JSON manifest editor */}
          <div className="space-y-1.5">
            <Label>Plugin Manifest (JSON) <span className="text-destructive">*</span></Label>
            <Textarea
              value={json}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={16}
              className="font-mono text-xs"
            />
            {parseError && (
              <p className="text-xs text-destructive">{parseError}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleInstall}
            disabled={installMutation.isPending || !!parseError}
          >
            {installMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Install Plugin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Configure Dialog ─────────────────────────────────────────────────────────

function ConfigureDialog({
  plugin,
  open,
  onClose,
}: {
  plugin: any;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const schema: Array<{ key: string; label: string; type: string; secret?: boolean; options?: string[] }> =
    plugin.manifest?.configSchema ?? [];
  const initialConfig: Record<string, string> = {};
  for (const field of schema) {
    initialConfig[field.key] = (plugin.config as any)?.[field.key] ?? "";
  }

  const [config, setConfig] = useState<Record<string, string>>(initialConfig);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      pluginsApi.updateConfig(
        plugin.slug,
        Object.fromEntries(Object.entries(config).filter(([, v]) => v !== "")),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plugins"] });
      toast({ title: "Configuration saved." });
      onClose();
    },
    onError: (err: Error) => setError(err.message ?? "Failed to save"),
  });

  function set(key: string, value: string) {
    setConfig((p) => ({ ...p, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure — {plugin.manifest?.name ?? plugin.slug}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {schema.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              This plugin has no configurable settings.
            </p>
          ) : (
            schema.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`cfg-${field.key}`}>
                  {field.label}
                  {field.secret && (
                    <span className="ml-2 text-xs text-muted-foreground">(secret)</span>
                  )}
                </Label>
                {field.type === "boolean" ? (
                  <Select value={config[field.key] || "false"} onValueChange={(v) => set(field.key, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : field.type === "select" && field.options ? (
                  <Select value={config[field.key]} onValueChange={(v) => set(field.key, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`cfg-${field.key}`}
                    type={field.secret ? "password" : field.type === "number" ? "number" : "text"}
                    value={config[field.key]}
                    onChange={(e) => set(field.key, e.target.value)}
                    placeholder={field.secret ? "••••••••" : field.label}
                  />
                )}
              </div>
            ))
          )}

          {error && (
            <p className="text-sm text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {schema.length > 0 && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status / type colors ─────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-gray-100 text-gray-600",
  Error: "bg-red-100 text-red-700",
};

const typeColors: Record<string, string> = {
  payment: "bg-purple-100 text-purple-700",
  provisioning: "bg-orange-100 text-orange-700",
  registrar: "bg-blue-100 text-blue-700",
  notification: "bg-yellow-100 text-yellow-700",
  widget: "bg-pink-100 text-pink-700",
  hook: "bg-gray-100 text-gray-700",
};

// ─── AdminPluginsPage ─────────────────────────────────────────────────────────

export default function AdminPluginsPage() {
  const qc = useQueryClient();
  const [installOpen, setInstallOpen] = useState(false);
  const [configurePlugin, setConfigurePlugin] = useState<any>(null);

  const { data: plugins = [], isLoading } = useQuery({
    queryKey: ["plugins"],
    queryFn: () => pluginsApi.list(),
  });

  const enableMutation = useMutation({
    mutationFn: (slug: string) => pluginsApi.enable(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plugins"] }),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const disableMutation = useMutation({
    mutationFn: (slug: string) => pluginsApi.disable(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plugins"] }),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const uninstallMutation = useMutation({
    mutationFn: (slug: string) => pluginsApi.uninstall(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plugins"] });
      toast({ title: "Plugin uninstalled." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plugin Manager</h1>
          <p className="text-muted-foreground mt-1">
            Install and manage HOP plugins. Plugins extend payment, provisioning, domain, and notification capabilities.
          </p>
        </div>
        <Button onClick={() => setInstallOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Install Plugin
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (plugins as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Puzzle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium text-lg">No plugins installed</p>
            <p className="text-sm text-muted-foreground mt-1">
              Install payment gateways, provisioning modules, and more by providing a plugin manifest.
            </p>
            <Button className="mt-4" onClick={() => setInstallOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Install Plugin
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(plugins as any[]).map((plugin: any) => (
            <Card key={plugin.id} className={plugin.status === "Error" ? "border-destructive/50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{plugin.manifest?.name ?? plugin.slug}</CardTitle>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[plugin.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {plugin.status}
                      </span>
                      {plugin.manifest?.type && (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[plugin.manifest.type] ?? "bg-gray-100 text-gray-700"}`}>
                          {plugin.manifest.type}
                        </span>
                      )}
                    </div>
                    <CardDescription className="mt-1 text-xs">
                      {plugin.manifest?.version && `v${plugin.manifest.version}`}
                      {plugin.manifest?.author && ` · by ${plugin.manifest.author}`}
                    </CardDescription>
                  </div>
                  {plugin.trustLevel === "verified" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 shrink-0">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 shrink-0">
                      <AlertCircle className="h-3.5 w-3.5" /> Sandboxed
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {plugin.manifest?.description && (
                  <p className="text-sm text-muted-foreground mb-4">{plugin.manifest.description}</p>
                )}
                {plugin.status === "Error" && plugin.errorMessage && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded p-2 mb-3">
                    {plugin.errorMessage}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {plugin.status === "Active" ? (
                    <Button variant="outline" size="sm" onClick={() => disableMutation.mutate(plugin.slug)} disabled={disableMutation.isPending}>
                      <PowerOff className="h-3.5 w-3.5 mr-1.5" /> Disable
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => enableMutation.mutate(plugin.slug)} disabled={enableMutation.isPending}>
                      <Power className="h-3.5 w-3.5 mr-1.5" /> Enable
                    </Button>
                  )}
                  {plugin.manifest?.configSchema?.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setConfigurePlugin(plugin)}>
                      <Settings className="h-3.5 w-3.5 mr-1.5" /> Configure
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => {
                      if (confirm(`Uninstall ${plugin.manifest?.name ?? plugin.slug}?`)) {
                        uninstallMutation.mutate(plugin.slug);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InstallDialog open={installOpen} onClose={() => setInstallOpen(false)} />
      {configurePlugin && (
        <ConfigureDialog
          plugin={configurePlugin}
          open={!!configurePlugin}
          onClose={() => setConfigurePlugin(null)}
        />
      )}
    </div>
  );
}
