"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { automationApi } from "@/lib/api/automation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  Success: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
  Running: "bg-blue-100 text-blue-700",
  Idle: "bg-gray-100 text-gray-600",
  Skipped: "bg-yellow-100 text-yellow-700",
};

const statusIcons: Record<string, React.ElementType> = {
  Success: CheckCircle,
  Failed: XCircle,
  Running: Loader2,
  Idle: Clock,
};

export default function AdminAutomationPage() {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["automation-jobs"],
    queryFn: () => automationApi.getJobs(),
  });

  const runMutation = useMutation({
    mutationFn: (slug: string) => automationApi.runJob(slug),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["automation-jobs"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ slug, enabled }: { slug: string; enabled: boolean }) =>
      automationApi.toggleJob(slug, enabled),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["automation-jobs"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Automation</h1>
        <p className="text-muted-foreground mt-1">
          Manage scheduled jobs and cron tasks
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(jobs as any[]).map((job: any) => {
            const StatusIcon =
              statusIcons[job.lastRunStatus ?? "Idle"] ?? Clock;
            return (
              <Card key={job.id}>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{job.name}</span>
                      {job.lastRunStatus && (
                        <Badge
                          className={statusColors[job.lastRunStatus] ?? ""}
                        >
                          {job.lastRunStatus}
                        </Badge>
                      )}
                      {!job.isEnabled && (
                        <Badge className="bg-gray-100 text-gray-500">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Schedule:{" "}
                      <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">
                        {job.schedule}
                      </code>
                      {job.lastRunAt &&
                        ` · Last run: ${new Date(job.lastRunAt).toLocaleString()}`}
                      {job.lastRunDurationMs && ` (${job.lastRunDurationMs}ms)`}
                    </p>
                    {job.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {job.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runMutation.mutate(job.slug)}
                      disabled={runMutation.isPending}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Run Now
                    </Button>
                    <Button
                      variant={job.isEnabled ? "destructive" : "outline"}
                      size="sm"
                      onClick={() =>
                        toggleMutation.mutate({
                          slug: job.slug,
                          enabled: !job.isEnabled,
                        })
                      }
                    >
                      {job.isEnabled ? (
                        <>
                          <Pause className="h-3.5 w-3.5 mr-1.5" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 mr-1.5" />
                          Enable
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
