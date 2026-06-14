"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Server,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
} from "lucide-react";
import { servicesApi } from "@/lib/api/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Suspended: "bg-red-100 text-red-700",
  Terminated: "bg-gray-100 text-gray-600",
  Failed: "bg-red-100 text-red-700",
};

const jobStatusColors: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
  Processing: "bg-blue-100 text-blue-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Retrying: "bg-orange-100 text-orange-700",
};

export default function AdminProvisioningPage() {
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => servicesApi.list({ perPage: 50 }),
  });

  const services: any[] = (servicesData as any)?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Provisioning</h1>
        <p className="text-muted-foreground mt-1">
          Monitor services, servers, and provisioning jobs
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Active Services",
            value: services.filter((s) => s.status === "Active").length,
            color: "text-green-600",
            icon: CheckCircle,
          },
          {
            label: "Pending",
            value: services.filter((s) => s.status === "Pending").length,
            color: "text-yellow-600",
            icon: AlertCircle,
          },
          {
            label: "Suspended",
            value: services.filter((s) => s.status === "Suspended").length,
            color: "text-red-600",
            icon: XCircle,
          },
          {
            label: "Total Services",
            value: services.length,
            color: "text-foreground",
            icon: Package,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-5">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="servers">Servers</TabsTrigger>
          <TabsTrigger value="jobs">Job Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Server className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No services</p>
                </div>
              ) : (
                <div className="divide-y">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {service.domain ?? service.id}
                          </span>
                          <Badge className={statusColors[service.status] ?? ""}>
                            {service.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {service.product?.name} · Due:{" "}
                          {new Date(service.nextDueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {service.status === "Active" && (
                          <Button variant="outline" size="sm">
                            Suspend
                          </Button>
                        )}
                        {service.status === "Suspended" && (
                          <Button size="sm">Unsuspend</Button>
                        )}
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servers">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Server className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Server management</p>
              <p className="text-sm text-muted-foreground mt-1">
                Configure provisioning servers
              </p>
              <Button className="mt-4" size="sm">
                Add Server
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Job queue</p>
              <p className="text-sm text-muted-foreground mt-1">
                Provisioning job history appears here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
