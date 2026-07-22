import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DailyPoint {
  date: string;
  count: number;
}

interface Props {
  data: DailyPoint[];
}

export function IngestionTrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-sans">No daily ingestion trend data available</div>;
  }

  // Format date strings into short month/day labels
  const chartData = data.map(point => {
    const d = new Date(point.date);
    const label = isNaN(d.getTime()) ? point.date : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return {
      label,
      fullDate: point.date,
      count: point.count,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="label" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: "#71717a", fontFamily: "var(--font-sans)" }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: "#71717a", fontFamily: "var(--font-mono)" }} 
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload;
              return (
                <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-xs text-xs font-sans">
                  <div className="text-muted-foreground text-[10px] num">{item.fullDate}</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-medium text-foreground">Ingested Signals:</span>
                    <span className="num font-semibold text-foreground">{item.count}</span>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Area 
          type="monotone" 
          dataKey="count" 
          stroke="#18181b" 
          strokeWidth={2} 
          fillOpacity={1} 
          fill="url(#trendGradient)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
