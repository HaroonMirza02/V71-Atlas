import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  data: Record<string, number>;
}

export function CategoryChart({ data }: Props) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No data available</div>;
  }

  // Transform data for recharts and sort by value descending
  const chartData = Object.entries(data)
    .map(([key, value]) => ({
      name: key.replace(/_/g, " "),
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7); // Show top 7

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} layout="vertical">
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          width={130}
        />
        <Tooltip
          cursor={{ fill: "var(--color-accent)" }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-md border border-border bg-card px-3 py-2 shadow text-xs">
                  <span className="font-medium">{payload[0].payload.name}: </span>
                  <span className="num font-semibold text-primary">{payload[0].value}</span>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar 
          dataKey="value" 
          fill="var(--color-chart-1)" 
          radius={[0, 4, 4, 0]} 
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
