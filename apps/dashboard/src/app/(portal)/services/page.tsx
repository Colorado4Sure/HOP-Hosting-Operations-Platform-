'use client';

import { useQuery } from '@tanstack/react-query';
import { Globe, RefreshCw, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { servicesApi } from '@/lib/api/services';
import { domainsApi } from '@/lib/api/domains';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Service } from '@hop/shared-types';

const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Terminated: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  Cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function PortalServicesPage() {
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['my-services'],
    queryFn: () => servicesApi.list(),
  });

  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ['my-domains'],
    queryFn: () => domainsApi.list(),
  });

  const services: Service[] = (servicesData as any)?.data ?? [];
  const domains: any[] = (domainsData as any)?.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Services</h1>
        <p className="text-muted-foreground mt-1">Manage your hosting services and domains</p>
      </div>

      {/* Hosting Services */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Hosting Services</h2>
        {servicesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No services yet</p>
              <p className="text-sm text-muted-foreground mt-1">Order a hosting plan to get started</p>
              <Button className="mt-4" size="sm">Browse Plans</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-card-hover transition-shadow">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{service.domain ?? service.product?.name ?? 'Service'}</span>
                      <Badge className={statusColors[service.status] ?? ''}>{service.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {service.product?.name} · Next due:{' '}
                      {new Date(service.nextDueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {service.status === 'Active' && (
                      <Button variant="outline" size="sm">Manage</Button>
                    )}
                    {service.status === 'Suspended' && (
                      <div className="flex items-center gap-1 text-destructive text-xs">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Suspended</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Domains */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Domains</h2>
        {domainsLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : domains.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No domains yet</p>
              <p className="text-sm text-muted-foreground mt-1">Register or transfer a domain to get started</p>
              <div className="flex gap-2 mt-4">
                <Button size="sm">Register Domain</Button>
                <Button size="sm" variant="outline">Transfer Domain</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => {
              const expiry = new Date(domain.expiryDate);
              const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
              const isExpiringSoon = daysLeft <= 30 && daysLeft > 0;
              const isExpired = daysLeft <= 0;
              return (
                <Card key={domain.id} className="hover:shadow-card-hover transition-shadow">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{domain.domain}</span>
                        {domain.autoRenew && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <RefreshCw className="h-3 w-3" /> Auto-renew
                          </span>
                        )}
                        {domain.idProtection && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                            <ShieldCheck className="h-3 w-3" /> Protected
                          </span>
                        )}
                        {isExpired && <Badge className="bg-red-100 text-red-700">Expired</Badge>}
                        {isExpiringSoon && !isExpired && <Badge className="bg-yellow-100 text-yellow-700">Expiring Soon</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires {expiry.toLocaleDateString()}{' '}
                        {!isExpired && `(${daysLeft} day${daysLeft !== 1 ? 's' : ''})`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Manage</Button>
                      <Button variant="outline" size="sm">Renew</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
