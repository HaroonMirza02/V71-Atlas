import React from 'react';
import { useSystemMetrics, useSignals } from '@/hooks/use-queries';
import { stripHtml, sanitizeTechTag } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/atlas/stat-card';
import { SectionHeader } from '@/components/atlas/section-header';
import { TopNav } from '@/components/atlas/top-nav';
import { AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { CategoryChart, CATEGORY_LABELS } from '@/components/atlas/category-chart';
import { StatusChart } from '@/components/atlas/status-chart';
import { SourceChart } from '@/components/atlas/source-chart';
import { ConnectorErrorChart } from '@/components/atlas/connector-error-chart';
import { IngestionTrendChart } from '@/components/atlas/ingestion-trend-chart';
import { TopTechChart } from '@/components/atlas/top-tech-chart';
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
  } = useSignals({ limit: 15 });

  const { 
    data: alertsRes, 
    isLoading: isAlertsLoading 
  } = useSignals({ status: 'PENDING', limit: 6 });

  const isAdmin = user?.role === 'ADMIN';

  // Skeleton UI matching layout
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
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-white border border-border p-4 shadow-xs" />
              ))}
           </div>

           {/* Chart Section Skeleton */}
           <div className="grid gap-6 md:grid-cols-3">
              <div className="h-[320px] animate-pulse rounded-xl bg-white border border-border p-5 shadow-xs" />
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
  const connectors = metrics?.connectors || [];

  // Compute Admin Metrics
  const liveConnectors = connectors.filter(c => !c.connectorId.toLowerCase().includes('stub'));
  const totalFetched = liveConnectors.reduce((acc, c) => acc + (c.fetched || 0), 0);
  const totalErrors = liveConnectors.reduce((acc, c) => acc + (c.consecutiveErrors || 0), 0);
  const overallErrorRatePct = (totalFetched + totalErrors) > 0 
    ? Math.round((totalErrors / (totalFetched + totalErrors)) * 100) 
    : 0;

  // Compute Analyst Metrics
  const topCategoryObj = metrics?.signals?.topCategoryThisWeek;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopNav />
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 lg:py-8 animate-in fade-in duration-300">
        
        {/* Header & Role-Specific KPI Cards */}
        <section>
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {isAdmin ? 'System Health Overview' : 'Market Intelligence Overview'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAdmin 
                  ? 'Real-time telemetry of ingestion queues, connector health, and failure rates.' 
                  : 'Weekly signal velocity, review backlog urgency, and emerging technology trends.'}
              </p>
            </div>

            {/* Health Badge */}
            {isAdmin && (
              <div className="mt-2 sm:mt-0 flex items-center gap-2">
                {failedJobsCount > 0 || totalErrors > 10 ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 shadow-xs">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>Attention Required</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-xs">
                    <Layers className="h-3.5 w-3.5 text-emerald-600" />
                    <span>System Operational</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Role-Specific Purpose-Built KPI Strip */}
          {isAdmin ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard 
                label="Ingested Today" 
                value={metrics?.signals?.ingestedToday || 0} 
                hint="Discovered in last 24 hours" 
              />
              <div className="group rounded-xl border border-border bg-white p-4 shadow-xs hover:border-border/80 transition-all sm:p-5">
                <p className="text-xs font-medium text-muted-foreground font-sans">Active Connectors</p>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl num">
                  {liveConnectors.length} <span className="text-sm font-medium text-muted-foreground">of {connectors.length} live</span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground font-sans">Operational data sources</p>
              </div>
              <div className={`group rounded-xl border p-4 shadow-xs transition-all sm:p-5 ${failedJobsCount > 0 ? 'border-rose-200 bg-rose-50/40' : 'border-border bg-white'}`}>
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-muted-foreground font-sans">Failed Jobs</p>
                  {failedJobsCount > 0 && <AlertTriangle className="h-4 w-4 text-rose-600" />}
                </div>
                <div className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl num ${failedJobsCount > 0 ? 'text-rose-700 font-bold' : 'text-foreground'}`}>
                  {failedJobsCount}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground font-sans">Exhausted retry limits</p>
              </div>
              <div className="group rounded-xl border border-border bg-white p-4 shadow-xs hover:border-border/80 transition-all sm:p-5">
                <p className="text-xs font-medium text-muted-foreground font-sans">Overall Error Rate</p>
                <div className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl num ${overallErrorRatePct > 15 ? 'text-rose-600 font-bold' : 'text-foreground'}`}>
                  {overallErrorRatePct}%
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground font-sans">Fetch failure percentage</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard 
                label="New Signals This Week" 
                value={metrics?.signals?.ingestedThisWeek || 0} 
                hint="Discovered in last 7 days" 
              />
              <div className="group rounded-xl border border-blue-200 bg-blue-50/30 p-4 shadow-xs sm:p-5">
                <p className="text-xs font-medium text-blue-900 font-sans">Review Backlog</p>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-blue-900 sm:text-3xl num">
                  {(metrics?.signals?.byStatus?.['PENDING'] || 0).toLocaleString()}
                </div>
                <p className="mt-1.5 text-[11px] text-blue-700 font-sans font-medium">Awaiting your triage</p>
              </div>
              <StatCard 
                label="Qualified This Week" 
                value={metrics?.signals?.qualifiedThisWeek || 0} 
                hint="Promoted to sales CRM" 
              />
              <div className="group rounded-xl border border-border bg-white p-4 shadow-xs hover:border-border/80 transition-all sm:p-5">
                <p className="text-xs font-medium text-muted-foreground font-sans">Top Category This Week</p>
                <div className="mt-3 text-lg font-semibold tracking-tight text-foreground truncate">
                  {topCategoryObj ? CATEGORY_LABELS[topCategoryObj.category] || topCategoryObj.category : 'None'}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground font-sans">
                  {topCategoryObj ? `${topCategoryObj.percentage}% of week's signals` : 'No weekly data'}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Role-Specific Purpose-Built Charts */}
        {isAdmin ? (
          <>
            <section className="grid gap-6 lg:grid-cols-3">
              {/* Admin Chart 1: Ingestion by Source */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[340px]">
                <SectionHeader
                  title="Ingestion by Source"
                  description="Volume pulled by live connectors"
                />
                <div className="flex-1 mt-3 min-h-0">
                  <SourceChart data={metrics?.connectors || []} />
                </div>
              </div>

              {/* Admin Chart 2: Connector Error Rate Bar Chart */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[340px]">
                <SectionHeader
                  title="Connector Error Rate"
                  description="Consecutive errors sorted worst to best"
                />
                <div className="flex-1 mt-3 min-h-0">
                  <ConnectorErrorChart data={metrics?.connectors || []} />
                </div>
              </div>

              {/* Admin Chart 3: Daily Ingestion Volume Trend */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[340px]">
                <SectionHeader
                  title="Ingestion Trend"
                  description="Daily signals ingested over last 14 days"
                />
                <div className="flex-1 mt-3 min-h-0">
                  <IngestionTrendChart data={metrics?.signals?.dailyVolume || []} />
                </div>
              </div>
            </section>

            {/* Admin Telemetry & Activity Stream */}
            <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              {/* Connector Telemetry Panel */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[360px]">
                <SectionHeader
                  title="Connector Telemetry"
                  description="Detailed execution stats & health weighting"
                />
                <div className="flex-1 mt-4 min-h-0 overflow-y-auto pr-1">
                   <div className="space-y-2.5">
                     {connectors.map((c: any) => {
                       const isStub = c.connectorId.toLowerCase().includes('stub') && !c.connectorId.toLowerCase().includes('producthunt');
                       const displayName = c.displayName || c.connectorId;
                       const lastRun = c.lastSuccessAt || c.lastRunAt;
                       const hasHighErrors = c.consecutiveErrors > 5;

                       return (
                         <div key={c.connectorId} className={`flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0 p-1.5 rounded-md ${hasHighErrors ? 'bg-rose-50/60 border border-rose-200' : ''}`}>
                           <div className="flex items-center gap-2 min-w-0 pr-2">
                             <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${isStub ? 'bg-zinc-300' : hasHighErrors ? 'bg-rose-600' : c.isEnabled ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                             <div className="flex flex-col truncate">
                               <span className={`font-medium truncate ${hasHighErrors ? 'text-rose-900 font-semibold' : 'text-foreground'}`}>{displayName}</span>
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
                               <span className={`text-xs num font-medium ${c.consecutiveErrors > 0 ? 'text-rose-600 font-bold' : 'text-foreground'}`}>
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

              {/* System Ingestion Raw Stream */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[360px]">
                <SectionHeader
                  title="System Activity Stream"
                  description="Latest parsed intelligence records"
                />
                <div className="flex-1 mt-4 space-y-3 overflow-y-auto pr-1">
                  {signals.slice(0, 6).map((s: any) => (
                    <div key={s._id} className="rounded-lg border border-border p-2.5 hover:bg-secondary/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">{s.title || 'Untitled Signal'}</span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase shrink-0">{s.sourceId}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1">{stripHtml(s.description)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-3">
              {/* Analyst Chart 1: Category Distribution */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[340px]">
                <SectionHeader
                  title="Signal Distribution"
                  description="Market opportunities across categories"
                />
                <div className="flex-1 mt-3 min-h-0">
                  <CategoryChart data={metrics?.signals?.byCategory || {}} />
                </div>
              </div>

              {/* Analyst Chart 2: Pipeline Progress Bar */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[340px]">
                <SectionHeader
                  title="Pipeline Status"
                  description="Reviewed vs pending backlog progress"
                />
                <div className="flex-1 mt-3 min-h-0">
                  <StatusChart data={metrics?.signals?.byStatus || {}} />
                </div>
              </div>

              {/* Analyst Chart 3: Top Technologies */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col h-[340px]">
                <SectionHeader
                  title="Top Technologies"
                  description="Most frequent tech stack mentions"
                />
                <div className="flex-1 mt-3 min-h-0">
                  <TopTechChart data={metrics?.signals?.topTechnologies} signals={signals} />
                </div>
              </div>
            </section>

            {/* Analyst Action Required Panel & Recent Market Signals Feed */}
            <section className="grid gap-6 lg:grid-cols-[1fr_2fr]">
              {/* Action Required / Pending Triage Queue Panel */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <SectionHeader
                    title="Action Required"
                    description="Pending signals awaiting analyst triage"
                    action={
                      <Link to="/signals?status=PENDING" className="text-xs text-blue-600 hover:text-blue-700 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1">
                        View queue &rarr;
                      </Link>
                    }
                  />
                  <div className="mt-4 space-y-2.5">
                     {alerts.slice(0, 5).map((s: any) => (
                      <div key={s._id} className="rounded-lg border border-border p-3 hover:border-border/80 transition-colors bg-blue-50/20">
                        <div className="flex items-center justify-between gap-2">
                           <div className="flex items-center gap-1.5 min-w-0">
                              <div className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                              <span className="text-[10px] font-mono text-muted-foreground uppercase shrink-0">{s.sourceId}</span>
                              <span className="rounded bg-secondary px-1.5 py-0.2 text-[10px] font-medium text-foreground border border-border truncate font-mono">
                                {CATEGORY_LABELS[s.category] || s.category}
                              </span>
                           </div>
                           <Link to="/signals?status=PENDING" className="text-[11px] text-blue-600 hover:underline font-medium shrink-0">
                             Review &rarr;
                           </Link>
                        </div>
                        <h4 className="mt-1.5 text-xs font-semibold text-foreground line-clamp-1">{s.title || 'Untitled Signal'}</h4>
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{stripHtml(s.description)}</p>
                      </div>
                    ))}
                     {alerts.length === 0 && (
                       <div className="p-8 text-center text-xs text-muted-foreground">
                         No pending triage signals in queue.
                       </div>
                     )}
                  </div>
                </div>
              </div>

              {/* Recent Market Signals Feed */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs">
                <SectionHeader
                  title="Recent Market Signals"
                  description="Latest revenue opportunities matching criteria"
                />
                <div className="mt-4 space-y-3">
                  {signals.slice(0, 6).map((s: any) => (
                    <div key={s._id} className="flex flex-col sm:flex-row sm:items-start justify-between rounded-lg border border-border p-3.5 transition-colors hover:bg-secondary/40 gap-2">
                      <div className="space-y-1">
                         <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">{s.title || 'Untitled Signal'}</span>
                            <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground border border-border font-mono">
                              {CATEGORY_LABELS[s.category] || s.category}
                            </span>
                         </div>
                         <p className="text-xs text-muted-foreground line-clamp-1">{stripHtml(s.description)}</p>
                         <div className="flex gap-1 flex-wrap pt-1">
                            {s.technologies?.map(sanitizeTechTag).filter(Boolean).slice(0, 4).map((t: any) => (
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
                      No recent market signals.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
