import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from "recharts";

interface Props {
  data: Array<{
    connectorId: string;
    fetched: number;
    ingested: number;
  }>;
}

export function YieldChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No data available</div>;
  }

  // Transform data for recharts
  const chartData = data.map(c => ({
    name: c.connectorId.toUpperCase().replace('-STUB', ''),
    fetched: c.fetched,
    ingested: c.ingested
  })).filter(c => c.fetched > 0 || c.ingested > 0);

  if (chartData.length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No sync history yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
          dy={10}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--color-accent)", opacity: 0.4 }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-md border border-border bg-card px-3 py-2 shadow text-xs">
                  <div className="font-semibold mb-1">{payload[0].payload.name}</div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Fetched:</span>
                    <span className="num font-medium text-primary">{payload[0].value}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Ingested:</span>
                    <span className="num font-medium text-indigo-500">{payload[1]?.value || 0}</span>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
        <Bar dataKey="fetched" name="Raw Fetched" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="ingested" name="Qualified Ingests" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
