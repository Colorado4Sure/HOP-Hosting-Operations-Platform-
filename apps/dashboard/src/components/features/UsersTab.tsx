"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Pencil,
  Trash2,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { settingsApi, type AppUser } from "@/lib/api/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Permission } from "@hop/shared-types";

const USER_ROLES = ["SuperAdmin", "Admin", "Staff", "Reseller", "Client"];

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Clients",
    permissions: ["clients:read", "clients:create", "clients:update", "clients:delete"],
  },
  {
    label: "Invoices",
    permissions: ["invoices:read", "invoices:create", "invoices:update", "invoices:delete", "invoices:pay"],
  },
  {
    label: "Products",
    permissions: ["products:read", "products:create", "products:update", "products:delete"],
  },
  {
    label: "Servers",
    permissions: ["servers:read", "servers:provision", "servers:suspend", "servers:terminate"],
  },
  {
    label: "Domains",
    permissions: ["domains:read", "domains:register", "domains:transfer", "domains:renew"],
  },
  {
    label: "Support",
    permissions: ["support:read", "support:reply", "support:close", "support:assign"],
  },
  { label: "Reports", permissions: ["reports:read"] },
  { label: "Settings", permissions: ["settings:read", "settings:update"] },
  { label: "Plugins", permissions: ["plugins:manage"] },
  { label: "Affiliates", permissions: ["affiliates:read", "affiliates:manage"] },
];

const ROLE_BADGE: Record<string, string> = {
  SuperAdmin: "bg-red-100 text-red-700",
  Admin: "bg-orange-100 text-orange-700",
  Staff: "bg-blue-100 text-blue-700",
  Reseller: "bg-purple-100 text-purple-700",
  Client: "bg-gray-100 text-gray-600",
};

function permLabel(perm: string): string {
  const [, action] = perm.split(":");
  return action.charAt(0).toUpperCase() + action.slice(1);
}

// ─── Edit User Dialog ─────────────────────────────────────────────────────────

function EditUserDialog({
  user,
  open,
  onClose,
}: {
  user: AppUser;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [role, setRole] = useState(user.role);
  const [permissions, setPermissions] = useState<Permission[]>(
    user.customPermissions as Permission[],
  );
  const [isActive, setIsActive] = useState(user.isActive);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: () =>
      settingsApi.updateUser(user.id, {
        role,
        customPermissions: permissions,
        isActive,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User updated." });
      onClose();
    },
    onError: (err: Error) => setError(err.message ?? "Failed to update user"),
  });

  function togglePerm(perm: Permission) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  }

  function toggleGroup(perms: Permission[]) {
    const allOn = perms.every((p) => permissions.includes(p));
    setPermissions((prev) =>
      allOn
        ? prev.filter((p) => !perms.includes(p))
        : Array.from(new Set([...prev, ...perms])),
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit User — {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm space-y-1">
            <p className="font-medium">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              {user.isEmailVerified ? (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Email verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-yellow-600">
                  <AlertCircle className="h-3 w-3" /> Email not verified
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Account Status</Label>
              <Select
                value={isActive ? "active" : "inactive"}
                onValueChange={(v) => setIsActive(v === "active")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">Custom Permissions</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                These are added on top of the role's default permissions.
              </p>
            </div>

            {PERMISSION_GROUPS.map((group) => {
              const groupOn = group.permissions.every((p) => permissions.includes(p));
              return (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Checkbox
                      id={`ug-${group.label}`}
                      checked={groupOn}
                      onCheckedChange={() => toggleGroup(group.permissions)}
                    />
                    <Label
                      htmlFor={`ug-${group.label}`}
                      className="text-xs font-semibold uppercase tracking-wide cursor-pointer"
                    >
                      {group.label}
                    </Label>
                  </div>
                  <div className="ml-6 grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {group.permissions.map((perm) => (
                      <div key={perm} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`up-${perm}`}
                          checked={permissions.includes(perm)}
                          onCheckedChange={() => togglePerm(perm)}
                        />
                        <Label
                          htmlFor={`up-${perm}`}
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

          {error && (
            <p className="text-sm text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── UsersTab ─────────────────────────────────────────────────────────────────

export function UsersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editUser, setEditUser] = useState<AppUser | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter],
    queryFn: () =>
      settingsApi.listUsers({
        search: search || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        perPage: 50,
      }),
  });

  const users: AppUser[] = (data as any)?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User deleted." });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function handleDelete(user: AppUser) {
    if (!confirm(`Delete user ${user.email}? This is permanent.`)) return;
    deleteMutation.mutate(user.id);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage user accounts, roles, and individual capability overrides.
        Users created here are linked to admin/staff accounts.
      </p>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {USER_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md bg-muted/20">
          <Users className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 rounded-md border px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[user.role] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {user.role}
                  </span>
                  {!user.isActive && (
                    <span className="inline-flex items-center gap-1 text-xs text-destructive">
                      <XCircle className="h-3 w-3" /> Suspended
                    </span>
                  )}
                  {user.customPermissions.length > 0 && (
                    <Badge variant="outline" className="text-xs font-normal">
                      +{user.customPermissions.length} custom perms
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditUser(user)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(user)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editUser && (
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onClose={() => setEditUser(undefined)}
        />
      )}
    </div>
  );
}
