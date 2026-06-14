"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/features/PageHeader";
import { DataTable } from "@/components/features/DataTable";
import { InvoiceStatusBadge } from "@/components/features/InvoiceStatusBadge";
import { ServiceStatusBadge } from "@/components/features/ServiceStatusBadge";
import { clientsApi } from "@/lib/api/clients";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState("");

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: () => clientsApi.getClient(id),
  });

  const addNote = useMutation({
    mutationFn: (content: string) => clientsApi.addNote(id, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      setNoteText("");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client)
    return <p className="text-muted-foreground">Client not found.</p>;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()}
        description={client.email}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <DollarSign className="mr-1 h-4 w-4" />
              Adjust Credit (
              {formatCurrency(Number(client.creditBalance ?? 0), "USD")})
            </Button>
            <Button size="sm">
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{client.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{client.phone ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company</span>
                  <span>{client.companyName ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      client.status === "active" ? "success" : "destructive"
                    }
                  >
                    {client.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(client.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                placeholder="Write a note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => addNote.mutate(noteText)}
                disabled={!noteText.trim()}
                isLoading={addNote.isPending}
              >
                Save Note
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <DataTable
            columns={[
              { header: "Product", key: "productName" },
              { header: "Domain", key: "domain" },
              {
                header: "Status",
                key: "status",
                render: (v) => <ServiceStatusBadge status={String(v)} />,
              },
              {
                header: "Next Due",
                key: "nextDueDate",
                render: (v) => formatDate(String(v)),
              },
            ]}
            data={(client as unknown as { services?: never[] }).services ?? []}
            emptyMessage="No services."
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <DataTable
            columns={[
              { header: "Invoice #", key: "number" },
              {
                header: "Amount",
                key: "total",
                render: (v) => formatCurrency(Number(v), "USD"),
              },
              {
                header: "Status",
                key: "status",
                render: (v) => <InvoiceStatusBadge status={String(v)} />,
              },
              {
                header: "Due",
                key: "dueDate",
                render: (v) => formatDate(String(v)),
              },
            ]}
            data={(client as unknown as { invoices?: never[] }).invoices ?? []}
            emptyMessage="No invoices."
          />
        </TabsContent>

        <TabsContent value="domains" className="mt-4">
          <DataTable
            columns={[
              { header: "Domain", key: "name" },
              { header: "Registrar", key: "registrar" },
              {
                header: "Expires",
                key: "expiresAt",
                render: (v) => formatDate(String(v)),
              },
            ]}
            data={(client as unknown as { domains?: never[] }).domains ?? []}
            emptyMessage="No domains."
          />
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <DataTable
            columns={[
              { header: "Subject", key: "subject" },
              { header: "Status", key: "status" },
              {
                header: "Created",
                key: "createdAt",
                render: (v) => formatDate(String(v)),
              },
            ]}
            data={(client as unknown as { tickets?: never[] }).tickets ?? []}
            emptyMessage="No tickets."
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <p className="text-sm text-muted-foreground">
            Activity timeline coming soon.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
