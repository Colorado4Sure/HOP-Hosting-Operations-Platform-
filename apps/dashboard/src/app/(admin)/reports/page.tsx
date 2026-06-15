'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp, DollarSign, Users, AlertTriangle,
  BarChart2, PieChart, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-6">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminReportsPage() {
  const [period, setPeriod] = useState('30');

  const { data: summary } = useQuery({
    queryKey: ['reports-summary', period],
    queryFn: () => reportsApi.getOverview(),
  });

  const { data: mrr } = useQuery({
    queryKey: ['reports-mrr'],
    queryFn: () => reportsApi.getMrrReport(),
  });

  const { data: overdue } = useQuery({
    queryKey: ['reports-overdue'],
    queryFn: () => reportsApi.getOverdueReport(),
  });

  const stats = (summary as any) ?? {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Business insights and financial overview</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${(stats.totalRevenue ?? 0).toLocaleString()}`}
          sub={`Last ${period} days`}
          icon={DollarSign}
          color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          title="MRR"
          value={`$${((mrr as any)?.current ?? 0).toLocaleString()}`}
          sub="Monthly Recurring Revenue"
          icon={TrendingUp}
          color="bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
        />
        <StatCard
          title="New Clients"
          value={String(stats.newClients ?? 0)}
          sub={`Last ${period} days`}
          icon={Users}
          color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          title="Overdue Invoices"
          value={String((overdue as any)?.invoices?.length ?? 0)}
          sub="Require attention"
          icon={AlertTriangle}
          color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        />
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />Revenue Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm rounded-lg bg-muted/40">
              Revenue chart (integrate Recharts or Chart.js)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />Revenue by Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm rounded-lg bg-muted/40">
              Product breakdown chart (integrate Recharts or Chart.js)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {!overdue || (overdue as any)?.invoices?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No overdue invoices 🎉</p>
          ) : (
            <div className="divide-y">
              {((overdue as any)?.invoices ?? []).slice(0, 10).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                  </div>
                  <span className="font-semibold text-destructive">
                    {inv.currency} {inv.amountDue?.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
