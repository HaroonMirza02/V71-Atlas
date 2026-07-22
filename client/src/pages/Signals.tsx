import React, { useState, useEffect, useMemo } from 'react';
import { useSignals } from '@/hooks/use-queries';
import { api } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TopNav } from '@/components/atlas/top-nav';
import { PageHeader } from '@/components/atlas/section-header';
import { CATEGORY_LABELS } from '@/components/atlas/category-chart';
import { stripHtml } from '@/lib/utils';
import { Search, X, ChevronLeft, ChevronRight, TrendingUp, Code2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const ALL_CATEGORIES = [
  { value: "TECHNOLOGY_TREND", label: "Technology Trend" },
  { value: "BUSINESS_OPPORTUNITY", label: "Business Opportunity" },
  { value: "PAIN_POINT", label: "Pain Point" },
  { value: "POTENTIAL_CLIENT", label: "Potential Client" },
  { value: "JOB_POSTING", label: "Job Posting" },
  { value: "OPEN_SOURCE", label: "Open Source" },
  { value: "PRODUCT_LAUNCH", label: "Product Launch" },
  { value: "MARKET_NEWS", label: "Market News" },
  { value: "FUNDING", label: "Funding" },
  { value: "OTHER", label: "Other" },
];

export default function Signals() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  
  // Pagination State
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const currentCursor = cursorHistory.length > 0 ? cursorHistory[cursorHistory.length - 1] : undefined;
  
  // Debounce search input by 500ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 500);
    return () => clearTimeout(timer);
  }, [q]);

  // Reset pagination when filters or search change
  useEffect(() => {
    setCursorHistory([]);
  }, [debouncedQ, status, category]);

  const { data, isLoading, isFetching, isError, refetch } = useSignals({ 
     limit: 20, 
     ...(status && { status }),
     ...(category && { category }),
     ...(debouncedQ && { search: debouncedQ }),
     ...(currentCursor && { cursor: currentCursor })
  });
  
  const queryClient = useQueryClient();
  const reviewMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      await api.put(`/signals/${id}/review`, { status: newStatus });
    },
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['signals'] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ['signals'] });
      
      queryClient.setQueriesData({ queryKey: ['signals'] }, (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((s: any) => s._id === id ? { ...s, status: newStatus } : s)
        };
      });
      return { previousQueries };
    },
    onSuccess: (_, variables) => {
      toast.success(`Signal marked as ${variables.newStatus === 'REVIEWED' ? 'qualified' : variables.newStatus.toLowerCase()}`);
    },
    onError: (_err, _variables, context: any) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to update signal status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['signals'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    }
  });

  const handleReview = (id: string, newStatus: string) => {
    reviewMutation.mutate({ id, newStatus });
  };
  
  const signals = data?.data || [];
  const pagination = data?.pagination;
  const nextCursor = pagination?.cursor;
  const hasMore = pagination?.hasMore || false;

  const handleNextPage = () => {
    if (nextCursor && !isFetching) {
      setCursorHistory([...cursorHistory, nextCursor]);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0 && !isFetching) {
      const newHistory = [...cursorHistory];
      newHistory.pop();
      setCursorHistory(newHistory);
    }
  };

  // Memoize top technologies calculation
  const topTechs = useMemo(() => {
    if (!signals.length) return [];
    const counts: Record<string, number> = {};
    signals.forEach((s: any) => {
      if (s.technologies && Array.isArray(s.technologies)) {
        s.technologies.forEach((tech: string) => {
          counts[tech] = (counts[tech] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [signals]);
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <TopNav />
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:py-8 animate-in fade-in duration-300">
        <PageHeader
          eyebrow={isLoading ? "Loading signals..." : `Page ${cursorHistory.length + 1}`}
          title="Market Signals"
          description="Real-time, ingested revenue opportunities ready for review and qualification."
        />

        {/* Tech Stack KPI Banner */}
        {topTechs.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs uppercase tracking-wider">
              <TrendingUp className="h-4 w-4 text-foreground" />
              <span>Top Tech In View:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {topTechs.map(([tech, count]) => (
                <div key={tech} className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium border border-border">
                  <Code2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground">{tech}</span>
                  <span className="text-muted-foreground num font-semibold">({count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="inline-flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs focus-within:ring-2 focus-within:ring-ring sm:max-w-xs shadow-xs">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search signals by keyword..."
              className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground text-xs"
            />
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Select value={status || "ALL"} onValueChange={(val) => setStatus(val === "ALL" ? "" : val)}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-white border-border shadow-xs focus:ring-2 focus:ring-ring">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Category Filter — All 10 Categories */}
          <div className="flex items-center gap-2">
            <Select value={category || "ALL"} onValueChange={(val) => setCategory(val === "ALL" ? "" : val)}>
              <SelectTrigger className="w-[170px] h-9 text-xs bg-white border-border shadow-xs focus:ring-2 focus:ring-ring">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {ALL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters Action */}
          {(q || status || category) && (
            <button
              onClick={() => { setQ(''); setStatus(''); setCategory(''); }}
              className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            >
              <X className="h-3.5 w-3.5" /> Reset filters
            </button>
          )}

          {/* Pagination Controls Header */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={cursorHistory.length === 0 || isFetching}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white hover:bg-secondary disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs"
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={handleNextPage}
              disabled={!hasMore || isFetching}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white hover:bg-secondary disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs"
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Error State */}
        {isError ? (
          <div className="mt-12 rounded-xl border border-rose-200 bg-rose-50 p-8 text-center max-w-md mx-auto">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-rose-900">Failed to fetch signals</h3>
            <p className="mt-1 text-xs text-rose-700">An error occurred while communicating with the server.</p>
            <button
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        ) : isLoading ? (
          /* Loading State Skeleton Grid */
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-white border border-border p-5 shadow-xs" />
            ))}
          </div>
        ) : signals.length === 0 ? (
          /* Empty State */
          <div className="mx-auto mt-16 max-w-md text-center rounded-xl border border-border bg-white p-8 shadow-xs">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">No matching signals</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">Try a broader search or reset filters</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              No market opportunities match your currently selected status, category, or search keyword.
            </p>
            <button 
              onClick={() => { setQ(''); setStatus(''); setCategory(''); }} 
              className="mt-5 inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-xs font-medium text-background hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Reset filters
            </button>
          </div>
        ) : (
          /* Signals List Grid */
          <>
            <div className={`mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-50 pointer-events-none' : ''}`}>
              {signals.map((s: any) => (
                <div 
                  key={s._id} 
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-white p-5 hover:border-border/90 hover:shadow-sm transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase border-border bg-secondary font-mono">
                          {s.sourceId}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] uppercase font-bold tracking-wide font-mono ${
                            s.status === 'PENDING' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                            s.status === 'REVIEWED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                            s.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          }`}
                        >
                          {s.status}
                        </Badge>
                    </div>

                    <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {stripHtml(s.description) || 'No details available.'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/60">
                    {/* Tech Stack Section */}
                    {s.technologies && s.technologies.length > 0 && (
                      <div className="mb-3 space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tech Stack</span>
                        <div className="flex flex-wrap gap-1">
                          {s.technologies.slice(0, 5).map((tech: string) => (
                            <span key={tech} className="bg-secondary text-foreground text-[10px] font-medium border border-border rounded px-1.5 py-0.5">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-medium text-muted-foreground num">
                          {new Date(s.discoveredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <a 
                          href={s.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[11px] font-medium text-foreground hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                        >
                          View Source <ChevronRight className="h-3 w-3" />
                        </a>
                    </div>

                    {/* Action buttons for PENDING signals */}
                    {s.status === 'PENDING' && (
                        <div className="mt-3 grid grid-cols-3 gap-2 pt-2 border-t border-border/40">
                          <button 
                            onClick={() => handleReview(s._id, 'REVIEWED')} 
                            disabled={reviewMutation.isPending}
                            className="rounded-lg bg-foreground px-2 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          >
                            Qualify
                          </button>
                          <button 
                            onClick={() => handleReview(s._id, 'ARCHIVED')} 
                            disabled={reviewMutation.isPending}
                            className="rounded-lg bg-secondary px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          >
                            Archive
                          </button>
                          <button 
                            onClick={() => handleReview(s._id, 'REJECTED')} 
                            disabled={reviewMutation.isPending}
                            className="rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Bottom Pagination Bar */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-border pt-4 pb-8 gap-4">
              <span className="text-xs text-muted-foreground num">
                Showing <strong className="text-foreground">{signals.length}</strong> records on Page <strong className="text-foreground">{cursorHistory.length + 1}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={cursorHistory.length === 0 || isFetching}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!hasMore || isFetching}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
