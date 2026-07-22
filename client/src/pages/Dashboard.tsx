import React from 'react';
import { useSystemMetrics, useSignals } from '@/hooks/use-queries';
import { stripHtml } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/atlas/stat-card';
import { SectionHeader } from '@/components/atlas/section-header';
import { TopNav } from '@/components/atlas/top-nav';
import { AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { CategoryChart, CATEGORY_LABELS } from '@/components/atlas/category-chart';
import { StatusChart } from '@/components/atlas/status-chart';
import { SourceChart } from '@/components/atlas/source-chart';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { 
    data: metrics, 
    isLoading: isMetricsLoading, 
    isError: isMetricsError, 
    refetch: refetchMetrics 
  } = useSystemMetrics();

  const { 
    data: signalsRes, 
    isLoading: isSignalsLoading, 
    isError: isSignalsError, 
    refetch: refetchSignals 
  } = useSignals({ limit: 10 });

  const { 
    data: alertsRes, 
    isLoading: isAlertsLoading 
  } = useSignals({ status: 'PENDING', limit: 6 });

  const isAdmin = user?.role === 'ADMIN';

  // Skeleton UI matching exact final layout
  if (isMetricsLoading || isSignalsLoading || isAlertsLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <TopNav />
        <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-8 sm:px-6 lg:py-10">
           {/* Header Skeleton */}
           <div className="space-y-2">
             <div className="h-8 w-72 animate-pulse rounded-md bg-secondary" />
             <div className="h-4 w-96 animate-pulse rounded-md bg-secondary" />
           </div>

           {/* KPI Cards Skeleton */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-white border border-border p-4 shadow-xs" />
              ))}
           </div>

           {/* Chart Section Skeleton */}
           <div className="grid gap-6 md:grid-cols-2">
              <div className="h-[320px] animate-pulse rounded-xl bg-white border border-border p-5 shadow-xs" />
              <div className="h-[320px] animate-pulse rounded-xl bg-white border border-border p-5 shadow-xs" />
           </div>

           {/* Activity & Feed Skeleton */}
           <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="h-[360px] animate-pulse rounded-xl bg-white border border-border p-5 shadow-xs" />
              <div className="h-[360px] animate-pulse rounded-xl bg-white border border-border p-5 shadow-xs" />
           </div>
        </div>
      </div>
    );
  }

  // Error State Handling
  if (isMetricsError || isSignalsError) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <TopNav />
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-600 mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Failed to load dashboard metrics</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            We encountered an issue communicating with the Atlas telemetry service. Please check your backend connection.
          </p>
          <button
            onClick={() => { refetchMetrics(); refetchSignals(); }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const signals = signalsRes?.data || [];
  const alerts = alertsRes?.data || [];
  const failedJobsCount = metrics?.queue?.failed || 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopNav />
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 lg:py-8 animate-in fade-in duration-300">
        
        {/* Header & KPI Summary */}
        <section>
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {isAdmin ? 'System Intelligence Overview' : 'Market signals for Vision71'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAdmin 
                  ? 'Real-time telemetry of ingestion queues, connectors, and database metrics.' 
                  : 'Searchable revenue opportunities from hiring, product, developer, and demand signals.'}
              </p>
            </div>

            {/* Failed Jobs Warning Badge for Admin */}
            {isAdmin && (
              <div className="mt-2 sm:mt-0 flex items-center gap-2">
                {failedJobsCount > 0 ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Failed Jobs: <strong className="num text-amber-900 font-semibold">{failedJobsCount}</strong></span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs">
                    <Layers className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Queue Status: <strong className="text-foreground font-medium">Healthy</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5 KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Total Signals" value={metrics?.signals.totalSignals || 0} hint="All ingested records" />
            <StatCard label="Pending Review" value={metrics?.signals.byStatus?.['PENDING'] || 0} hint="Awaiting qualification" />
            <StatCard label="Qualified" value={metrics?.signals.byStatus?.['REVIEWED'] || 0} hint="Moved to CRM" />
            <StatCard label="Archived" value={metrics?.signals.byStatus?.['ARCHIVED'] || 0} hint="Muted for later" />
            <StatCard label="Rejected" value={metrics?.signals.byStatus?.['REJECTED'] || 0} hint="Marked as noise" />
          </div>
        </section>

        {/* Role-Specific Visualizations */}
        {isAdmin ? (
          <section className="grid gap-6 md:grid-cols-2">
            {/* Admin Chart: Ingestion by Source */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[340px]">
              <SectionHeader
                title="Ingestion by Source"
                description="Volume of signals pulled by each active connector"
              />
              <div className="flex-1 mt-3 min-h-0">
                <SourceChart data={metrics?.connectors || []} />
              </div>
            </div>

            {/* Admin Telemetry: Connector Telemetry Panel */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[340px]">
              <div className="flex items-center justify-between">
                <SectionHeader
                  title="Connector Telemetry"
                  description="Status, yields, and last execution time"
                />
              </div>

              <div className="flex-1 mt-4 min-h-0 overflow-y-auto pr-1">
                 <div className="space-y-2.5">
                   {metrics?.connectors.map((c: any) => {
                     const isStub = c.connectorId.toLowerCase().includes('stub');
                     const displayName = c.displayName || c.connectorId;
                     const lastRun = c.lastSuccessAt || c.lastRunAt;

                     return (
                       <div key={c.connectorId} className="flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0">
                         <div className="flex items-center gap-2 min-w-0 pr-2">
                           <div className={`h-2 w-2 shrink-0 rounded-full ${isStub ? 'bg-zinc-300' : c.isEnabled ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                           <div className="flex flex-col truncate">
                             <span className="font-medium text-foreground truncate">{displayName}</span>
                             {lastRun && (
                               <span className="text-[10px] text-muted-foreground num">
                                 Last run: {new Date(lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                             )}
                           </div>
                         </div>
                         <div className="flex items-center gap-4 text-right shrink-0">
                           <div className="flex flex-col">
                             <span className="text-[10px] text-muted-foreground">Fetched</span>
                             <span className="text-xs num font-medium text-foreground">{c.fetched}</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-muted-foreground">Errors</span>
                             <span className={`text-xs num font-medium ${c.consecutiveErrors > 0 ? 'text-rose-600 font-semibold' : 'text-foreground'}`}>
                               {c.consecutiveErrors}
                             </span>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-6 md:grid-cols-2">
            {/* Analyst Chart 1: Signal Distribution (All 10 categories) */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[340px]">
              <SectionHeader
                title="Signal Distribution"
                description="Breakdown of ingested signals across all categories"
              />
              <div className="flex-1 mt-3 min-h-0">
                <CategoryChart data={metrics?.signals.byCategory || {}} />
              </div>
            </div>

            {/* Analyst Chart 2: Pipeline Status Breakdown */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[340px]">
              <SectionHeader
                title="Pipeline Status"
                description="Current status breakdown of review pipeline"
              />
              <div className="flex-1 mt-3 min-h-0">
                <StatusChart data={metrics?.signals.byStatus || {}} />
              </div>
            </div>
          </section>
        )}

        {/* Data Feed & Action Items */}
        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Main Ingestion Stream */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-xs">
            <SectionHeader
              title={isAdmin ? "System Ingestion Stream" : "Recent Market Signals"}
              description={isAdmin ? "Real-time feed of parsed intelligence records" : "Latest revenue opportunities ready for qualification"}
            />
            <div className="mt-4 space-y-3">
              {signals.slice(0, 5).map((s: any) => (
                <div key={s._id} className="flex flex-col sm:flex-row sm:items-start justify-between rounded-lg border border-border p-3.5 transition-colors hover:bg-secondary/40 gap-2">
                  <div className="space-y-1">
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">{s.title || 'Untitled Signal'}</span>
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground border border-border">
                          {CATEGORY_LABELS[s.category] || s.category}
                        </span>
                     </div>
                     <p className="text-xs text-muted-foreground line-clamp-1">{stripHtml(s.description)}</p>
                     <div className="flex gap-1.5 flex-wrap pt-1">
                        {s.technologies?.slice(0, 4).map((t: string) => (
                          <span key={t} className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.2 bg-white">
                            {t}
                          </span>
                        ))}
                     </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                     <span className="text-[11px] text-muted-foreground num block">
                       {new Date(s.discoveredAt).toLocaleDateString()}
                     </span>
                     <span className="text-[10px] font-mono text-muted-foreground uppercase block mt-0.5">
                       {s.sourceId}
                     </span>
                  </div>
                </div>
              ))}
              {signals.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No recent signals ingested.
                </div>
              )}
            </div>
          </div>

          {/* Action Required Panel */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-xs">
            <SectionHeader
              title={isAdmin ? "System Alerts" : "Action Required"}
              action={
                <Link to="/signals" className="text-xs text-muted-foreground hover:text-foreground font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1">
                  View all
                </Link>
              }
            />
            <div className="mt-4 space-y-2.5">
               {alerts.slice(0, 5).map((s: any) => (
                <div key={s._id} className="rounded-lg border border-border p-3 hover:border-border/80 transition-colors">
                  <div className="flex items-center gap-2">
                     <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                     <span className="text-xs font-semibold text-foreground truncate">
                       {isAdmin ? s.sourceId.toUpperCase() : (s.company || 'Market Signal')}
                     </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{s.title}</p>
                </div>
              ))}
               {alerts.length === 0 && (
                 <div className="p-8 text-center text-xs text-muted-foreground">
                   No pending review alerts.
                 </div>
               )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
