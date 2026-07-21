import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface Props {
  data: Array<{
    connectorId: string;
    ingested: number;
  }>;
}

const COLORS = [
  "var(--color-primary)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function SourceChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No data available</div>;
  }

  // Transform data
  const chartData = data
    .map(c => ({
      name: c.connectorId.toUpperCase().replace('-STUB', ''),
      value: c.ingested
    }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No ingestion data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-md border border-border bg-card px-3 py-2 shadow-sm text-xs">
                  <span className="font-medium mr-2">{payload[0].name}:</span>
                  <span className="num text-primary">{payload[0].value}</span>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36} 
          iconType="circle" 
          wrapperStyle={{ fontSize: '11px', color: 'var(--color-muted-foreground)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
