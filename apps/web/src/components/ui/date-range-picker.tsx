import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import {
  format,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface DateRange {
  from: string; // ISO date string
  to: string; // ISO date string
}

export interface DateRangePreset {
  label: string;
  value: string;
  getRange: () => DateRange;
}

const defaultPresets: DateRangePreset[] = [
  {
    label: "Last 7 days",
    value: "7d",
    getRange: () => ({
      from: subDays(new Date(), 6).toISOString().split("T")[0],
      to: new Date().toISOString().split("T")[0],
    }),
  },
  {
    label: "Last 30 days",
    value: "30d",
    getRange: () => ({
      from: subDays(new Date(), 29).toISOString().split("T")[0],
      to: new Date().toISOString().split("T")[0],
    }),
  },
  {
    label: "Last 90 days",
    value: "90d",
    getRange: () => ({
      from: subDays(new Date(), 89).toISOString().split("T")[0],
      to: new Date().toISOString().split("T")[0],
    }),
  },
  {
    label: "This month",
    value: "month",
    getRange: () => ({
      from: startOfMonth(new Date()).toISOString().split("T")[0],
      to: new Date().toISOString().split("T")[0],
    }),
  },
  {
    label: "Last month",
    value: "last-month",
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth).toISOString().split("T")[0],
        to: endOfMonth(lastMonth).toISOString().split("T")[0],
      };
    },
  },
  {
    label: "This year",
    value: "year",
    getRange: () => ({
      from: startOfYear(new Date()).toISOString().split("T")[0],
      to: new Date().toISOString().split("T")[0],
    }),
  },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: DateRangePreset[];
  className?: string;
  align?: "start" | "center" | "end";
}

export function DateRangePicker({
  value,
  onChange,
  presets = defaultPresets,
  className,
  align = "end",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);

  // Determine which preset is currently active
  const activePreset = useMemo(() => {
    return presets.find((preset) => {
      const range = preset.getRange();
      return range.from === value.from && range.to === value.to;
    });
  }, [value, presets]);

  const handlePresetClick = (preset: DateRangePreset) => {
    const range = preset.getRange();
    onChange(range);
    setCustomFrom(range.from);
    setCustomTo(range.to);
    setOpen(false);
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange({ from: customFrom, to: customTo });
      setOpen(false);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const displayText = activePreset
    ? activePreset.label
    : `${formatDisplayDate(value.from)} - ${formatDisplayDate(value.to)}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-start gap-2 font-normal", className)}
        >
          <HugeiconsIcon icon={Calendar03Icon} size={14} />
          <span className="hidden sm:inline">{displayText}</span>
          <span className="sm:hidden">{activePreset?.value || "Custom"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align={align}>
        <div className="p-3 border-b border-border">
          <p className="text-sm font-medium">Select date range</p>
        </div>

        {/* Presets */}
        <div className="p-2 space-y-0.5">
          {presets.map((preset) => {
            const isActive = activePreset?.value === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <span>{preset.label}</span>
                {isActive && (
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                )}
              </button>
            );
          })}
        </div>

        {/* Custom range */}
        <div className="p-3 border-t border-border space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Custom range
          </p>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  From
                </label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 text-xs [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:dark:invert"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  To
                </label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 text-xs [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:dark:invert"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleCustomApply}
              disabled={!customFrom || !customTo}
              className="w-full"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper hook for managing date range state
export function useDateRange(defaultPreset: string = "30d") {
  const preset = defaultPresets.find((p) => p.value === defaultPreset);
  const initialRange = preset?.getRange() || defaultPresets[1].getRange();

  const [dateRange, setDateRange] = useState<DateRange>(initialRange);

  return {
    dateRange,
    setDateRange,
    fromDate: dateRange.from,
    toDate: dateRange.to,
  };
}
