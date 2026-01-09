import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

interface IconProps {
  icon: IconSvgElement;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ icon, className, size = 18, strokeWidth = 1.5 }: IconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
    />
  );
}

// Re-export commonly used icons for convenience
export {
  // Navigation
  DashboardSquare02Icon as DashboardIcon,
  Layers01Icon as LayersIcon,
  Settings02Icon as SettingsIcon,
  Mail01Icon as MailIcon,
  UserGroupIcon,
  Home01Icon as HomeIcon,

  // Actions
  PlusSignIcon,
  ArrowRight01Icon as ArrowRightIcon,
  ArrowUpRight01Icon as ArrowUpRightIcon,
  ArrowDown01Icon as ArrowDownIcon,
  ArrowUp01Icon as ArrowUpIcon,
  ArrowLeft01Icon as ArrowLeftIcon,

  // Theme
  Moon02Icon as MoonIcon,
  Sun03Icon as SunIcon,
  ComputerIcon,

  // UI
  ArrowDown01Icon as ChevronDownIcon,
  ArrowUp01Icon as ChevronUpIcon,
  ArrowRight01Icon as ChevronRightIcon,
  ArrowLeft01Icon as ChevronLeftIcon,
  Loading03Icon as LoadingIcon,
  Cancel01Icon as XIcon,
  MoreHorizontalIcon,
  Search01Icon as SearchIcon,
  Download04Icon as DownloadIcon,
  ArrowReloadHorizontalIcon as RefreshIcon,
  DragDropVerticalIcon as GripVerticalIcon,
  RecordIcon as CircleIcon,
  LinkSquare02Icon as ExternalLinkIcon,
  ShieldKeyIcon as ShieldIcon,
  Delete02Icon as TrashIcon,
  Clock01Icon as ClockIcon,

  // Stats
  AnalyticsUpIcon,
  AnalyticsDownIcon,
  ChartIncreaseIcon,
  ChartDecreaseIcon,
  ChartIncreaseIcon as TrendingUpIcon,
  ChartDecreaseIcon as TrendingDownIcon,
  FireIcon,
  ZapIcon,
  Target02Icon as TargetIcon,
  Tick01Icon as CheckIcon,
  SparklesIcon,
  CheckmarkCircle02Icon as CheckCircleIcon,

  // Social
  GithubIcon,
} from "@hugeicons/core-free-icons";
