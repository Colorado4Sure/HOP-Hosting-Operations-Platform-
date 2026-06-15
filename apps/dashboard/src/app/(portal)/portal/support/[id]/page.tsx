"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketStatusBadge } from "@/components/features/TicketStatusBadge";
import { PageHeader } from "@/components/features/PageHeader";
import { supportApi } from "@/lib/api/support";
import { formatDate } from "@/lib/utils";

export default function PortalTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["portal-ticket", id],
    queryFn: () => supportApi.getTicket(id),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<{ message: string }>();

  const addReply = useMutation({
    mutationFn: (v: { message: string }) => supportApi.addReply(id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-ticket", id] });
      reset();
    },
  });

  const closeTicket = useMutation({
    mutationFn: () => supportApi.closeTicket(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-ticket", id] }),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!ticket)
    return <p className="text-muted-foreground">Ticket not found.</p>;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title={`[#${ticket.ticketNumber}] ${ticket.subject}`}
        action={
          <div className="flex items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            {ticket.status !== "Closed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeTicket.mutate()}
                isLoading={closeTicket.isPending}
              >
                Close Ticket
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-4">
        {ticket.replies
          ?.filter((r) => !r.internal)
          .map((reply) => (
            <Card key={reply.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <span className="text-sm font-medium">{reply.authorId}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(reply.createdAt)}
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
              </CardContent>
            </Card>
          ))}
      </div>

      {ticket.status !== "Closed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Reply</CardTitle>
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
              <Button type="submit" isLoading={isSubmitting}>
                Send Reply
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
