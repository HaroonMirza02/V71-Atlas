import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { sanitizeTechTag } from "@/lib/utils";

interface SignalItem {
  technologies?: string[];
}

interface Props {
  data?: Array<{ technology: string; count: number }>;
  signals?: SignalItem[];
}

export function TopTechChart({ data, signals }: Props) {
  let chartData: Array<{ name: string; value: number }> = [];

  if (data && data.length > 0) {
    chartData = data
      .map((item) => {
        const sanitized = sanitizeTechTag(item.technology);
        return sanitized ? { name: sanitized, value: item.count } : null;
      })
      .filter(Boolean) as Array<{ name: string; value: number }>;
  } else if (signals && signals.length > 0) {
    const counts: Record<string, number> = {};
    signals.forEach((s) => {
      if (s.technologies && Array.isArray(s.technologies)) {
        s.technologies.forEach((tech: string) => {
          const sanitized = sanitizeTechTag(tech);
          if (sanitized) {
            counts[sanitized] = (counts[sanitized] || 0) + 1;
          }
        });
      }
    });

    chartData = Object.entries(counts)
      .map(([tech, count]) => ({
        name: tech,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
  }

  chartData = chartData.slice(0, 6);

  if (chartData.length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-sans">No technology data available</div>;
  }

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
          width={110}
        />
        <Tooltip
          cursor={{ fill: "#f4f4f5" }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-xs text-xs font-sans">
                  <span className="font-medium text-foreground">{payload[0].payload.name}: </span>
                  <span className="num font-semibold text-foreground">{payload[0].value} mentions</span>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar 
          dataKey="value" 
          fill="#2563eb" 
          radius={[0, 4, 4, 0]} 
          barSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
