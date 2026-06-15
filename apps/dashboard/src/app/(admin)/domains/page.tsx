"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Search, Plus, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { domainsApi } from "@/lib/api/domains";
import { clientsApi } from "@/lib/api/clients";
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
  Expired: "bg-red-100 text-red-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Transferred: "bg-gray-100 text-gray-700",
  PendingTransfer: "bg-blue-100 text-blue-700",
  Locked: "bg-orange-100 text-orange-700",
};

const REGISTRARS = ["Enom", "ResellerClub", "OpenSRS", "Namecheap", "Manual"];

export default function AdminDomainsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Register domain dialog
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [regForm, setRegForm] = useState({
    clientId: "",
    domain: "",
    years: 1,
    registrar: "Enom",
    idProtection: false,
  });

  // Check domain dialog
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkDomain, setCheckDomain] = useState("");
  const [checkResult, setCheckResult] = useState<{ available: boolean; domain: string; suggestions?: string[] } | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-domains", search, page],
    queryFn: () => domainsApi.list({ page, perPage: 25, search }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients-select"],
    queryFn: () => clientsApi.listClients({ limit: 200 }),
    enabled: registerOpen,
  });

  const domains: any[] = (data as any)?.data ?? [];
  const meta: any = (data as any)?.meta ?? {};
  const clients = clientsData?.data ?? [];

  const registerMutation = useMutation({
    mutationFn: () =>
      domainsApi.register({
        clientId: regForm.clientId,
        domain: regForm.domain,
        years: regForm.years,
        registrar: regForm.registrar,
        idProtection: regForm.idProtection,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-domains"] });
      setRegisterOpen(false);
      setRegForm({ clientId: "", domain: "", years: 1, registrar: "Enom", idProtection: false });
      setRegisterError(null);
    },
    onError: (err: Error) => setRegisterError(err.message ?? "Registration failed"),
  });

  const handleRegister = () => {
    setRegisterError(null);
    if (!regForm.clientId) { setRegisterError("Please select a client."); return; }
    if (!regForm.domain.trim()) { setRegisterError("Please enter a domain name."); return; }
    registerMutation.mutate();
  };

  const handleCheck = async () => {
    if (!checkDomain.trim()) return;
    setCheckLoading(true);
    setCheckResult(null);
    try {
      const result = await domainsApi.checkAvailability(checkDomain.trim());
      setCheckResult(result);
    } catch {
      setCheckResult(null);
    } finally {
      setCheckLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Domains</h1>
          <p className="text-muted-foreground mt-1">
            Manage all registered domains
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCheckOpen(true)}>
            <Globe className="h-4 w-4 mr-2" />
            Check Domain
          </Button>
          <Button onClick={() => setRegisterOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Register Domain
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search domains..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Globe className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No domains found</p>
              <Button size="sm" className="mt-4" onClick={() => setRegisterOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Register Domain
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {domains.map((domain) => {
                const daysLeft = Math.ceil(
                  (new Date(domain.expiryDate).getTime() - Date.now()) /
                    86400000,
                );
                const isExpiringSoon = daysLeft <= 30 && daysLeft > 0;
                return (
                  <div
                    key={domain.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{domain.domain}</span>
                        <Badge className={statusColors[domain.status] ?? ""}>
                          {domain.status}
                        </Badge>
                        {isExpiringSoon && (
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                            <AlertCircle className="h-3 w-3" />
                            Expiring in {daysLeft}d
                          </span>
                        )}
                        {domain.autoRenew && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <RefreshCw className="h-3 w-3" />
                            Auto-renew
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expires:{" "}
                        {new Date(domain.expiryDate).toLocaleDateString()} ·
                        Registrar: {domain.registrar}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        Manage
                      </Button>
                      <Button variant="ghost" size="sm">
                        Renew
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {domains.length} of {meta.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Register Domain Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Domain</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Client <span className="text-destructive">*</span>
              </Label>
              <Select
                value={regForm.clientId}
                onValueChange={(v) => setRegForm((p) => ({ ...p, clientId: v }))}
              >
                <SelectTrigger>
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
              <Label>
                Domain Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={regForm.domain}
                onChange={(e) => setRegForm((p) => ({ ...p, domain: e.target.value }))}
                placeholder="example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Years</Label>
                <Select
                  value={String(regForm.years)}
                  onValueChange={(v) => setRegForm((p) => ({ ...p, years: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 10].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y} {y === 1 ? "year" : "years"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Registrar</Label>
                <Select
                  value={regForm.registrar}
                  onValueChange={(v) => setRegForm((p) => ({ ...p, registrar: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTRARS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {registerError && (
              <p className="text-sm text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2">
                {registerError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={registerMutation.isPending}>
              {registerMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check Domain Dialog */}
      <Dialog open={checkOpen} onOpenChange={(v) => { setCheckOpen(v); if (!v) { setCheckResult(null); setCheckDomain(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Check Domain Availability</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                value={checkDomain}
                onChange={(e) => setCheckDomain(e.target.value)}
                placeholder="example.com"
                onKeyDown={(e) => { if (e.key === "Enter") handleCheck(); }}
              />
              <Button onClick={handleCheck} disabled={checkLoading}>
                {checkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
              </Button>
            </div>

            {checkResult && (
              <div
                className={`rounded-md px-4 py-3 text-sm font-medium ${
                  checkResult.available
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {checkResult.domain} is{" "}
                {checkResult.available ? "available! 🎉" : "not available."}

                {checkResult.suggestions && checkResult.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold mb-1">Suggestions:</p>
                    <ul className="space-y-0.5 text-xs">
                      {checkResult.suggestions.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckOpen(false)}>
              Close
            </Button>
            {checkResult?.available && (
              <Button
                onClick={() => {
                  setCheckOpen(false);
                  setRegForm((p) => ({ ...p, domain: checkResult.domain }));
                  setRegisterOpen(true);
                }}
              >
                Register This Domain
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
