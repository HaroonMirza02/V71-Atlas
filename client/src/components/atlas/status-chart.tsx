interface Props {
  data: Record<string, number>;
}

export function StatusChart({ data }: Props) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-sans">No pipeline status data available</div>;
  }

  const total = Object.values(data).reduce((acc, val) => acc + val, 0);
  const pending = data['PENDING'] || 0;
  const reviewed = data['REVIEWED'] || 0;
  const archived = data['ARCHIVED'] || 0;
  const rejected = data['REJECTED'] || 0;

  const reviewedPct = total > 0 ? (reviewed / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const archivedPct = total > 0 ? (archived / total) * 100 : 0;
  const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;

  return (
    <div className="flex flex-col justify-center h-full w-full space-y-5 px-1 font-sans">
      {/* Primary Highlight Badge */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl font-semibold tracking-tight text-foreground num">
            {reviewedPct.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground block">Signals Reviewed & Qualified</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-rose-600 num">
            {pending.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground block font-medium">Awaiting Triage</span>
        </div>
      </div>

      {/* High-Contrast Stacked Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-secondary border border-border/80">
          <div 
            style={{ width: `${Math.max(reviewedPct, reviewed > 0 ? 2 : 0)}%` }} 
            className="bg-emerald-600 transition-all duration-300"
            title={`Reviewed: ${reviewed.toLocaleString()} (${reviewedPct.toFixed(1)}%)`}
          />
          <div 
            style={{ width: `${pendingPct}%` }} 
            className="bg-blue-600 transition-all duration-300"
            title={`Pending: ${pending.toLocaleString()} (${pendingPct.toFixed(1)}%)`}
          />
          <div 
            style={{ width: `${archivedPct}%` }} 
            className="bg-slate-400 transition-all duration-300"
            title={`Archived: ${archived.toLocaleString()} (${archivedPct.toFixed(1)}%)`}
          />
          <div 
            style={{ width: `${rejectedPct}%` }} 
            className="bg-rose-500 transition-all duration-300"
            title={`Rejected: ${rejected.toLocaleString()} (${rejectedPct.toFixed(1)}%)`}
          />
        </div>

        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>0%</span>
          <span>Pipeline Progress</span>
          <span>100%</span>
        </div>
      </div>

      {/* Labeled Status Breakdown Legend Grid */}
      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between rounded-md bg-emerald-50/50 border border-emerald-100 p-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
            <span className="text-xs font-medium text-foreground">Reviewed</span>
          </div>
          <span className="text-xs font-semibold text-emerald-800 num">{reviewed.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between rounded-md bg-blue-50/50 border border-blue-100 p-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
            <span className="text-xs font-medium text-foreground">Pending</span>
          </div>
          <span className="text-xs font-semibold text-blue-800 num">{pending.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between rounded-md bg-slate-50 border border-slate-200 p-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
            <span className="text-xs font-medium text-foreground">Archived</span>
          </div>
          <span className="text-xs font-semibold text-slate-700 num">{archived.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between rounded-md bg-rose-50/50 border border-rose-100 p-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-rose-600 shrink-0" />
            <span className="text-xs font-medium text-foreground">Rejected</span>
          </div>
          <span className="text-xs font-semibold text-rose-800 num">{rejected.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
