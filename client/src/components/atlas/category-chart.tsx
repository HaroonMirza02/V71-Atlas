import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const CATEGORY_LABELS: Record<string, string> = {
  TECHNOLOGY_TREND: "Technology Trend",
  BUSINESS_OPPORTUNITY: "Business Opportunity",
  PAIN_POINT: "Pain Point",
  POTENTIAL_CLIENT: "Potential Client",
  JOB_POSTING: "Job Posting",
  OPEN_SOURCE: "Open Source",
  PRODUCT_LAUNCH: "Product Launch",
  MARKET_NEWS: "Market News",
  FUNDING: "Funding",
  OTHER: "Other",
};

interface Props {
  data: Record<string, number>;
}

export function CategoryChart({ data }: Props) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-sans">No data available</div>;
  }

  // Transform data for recharts and sort by value descending across all 10 categories
  const chartData = Object.entries(data)
    .map(([key, value]) => {
      const formattedName = CATEGORY_LABELS[key] || key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      return {
        name: formattedName,
        rawKey: key,
        value,
      };
    })
    .sort((a, b) => b.value - a.value);

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
          width={140}
        />
        <Tooltip
          cursor={{ fill: "#f4f4f5" }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-xs text-xs font-sans">
                  <span className="font-medium text-foreground">{payload[0].payload.name}: </span>
                  <span className="num font-semibold text-foreground">{payload[0].value}</span>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar 
          dataKey="value" 
          fill="#18181b" 
          radius={[0, 4, 4, 0]} 
          barSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
