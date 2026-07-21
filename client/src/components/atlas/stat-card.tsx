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
    <div className="group rounded-lg border border-border bg-card p-4 card-lift sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {typeof delta === "number" && (
          <span
            className={`num inline-flex items-center gap-0.5 text-[11px] ${
              positive ? "text-[color:var(--success)]" : "text-destructive"
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
      <div className="mt-4 flex items-baseline gap-1">
        <CountUp
          value={value}
          format={format}
          className="num text-3xl leading-none font-semibold tracking-tight sm:text-[38px]"
        />
        {suffix && <span className="num text-lg text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
