import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface DailySignup {
  date: string;
  count: number;
  confirmed: number;
}

interface SignupsChartProps {
  data: DailySignup[];
  className?: string;
  height?: number;
  showConfirmed?: boolean;
}

export function SignupsChart({
  data,
  className,
  height = 300,
  showConfirmed = true,
}: SignupsChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      dateLabel: format(parseISO(item.date), "MMM d"),
      dateShort: format(parseISO(item.date), "d"),
    }));
  }, [data]);

  const maxValue = useMemo(() => {
    return Math.max(...data.map((d) => d.count), 1);
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
        No data for this period
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="signupsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="confirmedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="dateLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickMargin={8}
            minTickGap={40}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickMargin={8}
            domain={[0, Math.ceil(maxValue * 1.1)]}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border border-border bg-popover p-3 shadow-md">
                  <p className="text-xs text-muted-foreground mb-1">
                    {format(parseISO(data.date), "EEEE, MMM d, yyyy")}
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2" />
                      {data.count} signups
                    </p>
                    {showConfirmed && (
                      <p className="text-sm text-muted-foreground">
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
                        {data.confirmed} confirmed
                      </p>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#signupsGradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "hsl(var(--primary))",
              stroke: "hsl(var(--background))",
              strokeWidth: 2,
            }}
          />
          {showConfirmed && (
            <Area
              type="monotone"
              dataKey="confirmed"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              fill="url(#confirmedGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "hsl(var(--chart-2))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MiniSparklineProps {
  data: number[];
  className?: string;
  color?: string;
}

export function MiniSparkline({
  data,
  className,
  color = "hsl(var(--primary))",
}: MiniSparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }));

  if (data.length === 0) {
    return null;
  }

  return (
    <div className={cn("h-8 w-24", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill="url(#sparklineGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
