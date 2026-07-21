import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  data: Record<string, number>;
}

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
];

export function StatusChart({ data }: Props) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No data available</div>;
  }

  const chartData = Object.entries(data).map(([key, value]) => ({
    name: key,
    value,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius="50%"
          outerRadius="75%"
          paddingAngle={5}
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
                <div className="rounded-md border border-border bg-card px-3 py-2 shadow text-xs">
                  <span className="font-medium capitalize">{payload[0].name.toLowerCase()}: </span>
                  <span className="num font-semibold text-primary">{payload[0].value}</span>
                </div>
              );
            }
            return null;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
