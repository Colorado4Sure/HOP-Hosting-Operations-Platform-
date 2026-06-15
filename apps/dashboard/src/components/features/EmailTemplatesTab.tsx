"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { settingsApi } from "@/lib/api/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toaster";

// ─── Template variable docs ───────────────────────────────────────────────────

const VARIABLE_DOCS: Record<string, string> = {
  first_name: "Client's first name",
  last_name: "Client's last name",
  company_name: "Client's company name",
  email: "Client's email address",
  invoice_number: "Invoice number",
  invoice_amount: "Invoice total amount",
  invoice_due_date: "Invoice due date",
  payment_link: "Link to pay the invoice",
  verify_link: "Email verification link",
  reset_link: "Password reset link",
  domain_name: "Domain name",
  expiry_date: "Domain/service expiry date",
  ticket_number: "Support ticket number",
  ticket_subject: "Support ticket subject",
  support_link: "Link to the ticket",
};

// ─── Template Form Dialog ─────────────────────────────────────────────────────

interface TemplateDialogProps {
  mode: "create" | "edit";
  initial?: any;
  open: boolean;
  onClose: () => void;
}

function TemplateDialog({ mode, initial, open, onClose }: TemplateDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    subject: initial?.subject ?? "",
    bodyHtml: initial?.bodyHtml ?? "",
    bodyText: initial?.bodyText ?? "",
    variables: ((initial?.variables as string[]) ?? []).join(", "),
  });
  const [showVarDocs, setShowVarDocs] = useState(false);
  const [showTextBody, setShowTextBody] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSystem = initial?.isSystem ?? false;

  function set(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  const createMutation = useMutation({
    mutationFn: () =>
      settingsApi.createEmailTemplate({
        name: form.name,
        slug: form.slug,
        subject: form.subject,
        bodyHtml: form.bodyHtml,
        bodyText: form.bodyText || undefined,
        variables: form.variables
          ? form.variables.split(",").map((v) => v.trim()).filter(Boolean)
          : [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Template created." });
      onClose();
    },
    onError: (err: Error) => setError(err.message ?? "Failed to create template"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      settingsApi.updateEmailTemplate(initial!.id, {
        subject: form.subject,
        bodyHtml: form.bodyHtml,
        bodyText: form.bodyText || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Template saved." });
      onClose();
    },
    onError: (err: Error) => setError(err.message ?? "Failed to save template"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSave() {
    setError(null);
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.slug.trim()) { setError("Slug is required."); return; }
    if (!form.subject.trim()) { setError("Subject is required."); return; }
    if (!form.bodyHtml.trim()) { setError("HTML body is required."); return; }
    if (mode === "create") createMutation.mutate();
    else updateMutation.mutate();
  }

  // Insert variable at cursor in bodyHtml textarea
  function insertVar(v: string) {
    set("bodyHtml", form.bodyHtml + `{${v}}`);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Email Template" : isSystem ? "View Template" : "Edit Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isSystem && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" />
              System template — only subject and body can be edited.
            </div>
          )}

          {/* Name + Slug (create only) */}
          {mode === "create" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Welcome Email" />
              </div>
              <div className="space-y-1.5">
                <Label>Slug <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-1">(used in code)</span>
                </Label>
                <Input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="welcome-email"
                />
              </div>
            </div>
          )}

          {mode === "edit" && !isSystem && (
            <div className="space-y-1 pb-1">
              <p className="text-sm font-medium">{initial?.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{initial?.slug}</p>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <Label>Subject <span className="text-destructive">*</span></Label>
            <Input
              value={form.subject}
              onChange={(e) => set("subject", e.target.value)}
              placeholder="Your invoice {invoice_number} is ready"
              disabled={isSystem}
            />
          </div>

          {/* Variables */}
          {mode === "create" && (
            <div className="space-y-1.5">
              <Label>Variables <span className="text-xs text-muted-foreground">(comma-separated, e.g. first_name, invoice_number)</span></Label>
              <Input
                value={form.variables}
                onChange={(e) => set("variables", e.target.value)}
                placeholder="first_name, invoice_number, due_date"
              />
            </div>
          )}

          <Separator />

          {/* Variable reference */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowVarDocs((v) => !v)}
            >
              {showVarDocs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Available template variables (click to insert)
            </button>
            {showVarDocs && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(VARIABLE_DOCS).map(([key, desc]) => (
                  <button
                    key={key}
                    type="button"
                    title={desc}
                    disabled={isSystem}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs font-mono hover:bg-primary/10 hover:text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => insertVar(key)}
                  >
                    {"{" + key + "}"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* HTML Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>HTML Body <span className="text-destructive">*</span></Label>
              <button
                type="button"
                onClick={() => setPreview((p) => !p)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
            {preview ? (
              <div
                className="min-h-[200px] rounded-md border bg-white p-4 text-sm overflow-auto"
                dangerouslySetInnerHTML={{ __html: form.bodyHtml }}
              />
            ) : (
              <Textarea
                value={form.bodyHtml}
                onChange={(e) => set("bodyHtml", e.target.value)}
                rows={12}
                disabled={isSystem}
                className="font-mono text-xs"
                placeholder="<p>Hello {first_name},</p><p>Your invoice is ready.</p>"
              />
            )}
          </div>

          {/* Text Body */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowTextBody((v) => !v)}
            >
              {showTextBody ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Plain-text fallback (optional)
            </button>
            {showTextBody && (
              <Textarea
                className="mt-2 font-mono text-xs"
                value={form.bodyText}
                onChange={(e) => set("bodyText", e.target.value)}
                rows={6}
                disabled={isSystem}
                placeholder="Hello {first_name}, your invoice is ready."
              />
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isSystem ? "Close" : "Cancel"}
          </Button>
          {!isSystem && (
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Template" : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── EmailTemplatesTab ────────────────────────────────────────────────────────

export function EmailTemplatesTab() {
  const qc = useQueryClient();
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any>(undefined);

  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["email-templates"],
    queryFn: () => settingsApi.getEmailTemplates() as Promise<any[]>,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteEmailTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Template deleted." });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function openCreate() {
    setEditTemplate(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  }

  function openEdit(tpl: any) {
    setEditTemplate(tpl);
    setDialogMode("edit");
    setDialogOpen(true);
  }

  function handleDelete(tpl: any) {
    if (tpl.isSystem) { toast({ title: "Cannot delete system templates.", variant: "destructive" }); return; }
    if (!confirm(`Delete template "${tpl.name}"?`)) return;
    deleteMutation.mutate(tpl.id);
  }

  const systemTemplates = templates.filter((t) => t.isSystem);
  const customTemplates = templates.filter((t) => !t.isSystem);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage email templates used by automation jobs and system notifications.
          Use <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{"{variable}"}</span> syntax in subject and body.
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* System Templates */}
          {systemTemplates.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                System Templates
              </p>
              <div className="space-y-1">
                {systemTemplates.map((tpl) => (
                  <TemplateRow key={tpl.id} tpl={tpl} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Custom Templates */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
              Custom Templates
            </p>
            {customTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border rounded-md bg-muted/20">
                <Mail className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No custom templates yet</p>
                <Button size="sm" className="mt-3" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {customTemplates.map((tpl) => (
                  <TemplateRow key={tpl.id} tpl={tpl} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <TemplateDialog
        key={dialogOpen ? (editTemplate?.id ?? "new") : "closed"}
        mode={dialogMode}
        initial={editTemplate}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

function TemplateRow({
  tpl,
  onEdit,
  onDelete,
}: {
  tpl: any;
  onEdit: (t: any) => void;
  onDelete: (t: any) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{tpl.name}</span>
          {tpl.isSystem && (
            <Badge variant="secondary" className="text-xs">System</Badge>
          )}
          <span className="font-mono text-xs text-muted-foreground bg-muted px-1 rounded">
            {tpl.slug}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
          Subject: {tpl.subject}
        </p>
        {tpl.variables?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(tpl.variables as string[]).map((v: string) => (
              <span key={v} className="font-mono text-xs bg-muted px-1 rounded text-muted-foreground">
                {"{" + v + "}"}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 ml-4 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(tpl)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {!tpl.isSystem && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(tpl)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
