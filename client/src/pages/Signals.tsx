import React, { useState, useEffect, useMemo } from 'react';
import { useSignals } from '@/hooks/use-queries';
import { api } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TopNav } from '@/components/atlas/top-nav';
import { PageHeader } from '@/components/atlas/section-header';
import { stripHtml } from '@/lib/utils';
import { Loader2, Search, X, ChevronLeft, ChevronRight, TrendingUp, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function Signals() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  
  // Pagination State
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const currentCursor = cursorHistory.length > 0 ? cursorHistory[cursorHistory.length - 1] : undefined;
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 500);
    return () => clearTimeout(timer);
  }, [q]);

  // Reset pagination on filter change
  useEffect(() => {
    setCursorHistory([]);
  }, [debouncedQ, status, category]);

  const { data, isLoading, isFetching } = useSignals({ 
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
    onSuccess: (_, variables) => {
      toast.success(`Signal ${variables.newStatus === 'REVIEWED' ? 'qualified' : 'archived'}`);
      queryClient.invalidateQueries({ queryKey: ['signals'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
    onError: () => {
      toast.error('Failed to update signal status');
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
    if (nextCursor) {
      setCursorHistory([...cursorHistory, nextCursor]);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const newHistory = [...cursorHistory];
      newHistory.pop();
      setCursorHistory(newHistory);
    }
  };

  // Compute Tech Stack KPIs
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNav />
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:py-10 animate-in fade-in duration-300">
        <PageHeader
          eyebrow={isLoading ? "Loading signals..." : `Page ${cursorHistory.length + 1}`}
          title="Market Signals"
          description="Real-time, ingested opportunities ready for review and qualification."
        />

        {/* Tech Stack KPI Banner */}
        {topTechs.length > 0 && (
          <div className="mt-6 flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <TrendingUp className="h-4 w-4" />
              Top Tech In View:
            </div>
            <div className="flex flex-wrap gap-2">
              {topTechs.map(([tech, count]) => (
                <div key={tech} className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-medium border border-border">
                  <Code2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground">{tech}</span>
                  <span className="text-muted-foreground">({count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-border px-3 text-[12px] sm:max-w-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search signals..."
              className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={status || "ALL"} onValueChange={(val) => setStatus(val === "ALL" ? "" : val)}>
              <SelectTrigger className="w-[140px] h-9 text-[12px] bg-transparent">
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
          
          <div className="flex items-center gap-2">
            <Select value={category || "ALL"} onValueChange={(val) => setCategory(val === "ALL" ? "" : val)}>
              <SelectTrigger className="w-[160px] h-9 text-[12px] bg-transparent">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="JOB_POSTING">Job Posting</SelectItem>
                <SelectItem value="TECHNOLOGY_TREND">Tech Trend</SelectItem>
                <SelectItem value="OPEN_SOURCE">Open Source</SelectItem>
                <SelectItem value="BUSINESS_OPPORTUNITY">Biz Opp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(q || status || category) && (
            <button
              onClick={() => { setQ(''); setStatus(''); setCategory(''); }}
              className="inline-flex h-8 items-center gap-1 px-2 text-[12px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Reset
            </button>
          )}

          {/* Pagination Controls */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={cursorHistory.length === 0 || isFetching}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextPage}
              disabled={!hasMore || isFetching}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : signals.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md text-center">
            <p className="text-xs font-medium text-muted-foreground">No matching signals</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">Try a broader search</h3>
            <button onClick={() => { setQ(''); setStatus(''); setCategory(''); }} className="mt-4 inline-flex h-8 items-center rounded-md bg-foreground px-3 text-[12px] text-background hover:bg-foreground/90 transition-colors">
              Reset filters
            </button>
          </div>
        ) : (
          <>
            <div className={`mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-50 pointer-events-none' : ''}`}>
              {signals.map((s: any) => (
                <div key={s._id} className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all duration-300">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase border-border bg-background">
                          {s.sourceId}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] uppercase font-bold tracking-wide ${s.status === 'PENDING' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' : s.status === 'REVIEWED' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20'}`}>
                          {s.status}
                        </Badge>
                    </div>
                    <h3 className="text-[16px] font-semibold leading-tight tracking-tight text-foreground line-clamp-2">
                      {s.title}
                    </h3>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground line-clamp-3">
                      {stripHtml(s.description) || 'No details available.'}
                    </p>
                  </div>
                  <div className="mt-5">
                    {/* Compulsory Tech Stack Section */}
                    {s.technologies && s.technologies.length > 0 && (
                      <div className="mb-4 space-y-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tech Stack</span>
                        <div className="flex flex-wrap gap-1.5">
                          {s.technologies.slice(0, 5).map((tech: string) => (
                            <Badge key={tech} variant="secondary" className="bg-primary/10 text-primary border-none text-[11px] font-semibold">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-border pt-4">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {new Date(s.discoveredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <a href={s.url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">
                          View Source <ChevronRight className="h-3 w-3" />
                        </a>
                    </div>

                    {s.status === 'PENDING' && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => handleReview(s._id, 'REVIEWED')} 
                            disabled={reviewMutation.isPending}
                            className="rounded-lg bg-primary px-2 py-2 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            Qualify
                          </button>
                          <button 
                            onClick={() => handleReview(s._id, 'ARCHIVED')} 
                            disabled={reviewMutation.isPending}
                            className="rounded-lg bg-accent px-2 py-2 text-[12px] font-semibold text-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
                          >
                            Archive
                          </button>
                          <button 
                            onClick={() => handleReview(s._id, 'REJECTED')} 
                            disabled={reviewMutation.isPending}
                            className="rounded-lg bg-destructive/10 px-2 py-2 text-[12px] font-semibold text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Bottom Pagination */}
            <div className="mt-8 flex items-center justify-between border-t border-border pt-4 pb-8">
              <span className="text-sm text-muted-foreground">
                Showing {signals.length} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={cursorHistory.length === 0 || isFetching}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!hasMore || isFetching}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
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
