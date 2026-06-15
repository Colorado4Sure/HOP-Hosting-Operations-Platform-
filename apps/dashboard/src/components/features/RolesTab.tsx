"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { settingsApi } from "@/lib/api/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
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
import type { Permission, Role } from "@hop/shared-types";

// ─── Permission groups ────────────────────────────────────────────────────────

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Clients",
    permissions: [
      "clients:read",
      "clients:create",
      "clients:update",
      "clients:delete",
    ],
  },
  {
    label: "Invoices",
    permissions: [
      "invoices:read",
      "invoices:create",
      "invoices:update",
      "invoices:delete",
      "invoices:pay",
    ],
  },
  {
    label: "Products",
    permissions: [
      "products:read",
      "products:create",
      "products:update",
      "products:delete",
    ],
  },
  {
    label: "Servers",
    permissions: [
      "servers:read",
      "servers:provision",
      "servers:suspend",
      "servers:terminate",
    ],
  },
  {
    label: "Domains",
    permissions: [
      "domains:read",
      "domains:register",
      "domains:transfer",
      "domains:renew",
    ],
  },
  {
    label: "Support",
    permissions: [
      "support:read",
      "support:reply",
      "support:close",
      "support:assign",
    ],
  },
  {
    label: "Reports",
    permissions: ["reports:read"],
  },
  {
    label: "Settings",
    permissions: ["settings:read", "settings:update"],
  },
  {
    label: "Plugins",
    permissions: ["plugins:manage"],
  },
  {
    label: "Affiliates",
    permissions: ["affiliates:read", "affiliates:manage"],
  },
];

const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap(
  (g) => g.permissions,
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function permLabel(perm: Permission): string {
  const [, action] = perm.split(":");
  return action.charAt(0).toUpperCase() + action.slice(1);
}

// ─── Permission Matrix ────────────────────────────────────────────────────────

function PermissionMatrix({
  selected,
  onChange,
  disabled,
}: {
  selected: Permission[];
  onChange: (perms: Permission[]) => void;
  disabled?: boolean;
}) {
  const toggle = (perm: Permission) => {
    if (disabled) return;
    onChange(
      selected.includes(perm)
        ? selected.filter((p) => p !== perm)
        : [...selected, perm],
    );
  };

  const toggleGroup = (perms: Permission[]) => {
    if (disabled) return;
    const allOn = perms.every((p) => selected.includes(p));
    if (allOn) {
      onChange(selected.filter((p) => !perms.includes(p)));
    } else {
      const merged = Array.from(new Set([...selected, ...perms]));
      onChange(merged);
    }
  };

  const toggleAll = () => {
    if (disabled) return;
    if (selected.length === ALL_PERMISSIONS.length) {
      onChange([]);
    } else {
      onChange([...ALL_PERMISSIONS]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Select all */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <Checkbox
          id="perm-all"
          checked={selected.length === ALL_PERMISSIONS.length}
          onCheckedChange={toggleAll}
          disabled={disabled}
        />
        <Label htmlFor="perm-all" className="font-semibold cursor-pointer">
          Select all permissions
        </Label>
        <Badge variant="secondary" className="ml-auto text-xs">
          {selected.length} / {ALL_PERMISSIONS.length}
        </Badge>
      </div>

      {PERMISSION_GROUPS.map((group) => {
        const groupOn = group.permissions.every((p) => selected.includes(p));
        return (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id={`group-${group.label}`}
                checked={groupOn}
                onCheckedChange={() => toggleGroup(group.permissions)}
                disabled={disabled}
              />
              <Label
                htmlFor={`group-${group.label}`}
                className="text-sm font-medium cursor-pointer"
              >
                {group.label}
              </Label>
            </div>
            <div className="ml-6 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {group.permissions.map((perm) => (
                <div key={perm} className="flex items-center gap-2">
                  <Checkbox
                    id={perm}
                    checked={selected.includes(perm)}
                    onCheckedChange={() => toggle(perm)}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={perm}
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    {permLabel(perm)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Role Dialog ──────────────────────────────────────────────────────────────

interface RoleDialogProps {
  mode: "create" | "edit";
  initial?: Role;
  open: boolean;
  onClose: () => void;
}

function RoleDialog({ mode, initial, open, onClose }: RoleDialogProps) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [permissions, setPermissions] = useState<Permission[]>(
    (initial?.permissions as Permission[]) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  // Reset when dialog opens
  function handleOpenChange(v: boolean) {
    if (!v) {
      onClose();
    } else {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setPermissions((initial?.permissions as Permission[]) ?? []);
      setError(null);
    }
  }

  const createMutation = useMutation({
    mutationFn: () =>
      settingsApi.createRole({ name, description: description || undefined, permissions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Role created." });
      onClose();
    },
    onError: (err: Error) => setError(err.message ?? "Failed to create role"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      settingsApi.updateRole(initial!.id, {
        name,
        description: description || undefined,
        permissions,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Role updated." });
      onClose();
    },
    onError: (err: Error) => setError(err.message ?? "Failed to update role"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isSystem = initial?.isSystem ?? false;

  function handleSave() {
    setError(null);
    if (!name.trim()) { setError("Role name is required."); return; }
    if (permissions.length === 0) { setError("Select at least one permission."); return; }
    if (mode === "create") createMutation.mutate();
    else updateMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Role" : isSystem ? "View Role" : "Edit Role"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {isSystem && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" />
              This is a system role and cannot be modified.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSystem}
                placeholder="e.g. Billing Staff"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role-desc">Description</Label>
              <Input
                id="role-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSystem}
                placeholder="What can this role do?"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Permissions</Label>
            <PermissionMatrix
              selected={permissions}
              onChange={setPermissions}
              disabled={isSystem}
            />
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
              {mode === "create" ? "Create Role" : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── RolesTab ─────────────────────────────────────────────────────────────────

export function RolesTab() {
  const qc = useQueryClient();
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | undefined>(undefined);

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => settingsApi.getRoles() as Promise<Role[]>,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Role deleted." });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function openCreate() {
    setEditRole(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  }

  function openEdit(role: Role) {
    setEditRole(role);
    setDialogMode("edit");
    setDialogOpen(true);
  }

  function handleDelete(role: Role) {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(role.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Define roles and assign granular permissions to staff members.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Role
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-md bg-muted/20">
          <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No roles yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create a role to start managing staff permissions
          </p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Role
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-start justify-between rounded-md border px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{role.name}</span>
                  {role.isSystem && (
                    <Badge variant="secondary" className="text-xs">
                      System
                    </Badge>
                  )}
                </div>
                {role.description && (
                  <p className="text-xs text-muted-foreground">
                    {role.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(role.permissions as string[]).slice(0, 6).map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="text-xs font-normal"
                    >
                      {p}
                    </Badge>
                  ))}
                  {(role.permissions as string[]).length > 6 && (
                    <Badge variant="outline" className="text-xs font-normal">
                      +{(role.permissions as string[]).length - 6} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 ml-4 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(role)}
                  title={role.isSystem ? "View" : "Edit"}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {!role.isSystem && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(role)}
                    disabled={deleteMutation.isPending}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <RoleDialog
        key={dialogOpen ? (editRole?.id ?? "new") : "closed"}
        mode={dialogMode}
        initial={editRole}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
