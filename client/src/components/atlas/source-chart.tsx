import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface ConnectorMetric {
  connectorId: string;
  displayName?: string;
  ingested: number;
}

interface Props {
  data: ConnectorMetric[];
}

const LIGHT_COLORS = [
  "#18181b", // Near black / primary
  "#2563eb", // Blue
  "#059669", // Emerald
  "#d97706", // Amber
  "#7c3aed", // Violet
];

export function SourceChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-sans">No connector metrics available</div>;
  }

  // 1. Live connectors (GitHub, RSS, Remotive, Hacker News, Product Hunt)
  const liveConnectors = data.filter((c) => {
    const id = c.connectorId.toLowerCase();
    return !id.includes("stub") || id === "producthunt";
  });

  // 2. Stub connectors awaiting credentials (Upwork, LinkedIn, Freelancer) - excluding any producthunt-stub
  const stubConnectors = data.filter((c) => {
    const id = c.connectorId.toLowerCase();
    return id.includes("stub") && !id.includes("producthunt");
  });

  const chartData = liveConnectors
    .map((c) => ({
      name: c.displayName || c.connectorId.toUpperCase(),
      value: c.ingested,
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 min-h-0">
        {chartData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-sans">
            No ingestion data from live connectors yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="42%"
                innerRadius="48%"
                outerRadius="72%"
                paddingAngle={4}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={LIGHT_COLORS[index % LIGHT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-xs text-xs font-sans">
                        <span className="font-medium text-foreground mr-2">{payload[0].name}:</span>
                        <span className="num font-semibold text-foreground">{payload[0].value}</span>
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
                wrapperStyle={{ fontSize: '11px', color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-sans)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Visually distinct section for Stub Connectors */}
      {stubConnectors.length > 0 && (
        <div className="pt-2 border-t border-border/60 mt-1 flex flex-wrap items-center justify-between gap-1 text-[11px]">
          <span className="text-muted-foreground font-medium text-[11px]">Awaiting Credentials:</span>
          <div className="flex flex-wrap gap-1.5">
            {stubConnectors.map((c) => (
              <span
                key={c.connectorId}
                className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium border border-border/80 text-[10px]"
                title="Stub connector waiting for API keys"
              >
                {c.displayName || c.connectorId.replace("-stub", "").toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
