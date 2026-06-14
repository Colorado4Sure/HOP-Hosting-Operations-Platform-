"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Puzzle,
  Power,
  PowerOff,
  Settings,
  Trash2,
  ShieldCheck,
  AlertCircle,
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

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-gray-100 text-gray-600",
  Error: "bg-red-100 text-red-700",
  UpdateAvailable: "bg-blue-100 text-blue-700",
};

const typeColors: Record<string, string> = {
  payment: "bg-purple-100 text-purple-700",
  provisioning: "bg-orange-100 text-orange-700",
  registrar: "bg-blue-100 text-blue-700",
  notification: "bg-yellow-100 text-yellow-700",
  widget: "bg-pink-100 text-pink-700",
  hook: "bg-gray-100 text-gray-700",
};

export default function AdminPluginsPage() {
  const queryClient = useQueryClient();

  const { data: plugins = [], isLoading } = useQuery({
    queryKey: ["plugins"],
    queryFn: () => pluginsApi.list(),
  });

  const enableMutation = useMutation({
    mutationFn: (slug: string) => pluginsApi.enable(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plugins"] }),
  });

  const disableMutation = useMutation({
    mutationFn: (slug: string) => pluginsApi.disable(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plugins"] }),
  });

  const uninstallMutation = useMutation({
    mutationFn: (slug: string) => pluginsApi.uninstall(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plugins"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plugin Manager</h1>
          <p className="text-muted-foreground mt-1">
            Install and manage HOP plugins
          </p>
        </div>
        <Button>
          <Puzzle className="h-4 w-4 mr-2" />
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
              Install payment gateways, provisioning modules, and more
            </p>
            <Button className="mt-4">Browse Plugins</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(plugins as any[]).map((plugin: any) => (
            <Card
              key={plugin.id}
              className={
                plugin.status === "Error" ? "border-destructive/50" : ""
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">
                        {plugin.manifest?.name ?? plugin.slug}
                      </CardTitle>
                      <Badge className={statusColors[plugin.status] ?? ""}>
                        {plugin.status}
                      </Badge>
                      <Badge
                        className={
                          typeColors[plugin.manifest?.type] ??
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        {plugin.manifest?.type}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1 text-xs">
                      v{plugin.manifest?.version} · by {plugin.manifest?.author}
                    </CardDescription>
                  </div>
                  {plugin.trustLevel === "trusted" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 shrink-0">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Trusted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 shrink-0">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Sandboxed
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {plugin.manifest?.description}
                </p>
                {plugin.status === "Error" && plugin.errorMessage && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded p-2 mb-3">
                    {plugin.errorMessage}
                  </p>
                )}
                <div className="flex gap-2">
                  {plugin.status === "Active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disableMutation.mutate(plugin.slug)}
                    >
                      <PowerOff className="h-3.5 w-3.5 mr-1.5" />
                      Disable
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => enableMutation.mutate(plugin.slug)}
                    >
                      <Power className="h-3.5 w-3.5 mr-1.5" />
                      Enable
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    Configure
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Uninstall ${plugin.manifest?.name}?`)) {
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
    </div>
  );
}
