import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { cn, formatNumber } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number;
  previousValue?: number;
  change?: number;
  suffix?: string;
  description?: string;
  icon?: Parameters<typeof HugeiconsIcon>[0]["icon"];
  className?: string;
  loading?: boolean;
  isFetching?: boolean;
}

export function MetricCard({
  label,
  value,
  previousValue,
  change,
  suffix,
  description,
  icon,
  className,
  loading,
  isFetching,
}: MetricCardProps) {
  const hasChange = change !== undefined && change !== 0;
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  // Flash animation when data loads (triggered when isFetching goes from true to false)
  const [flash, setFlash] = useState(false);
  const wasFetchingRef = useRef(false);

  useEffect(() => {
    // Flash when fetching completes (isFetching goes from true to false)
    if (wasFetchingRef.current && !isFetching) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(timer);
    }
    wasFetchingRef.current = isFetching ?? false;
  }, [isFetching]);

  // Delayed loading indicator (show spinner after 100ms)
  const [showSpinner, setShowSpinner] = useState(false);
  useEffect(() => {
    if (isFetching) {
      const timer = setTimeout(() => setShowSpinner(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowSpinner(false);
    }
  }, [isFetching]);

  if (loading) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 w-3 rounded bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-20 rounded bg-muted animate-pulse mb-1" />
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 relative", className)}>
      {/* Loading spinner overlay */}
      {showSpinner && (
        <div className="absolute top-2 right-2">
          <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Label */}
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon && <HugeiconsIcon icon={icon} size={14} />}
        <span className="text-xs font-medium">{label}</span>
      </div>

      {/* Value with flash animation */}
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-2xl font-semibold font-mono tabular-nums transition-colors duration-300",
            flash && "text-primary"
          )}
        >
          {formatNumber(value)}{suffix && <span className="text-lg text-muted-foreground ml-0.5">{suffix}</span>}
        </span>
      </div>

      {/* Bottom content - consistent height */}
      <p className="text-xs text-muted-foreground mt-2 min-h-[1rem]">
        {hasChange ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded",
                isPositive && "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50",
                isNegative && "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50"
              )}
            >
              {isPositive && <HugeiconsIcon icon={ArrowUp01Icon} size={10} />}
              {isNegative && <HugeiconsIcon icon={ArrowDown01Icon} size={10} />}
              {Math.abs(change)}%
            </span>
            <span>vs previous</span>
          </span>
        ) : description ? (
          description
        ) : previousValue !== undefined ? (
          `Previously: ${formatNumber(previousValue)}`
        ) : (
          <span className="text-muted-foreground/40">No change</span>
        )}
      </p>
    </div>
  );
}

interface MetricGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function MetricGrid({ children, columns = 4, className }: MetricGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}
