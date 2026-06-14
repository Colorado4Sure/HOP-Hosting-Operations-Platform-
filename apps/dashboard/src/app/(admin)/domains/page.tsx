"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, Search, Plus, RefreshCw, AlertCircle } from "lucide-react";
import { domainsApi } from "@/lib/api/domains";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Expired: "bg-red-100 text-red-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Transferred: "bg-gray-100 text-gray-700",
  PendingTransfer: "bg-blue-100 text-blue-700",
  Locked: "bg-orange-100 text-orange-700",
};

export default function AdminDomainsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-domains", search, page],
    queryFn: () => domainsApi.list({ page, perPage: 25, search }),
  });

  const domains: any[] = (data as any)?.data ?? [];
  const meta: any = (data as any)?.meta ?? {};

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
          <Button variant="outline">
            <Globe className="h-4 w-4 mr-2" />
            Check Domain
          </Button>
          <Button>
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
    </div>
  );
}
