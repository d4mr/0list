import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn, formatNumber } from "@/lib/utils";

interface SourceData {
  source: string;
  count: number;
  confirmed?: number;
  rate?: number;
}

interface SourcesChartProps {
  data: SourceData[];
  className?: string;
  height?: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function SourcesChart({
  data,
  className,
  height = 200,
}: SourcesChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      displayName: item.source === "direct" ? "Direct" : item.source,
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-muted-foreground text-sm",
          className
        )}
        style={{ height }}
      >
        No source data available
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="hsl(var(--border))"
          />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickMargin={8}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickMargin={8}
            width={80}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border border-border bg-popover p-3 shadow-md">
                  <p className="text-sm font-medium mb-1">{data.displayName}</p>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p>{formatNumber(data.count)} signups</p>
                    {data.confirmed !== undefined && (
                      <p>{formatNumber(data.confirmed)} confirmed ({data.rate}%)</p>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SourcesListProps {
  data: SourceData[];
  className?: string;
  maxItems?: number;
}

export function SourcesList({
  data,
  className,
  maxItems = 5,
}: SourcesListProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const displayData = data.slice(0, maxItems);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px]">
        <p className="text-sm text-muted-foreground/50">
          No referral sources yet
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {displayData.map((item, index) => {
        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.source} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">
                {item.source === "direct" ? "Direct" : item.source}
              </span>
              <span className="text-muted-foreground font-mono tabular-nums">
                {formatNumber(item.count)} ({percentage}%)
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: COLORS[index % COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
      {data.length > maxItems && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          +{data.length - maxItems} more sources
        </p>
      )}
    </div>
  );
}
