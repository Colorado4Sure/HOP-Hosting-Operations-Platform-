"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/features/PageHeader";
import { supportApi } from "@/lib/api/support";

const schema = z.object({
  departmentId: z.string().min(1, "Select a department"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  message: z.string().min(20, "Message must be at least 20 characters"),
  serviceId: z.string().optional(),
});

type NewTicketForm = z.infer<typeof schema>;

export default function NewTicketPage() {
  const router = useRouter();

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: supportApi.listDepartments,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<NewTicketForm>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "medium" },
  });

  const createTicket = useMutation({
    mutationFn: supportApi.createTicket,
    onSuccess: (ticket) => router.push(`/portal/support/${ticket.id}`),
    onError: (err: Error) => setError("root", { message: err.message }),
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="Open New Ticket"
        description="Describe your issue and we'll get back to you."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) => createTicket.mutate(v))}
            className="space-y-4"
          >
            {errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Department</Label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.departmentId && (
                  <p className="text-xs text-destructive">
                    {errors.departmentId.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Priority</Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Subject</Label>
              <Input
                placeholder="Brief description of your issue"
                {...register("subject")}
              />
              {errors.subject && (
                <p className="text-xs text-destructive">
                  {errors.subject.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea
                placeholder="Describe your issue in detail…"
                rows={6}
                {...register("message")}
              />
              {errors.message && (
                <p className="text-xs text-destructive">
                  {errors.message.message}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" isLoading={isSubmitting}>
                Submit Ticket
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
