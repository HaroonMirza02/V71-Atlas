import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

interface ConnectorMetric {
  connectorId: string;
  displayName?: string;
  fetched: number;
  consecutiveErrors: number;
}

interface Props {
  data: ConnectorMetric[];
}

export function ConnectorErrorChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-sans">No connector telemetry available</div>;
  }

  // Live connectors only, sorted worst (highest errors) to best
  const chartData = data
    .filter(c => !c.connectorId.toLowerCase().includes("stub"))
    .map(c => {
      const errorRate = c.fetched > 0 ? Math.round((c.consecutiveErrors / (c.fetched + c.consecutiveErrors)) * 100) : (c.consecutiveErrors > 0 ? 100 : 0);
      return {
        name: c.displayName || c.connectorId.toUpperCase(),
        errors: c.consecutiveErrors,
        fetched: c.fetched,
        errorRate,
      };
    })
    .sort((a, b) => b.errors - a.errors);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} layout="vertical">
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 11, fill: "#71717a", fontFamily: "var(--font-sans)" }}
          width={130}
        />
        <Tooltip
          cursor={{ fill: "#f4f4f5" }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload;
              return (
                <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-xs text-xs font-sans">
                  <div className="font-semibold text-foreground">{item.name}</div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-muted-foreground">Consecutive Errors:</span>
                    <span className="num font-semibold text-rose-600">{item.errors}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-muted-foreground">Records Fetched:</span>
                    <span className="num font-semibold text-foreground">{item.fetched}</span>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar 
          dataKey="errors" 
          radius={[0, 4, 4, 0]} 
          barSize={18}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.errors > 0 ? "#dc2626" : "#10b981"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
