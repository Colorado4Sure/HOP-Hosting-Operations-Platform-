"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketStatusBadge } from "@/components/features/TicketStatusBadge";
import { PageHeader } from "@/components/features/PageHeader";
import { supportApi } from "@/lib/api/support";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [internal, setInternal] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => supportApi.getTicket(id),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<{ message: string }>();

  const addReply = useMutation({
    mutationFn: (values: { message: string }) =>
      supportApi.addReply(id, { ...values, internal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      reset();
    },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => supportApi.updateTicketStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket", id] }),
  });

  const closeTicket = useMutation({
    mutationFn: () => supportApi.closeTicket(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket", id] }),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!ticket)
    return <p className="text-muted-foreground">Ticket not found.</p>;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`[#${ticket.number}] ${ticket.subject}`}
        action={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => closeTicket.mutate()}
            isLoading={closeTicket.isPending}
            disabled={ticket.status === "closed"}
          >
            Close Ticket
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Thread */}
        <div className="lg:col-span-2 space-y-4">
          {ticket.replies?.map((reply) => (
            <Card
              key={reply.id}
              className={cn(
                reply.internal &&
                  "border-amber-400 bg-amber-50 dark:bg-amber-950/20",
              )}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <span className="text-sm font-medium">{reply.authorId}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(reply.createdAt)}
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                {reply.internal && (
                  <span className="text-xs text-amber-600 font-medium mt-1 block">
                    Internal note
                  </span>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Reply form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reply</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit((v) => addReply.mutate(v))}
                className="space-y-3"
              >
                <Textarea
                  placeholder="Write your reply…"
                  rows={4}
                  {...register("message", { required: true })}
                />
                <div className="flex items-center gap-3">
                  <Switch
                    id="internal"
                    checked={internal}
                    onCheckedChange={setInternal}
                  />
                  <Label
                    htmlFor="internal"
                    className="cursor-pointer font-normal"
                  >
                    Internal note
                  </Label>
                </div>
                <Button type="submit" isLoading={isSubmitting}>
                  Send Reply
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Status</span>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">
                  Change Status
                </span>
                <Select
                  onValueChange={(v) => updateStatus.mutate(v)}
                  defaultValue={ticket.status}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-muted-foreground">Priority</span>
                <p className="capitalize">{ticket.priority}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <p>{formatDate(ticket.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
