import React, { useState } from 'react';
import { useSignals } from '@/hooks/use-queries';
import { TopNav } from '@/components/atlas/top-nav';
import { PageHeader } from '@/components/atlas/section-header';
import { OpportunityCard } from '@/components/atlas/opportunity-card';
import { stripHtml } from '@/lib/utils';
import { Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Signals() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  
  const { data, isLoading } = useSignals({ 
     limit: 20, 
     ...(status && { status }),
     ...(category && { category })
  });
  
  const signals = data?.data || [];
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNav />
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:py-10 animate-in fade-in duration-300">
        <PageHeader
          eyebrow={isLoading ? "Loading signals..." : `${signals.length} matching signals`}
          title="Market Signals"
          description="Real-time, ingested opportunities ready for review and qualification."
        />

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-border px-3 text-[12px] sm:max-w-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search signals..."
              className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-border pl-3 pr-1 text-[12px]">
            <span className="text-muted-foreground">Status</span>
            <select value={status} onChange={e => setStatus(e.target.value)} className="h-8 cursor-pointer bg-transparent pr-2 text-foreground outline-none">
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="REJECTED">Rejected</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-border pl-3 pr-1 text-[12px]">
            <span className="text-muted-foreground">Category</span>
            <select value={category} onChange={e => setCategory(e.target.value)} className="h-8 cursor-pointer bg-transparent pr-2 text-foreground outline-none">
              <option value="">All</option>
              <option value="JOB_POSTING">Job Posting</option>
              <option value="TECHNOLOGY_TREND">Tech Trend</option>
              <option value="OPEN_SOURCE">Open Source</option>
              <option value="BUSINESS_OPPORTUNITY">Biz Opp</option>
            </select>
          </label>

          {(q || status || category) && (
            <button
              onClick={() => { setQ(''); setStatus(''); setCategory(''); }}
              className="inline-flex h-8 items-center gap-1 px-2 text-[12px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Reset
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : signals.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md text-center">
            <p className="text-xs font-medium text-muted-foreground">No matching signals</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">Try a broader search</h3>
            <button onClick={() => { setQ(''); setStatus(''); setCategory(''); }} className="mt-4 inline-flex h-8 items-center rounded-md bg-foreground px-3 text-[12px] text-background">
              Reset filters
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
             {/* We adapt the OpportunityCard to take a Signal */}
             {signals.map((s: any) => (
                <div key={s._id} className="flex flex-col justify-between rounded-lg border border-border bg-card p-5 card-lift">
                  <div>
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] uppercase font-bold text-muted-foreground">{s.sourceId}</span>
                       <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.status === 'PENDING' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                         {s.status}
                       </span>
                    </div>
                    <h3 className="mt-3 text-[15px] font-semibold leading-snug">{s.title}</h3>
                    <p className="mt-2 text-[13px] text-muted-foreground line-clamp-3">{stripHtml(s.description) || 'No description provided.'}</p>
                  </div>
                  <div className="mt-5">
                    <div className="flex flex-wrap gap-1.5">
                      {s.technologies?.slice(0, 4).map((tech: string) => (
                        <span key={tech} className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                          {tech}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                       <span className="text-[11px] text-muted-foreground">{new Date(s.discoveredAt).toLocaleDateString()}</span>
                       <a href={s.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline">View Source</a>
                    </div>
                    {s.status === 'PENDING' && (
                       <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/50 pt-3">
                         <button onClick={() => toast.success('Signal qualified & moved to review pipeline')} className="rounded bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors">Qualify Lead</button>
                         <button onClick={() => toast.success('Signal archived')} className="rounded bg-muted px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted/80 transition-colors">Archive</button>
                       </div>
                    )}
                  </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
