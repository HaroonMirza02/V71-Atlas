import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { CountUp } from "./count-up";

interface Props {
  label: string;
  value: number;
  delta?: number;
  suffix?: string;
  format?: (v: number) => string;
  hint?: string;
}

export function StatCard({ label, value, delta, suffix, format, hint }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="group rounded-xl border border-border bg-white p-4 shadow-xs hover:border-border/80 transition-all sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground font-sans">{label}</p>
        {typeof delta === "number" && (
          <span
            className={`num inline-flex items-center gap-0.5 text-[11px] font-medium ${
              positive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <CountUp
          value={value}
          format={format}
          className="num text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        />
        {suffix && <span className="num text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground font-sans">{hint}</p>}
    </div>
  );
}
