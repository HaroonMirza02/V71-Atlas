import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface Props {
  data: Record<string, number>;
}

const LIGHT_STATUS_COLORS: Record<string, string> = {
  PENDING: "#2563eb",  // Clean blue
  REVIEWED: "#059669", // Emerald green
  REJECTED: "#dc2626", // Clean red
  ARCHIVED: "#64748b", // Muted slate
};

export function StatusChart({ data }: Props) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-sans">No pipeline status data available</div>;
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
          cy="42%"
          innerRadius="48%"
          outerRadius="72%"
          paddingAngle={4}
          minAngle={15}
          dataKey="value"
          stroke="#ffffff"
          strokeWidth={2}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={LIGHT_STATUS_COLORS[entry.name] || "#18181b"} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-xs text-xs font-sans">
                  <span className="font-medium capitalize text-foreground mr-2">{payload[0]?.name?.toString().toLowerCase()}:</span>
                  <span className="num font-semibold text-foreground">{payload[0]?.value}</span>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={32} 
          iconType="circle" 
          formatter={(value) => <span className="capitalize text-foreground font-sans text-xs">{String(value).toLowerCase()}</span>}
          wrapperStyle={{ fontSize: '11px', color: '#71717a', fontFamily: 'var(--font-sans)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
