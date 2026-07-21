import React from 'react';
import { useSystemMetrics, useSignals } from '@/hooks/use-queries';
import { stripHtml } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/atlas/stat-card';
import { SectionHeader } from '@/components/atlas/section-header';
import { TopNav } from '@/components/atlas/top-nav';
import { Loader2 } from 'lucide-react';
import { CategoryChart } from '@/components/atlas/category-chart';
import { StatusChart } from '@/components/atlas/status-chart';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: metrics, isLoading: isMetricsLoading } = useSystemMetrics();
  const { data: signalsRes, isLoading: isSignalsLoading } = useSignals({ limit: 10 });
  const { data: alertsRes, isLoading: isAlertsLoading } = useSignals({ status: 'PENDING', limit: 6 });

  // Skeleton UI for fast perceived load
  if (isMetricsLoading || isSignalsLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <TopNav />
        <div className="mx-auto max-w-[1400px] space-y-10 px-4 py-8 sm:px-6 lg:py-10">
           <div className="h-8 w-64 animate-pulse rounded bg-muted/60 mb-8" />
           <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 mb-10">
              {[1,2,3,4,5].map(i => <div key={i} className="h-28 animate-pulse rounded-lg bg-card border border-border" />)}
           </div>
           <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="h-[400px] animate-pulse rounded-lg bg-card border border-border" />
              <div className="h-[400px] animate-pulse rounded-lg bg-card border border-border" />
           </div>
        </div>
      </div>
    );
  }

  const signals = signalsRes?.data || [];
  const alerts = alertsRes?.data || [];
  
  // Dashboard view adaptation based on role
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <div className="mx-auto max-w-[1400px] space-y-10 px-4 py-8 sm:px-6 lg:py-10 animate-in fade-in duration-300">
        <section>
          <div className="mb-6 grid grid-cols-1 items-end gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-[34px]">
                {isAdmin ? 'System Intelligence Overview' : 'Market signals for Vision71.'}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {isAdmin 
                  ? 'Real-time telemetry of ingestion queues, connectors, and database metrics.' 
                  : 'Searchable opportunities from hiring, product, developer, and demand signals.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Total Signals" value={metrics?.signals.totalSignals || 0} />
            <StatCard label="Pending Review" value={metrics?.signals.byStatus?.['PENDING'] || 0} />
            <StatCard label="Active Connectors" value={metrics?.connectors.filter(c => c.isEnabled).length || 0} />
            {isAdmin ? (
              <>
                <StatCard label="Queue Waiting" value={metrics?.queue.waiting || 0} />
                <StatCard label="Uptime (hrs)" value={Math.floor((metrics?.system.uptimeSeconds || 0) / 3600)} />
              </>
            ) : (
              <>
                <StatCard label="Qualified" value={metrics?.signals.byStatus?.['REVIEWED'] || 0} />
                <StatCard label="Archived" value={metrics?.signals.byStatus?.['ARCHIVED'] || 0} />
              </>
            )}
          </div>
        </section>

        {isAdmin ? (
          <>
            <section className="grid gap-6 lg:grid-cols-2 mb-10">
              <div className="rounded-lg border border-border p-4 sm:p-5 card-lift bg-card h-[300px] flex flex-col">
                <SectionHeader
                  title="System Memory Footprint"
                  description="Real-time heap and RSS usage of the API process"
                />
                <div className="flex-1 mt-4 min-h-0 flex flex-col justify-center space-y-6">
                   <div>
                     <div className="flex justify-between text-xs mb-2 text-muted-foreground">
                        <span>Heap Used</span>
                        <span className="num text-foreground">{((metrics?.system.heapUsedBytes || 0) / 1024 / 1024).toFixed(1)} MB / {((metrics?.system.heapTotalBytes || 0) / 1024 / 1024).toFixed(1)} MB</span>
                     </div>
                     <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(((metrics?.system.heapUsedBytes || 0) / (metrics?.system.heapTotalBytes || 1)) * 100, 100)}%` }}></div>
                     </div>
                   </div>
                   <div>
                     <div className="flex justify-between text-xs mb-2 text-muted-foreground">
                        <span>Resident Set Size (RSS)</span>
                        <span className="num text-foreground">{((metrics?.system.rssBytes || 0) / 1024 / 1024).toFixed(1)} MB</span>
                     </div>
                     <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${Math.min(((metrics?.system.rssBytes || 0) / 500000000) * 100, 100)}%` }}></div>
                     </div>
                   </div>
                   <div className="flex justify-between text-xs pt-4 border-t border-border/50">
                     <span className="text-muted-foreground">Database Status</span>
                     <span className={`font-medium ${metrics?.database.status === 'connected' ? 'text-success' : 'text-warning'}`}>{metrics?.database.status?.toUpperCase()}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                     <span className="text-muted-foreground">Cache & Queue (Redis)</span>
                     <span className={`font-medium ${metrics?.redis.status === 'connected' ? 'text-success' : 'text-warning'}`}>{metrics?.redis.status?.toUpperCase()}</span>
                   </div>
                </div>
              </div>
              <div className="rounded-lg border border-border p-4 sm:p-5 card-lift bg-card h-[300px] flex flex-col">
                <SectionHeader
                  title="Connector Telemetry"
                  description="Status and yields of automated data sources"
                />
                <div className="flex-1 mt-4 min-h-0 overflow-y-auto pr-2">
                   <div className="space-y-3">
                     {metrics?.connectors.map((c: any) => (
                       <div key={c.connectorId} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0">
                         <div className="flex items-center gap-2">
                           <div className={`h-2 w-2 rounded-full ${c.isEnabled ? 'bg-success' : 'bg-muted'}`}></div>
                           <span className="font-medium text-[13px] uppercase">{c.connectorId}</span>
                         </div>
                         <div className="flex gap-4 text-right">
                           <div className="flex flex-col">
                             <span className="text-[10px] text-muted-foreground">Fetched</span>
                             <span className="text-xs num font-medium">{c.fetched}</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-muted-foreground">Errors</span>
                             <span className={`text-xs num font-medium ${c.consecutiveErrors > 0 ? 'text-destructive' : 'text-foreground'}`}>{c.consecutiveErrors}</span>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-2 mb-10">
              <div className="rounded-lg border border-border p-4 sm:p-5 card-lift bg-card h-[300px] flex flex-col">
                <SectionHeader
                  title="Signal Distribution"
                  description="Breakdown of ingested market signals by top categories"
                />
                <div className="flex-1 mt-2 min-h-0">
                  <CategoryChart data={metrics?.signals.byCategory || {}} />
                </div>
              </div>
              <div className="rounded-lg border border-border p-4 sm:p-5 card-lift bg-card h-[300px] flex flex-col">
                <SectionHeader
                  title="Pipeline Status"
                  description="Current breakdown of signals in the review pipeline"
                />
                <div className="flex-1 mt-2 min-h-0 relative">
                   <StatusChart data={metrics?.signals.byStatus || {}} />
                   <div className="absolute inset-0 pointer-events-none flex items-center justify-center flex-col">
                     <span className="text-3xl font-semibold num">{metrics?.signals.totalSignals || 0}</span>
                     <span className="text-xs text-muted-foreground">Total</span>
                   </div>
                </div>
              </div>
            </section>
          </>
        )}

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-lg border border-border p-4 sm:p-5 card-lift bg-card">
            <SectionHeader
              title={isAdmin ? "System Ingestion Activity" : "Recent Market Signals"}
              description={isAdmin ? "Real-time stream of parsed records" : "Latest opportunities matching your criteria"}
            />
            <div className="mt-4 space-y-3">
              {signals.slice(0, 5).map((s: any) => (
                <div key={s._id} className="flex items-start justify-between rounded-md border border-border p-3 transition-colors hover:bg-accent/40">
                  <div>
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{s.title || 'Untitled Signal'}</span>
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">{s.category}</span>
                     </div>
                     <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{stripHtml(s.description)}</p>
                     <div className="mt-2 flex gap-2">
                        {s.technologies?.slice(0, 3).map((t: string) => <span key={t} className="text-[10px] text-muted-foreground border border-border rounded px-1.5">{t}</span>)}
                     </div>
                  </div>
                  <div className="text-right">
                     <span className="text-[11px] text-muted-foreground block">{new Date(s.discoveredAt).toLocaleDateString()}</span>
                     <span className="text-[10px] text-muted-foreground mt-1 uppercase block">{s.sourceId}</span>
                  </div>
                </div>
              ))}
              {signals.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No recent signals found.</div>}
            </div>
          </div>
          <div className="rounded-lg border border-border p-4 sm:p-5 card-lift bg-card">
            <SectionHeader
              title={isAdmin ? "System Alerts" : "Action Required"}
              action={
                <a href="/signals" className="text-[12px] text-muted-foreground hover:text-foreground">
                  View all
                </a>
              }
            />
            <div className="mt-4 space-y-3">
               {alerts.slice(0, 5).map((s: any) => (
                <div key={s._id} className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                     <div className="h-1.5 w-1.5 rounded-full bg-warning"></div>
                     <span className="text-[13px] font-medium leading-snug truncate">{isAdmin ? s.sourceId.toUpperCase() : (s.company || 'Unknown')} - {s.category}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">{s.title}</p>
                </div>
              ))}
               {alerts.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No pending alerts.</div>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
