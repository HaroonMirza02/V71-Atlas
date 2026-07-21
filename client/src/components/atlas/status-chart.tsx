import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface Props {
  data: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "var(--color-primary)",
  REVIEWED: "#10b981", // success green
  REJECTED: "#ef4444", // destructive red
  ARCHIVED: "#64748b", // muted slate
};

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
          cy="45%"
          innerRadius="50%"
          outerRadius="75%"
          paddingAngle={4}
          minAngle={15}
          dataKey="value"
          stroke="none"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "var(--color-chart-1)"} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-md border border-border bg-card px-3 py-2 shadow text-xs">
                  <span className="font-medium capitalize mr-2">{payload[0].name.toLowerCase()}:</span>
                  <span className="num font-semibold" style={{ color: payload[0].payload.fill }}>{payload[0].value}</span>
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
          formatter={(value) => <span className="capitalize">{value.toLowerCase()}</span>}
          wrapperStyle={{ fontSize: '11px', color: 'var(--color-muted-foreground)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
