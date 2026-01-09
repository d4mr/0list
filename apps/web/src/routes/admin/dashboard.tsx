import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Search01Icon,
  ArrowUpRight01Icon,
  LayersIcon,
  UserGroupIcon,
  CheckmarkCircle02Icon,
  ChartIncreaseIcon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { DemoModeButton, useDemoMode } from "@/components/demo-mode";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DateRangePicker,
  useDateRange,
} from "@/components/ui/date-range-picker";
import { MetricCard, MetricGrid } from "@/components/stats";
import { SignupsChart } from "@/components/stats";
import { SourcesList } from "@/components/stats";
import {
  useWaitlists,
  useCreateWaitlist,
  useDashboardStats,
  ApiError,
} from "@/lib/queries";
import { useDelayedLoading } from "@/lib/hooks";
import { formatNumber, formatRelativeTime, cn } from "@/lib/utils";

export function DashboardPage() {
  const { data: waitlistsData, isLoading: waitlistsLoading, isError: waitlistsError, error: waitlistsErrorData } = useWaitlists();
  const { dateRange, setDateRange } = useDateRange("30d");
  const { data: statsData, isLoading: statsLoading, isFetching: statsFetching, isError: statsError, error: statsErrorData } = useDashboardStats({
    from: dateRange.from,
    to: dateRange.to,
    compare: true,
  });

  const [search, setSearch] = useState("");

  // Use delayed loading to prevent flash of skeleton
  const showStatsLoading = useDelayedLoading(statsLoading);
  const showWaitlistsLoading = useDelayedLoading(waitlistsLoading);

  const waitlists = waitlistsData?.waitlists || [];
  const stats = statsData;

  const filteredWaitlists = search
    ? waitlists.filter(
        (w) =>
          w.name.toLowerCase().includes(search.toLowerCase()) ||
          w.slug.toLowerCase().includes(search.toLowerCase())
      )
    : waitlists;

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of all your waitlists and signups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <CreateWaitlistDialog />
        </div>
      </div>

      {/* Stats Overview */}
      {showStatsLoading && !stats ? (
        <MetricGridSkeleton />
      ) : statsError ? (
        <StatsErrorState error={statsErrorData} />
      ) : stats ? (
        <MetricGrid columns={4} className="mb-8">
          <MetricCard
            label="Waitlists"
            value={stats.overview.waitlists}
            icon={LayersIcon}
            description="Active waitlists"
            isFetching={statsFetching}
          />
          <MetricCard
            label="Total Signups"
            value={stats.overview.signups.current}
            change={stats.overview.signups.change}
            previousValue={stats.overview.signups.previous}
            icon={UserGroupIcon}
            isFetching={statsFetching}
          />
          <MetricCard
            label="Confirmed"
            value={stats.overview.confirmed.current}
            change={stats.overview.confirmed.change}
            previousValue={stats.overview.confirmed.previous}
            icon={CheckmarkCircle02Icon}
            isFetching={statsFetching}
          />
          <MetricCard
            label="Conversion Rate"
            value={stats.overview.confirmationRate.current}
            suffix="%"
            change={stats.overview.confirmationRate.change}
            icon={ChartIncreaseIcon}
            isFetching={statsFetching}
          />
        </MetricGrid>
      ) : (
        <MetricGrid columns={4} className="mb-8">
          <MetricCard label="Waitlists" value={0} icon={LayersIcon} description="Active waitlists" />
          <MetricCard label="Total Signups" value={0} icon={UserGroupIcon} />
          <MetricCard label="Confirmed" value={0} icon={CheckmarkCircle02Icon} />
          <MetricCard label="Conversion Rate" value={0} suffix="%" icon={ChartIncreaseIcon} />
        </MetricGrid>
      )}

      {/* Charts Row */}
      {stats && (
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Signups Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Signup Trend
              </CardTitle>
              <CardDescription>
                Daily signups and confirmations over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignupsChart data={stats.dailySignups} height={280} />
            </CardContent>
          </Card>

          {/* Sources */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Traffic Sources
              </CardTitle>
              <CardDescription>
                Where your signups are coming from
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SourcesList data={stats.sources} maxItems={5} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Waitlists */}
      {stats && stats.topWaitlists.length > 0 && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Top Performing Waitlists
            </CardTitle>
            <CardDescription>
              Waitlists with the most signups this period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topWaitlists.map((waitlist) => (
                <Link
                  key={waitlist.id}
                  to={`/admin/waitlists/${waitlist.id}`}
                  className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors -mx-3"
                >
                  <div
                    className="w-1.5 h-10 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        waitlist.primaryColor || "hsl(var(--primary))",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {waitlist.name}
                      </span>
                      <HugeiconsIcon
                        icon={ArrowUpRight01Icon}
                        size={12}
                        className="text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all"
                      />
                    </div>
                    <code className="text-xs text-muted-foreground font-mono">
                      /{waitlist.slug}
                    </code>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono tabular-nums">
                      {formatNumber(waitlist.signups)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {waitlist.rate}% confirmed
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Waitlists Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">All Waitlists</h2>
          {waitlists.length > 3 && (
            <div className="relative w-64">
              <HugeiconsIcon
                icon={Search01Icon}
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search waitlists..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
        </div>

        {showWaitlistsLoading && !waitlistsData ? (
          <LoadingState />
        ) : waitlistsError ? (
          <ErrorState error={waitlistsErrorData} />
        ) : !waitlistsLoading && waitlists.length === 0 ? (
          <EmptyState />
        ) : filteredWaitlists.length === 0 && search ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No waitlists match "{search}"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredWaitlists.map((waitlist, index) => (
              <WaitlistRow
                key={waitlist.id}
                waitlist={waitlist}
                style={{ animationDelay: `${index * 30}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function WaitlistRow({
  waitlist,
  style,
}: {
  waitlist: {
    id: string;
    name: string;
    slug: string;
    signupCount: number;
    confirmedCount: number;
    primaryColor: string | null;
    createdAt: string;
  };
  style?: React.CSSProperties;
}) {
  const conversionRate =
    waitlist.signupCount > 0
      ? Math.round((waitlist.confirmedCount / waitlist.signupCount) * 100)
      : 0;

  return (
    <Link
      to={`/admin/waitlists/${waitlist.id}`}
      className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-300"
      style={style}
    >
      {/* Color indicator */}
      <div
        className="w-1.5 sm:w-2 h-10 sm:h-12 rounded-full shrink-0 transition-all duration-200 group-hover:scale-y-110"
        style={{
          backgroundColor: waitlist.primaryColor || "hsl(var(--primary))",
        }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm sm:text-base truncate group-hover:text-primary transition-colors">
            {waitlist.name}
          </span>
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            size={14}
            className="text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-200 shrink-0 hidden sm:block"
          />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <code className="text-xs text-muted-foreground font-mono">
            /{waitlist.slug}
          </code>
          <span className="text-xs text-muted-foreground/50 hidden sm:inline">
            ·
          </span>
          <span className="text-xs text-muted-foreground/60 hidden sm:inline">
            {formatRelativeTime(waitlist.createdAt)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        {/* Signups */}
        <div className="text-right">
          <p className="text-sm sm:text-base font-semibold font-mono tabular-nums">
            {formatNumber(waitlist.signupCount)}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            signups
          </p>
        </div>

        {/* Conversion - hidden on mobile */}
        <div className="hidden sm:block text-right min-w-[60px]">
          <div className="flex items-center justify-end gap-1.5">
            <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all duration-500"
                style={{ width: `${conversionRate}%` }}
              />
            </div>
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              {conversionRate}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">confirmed</p>
        </div>
      </div>
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card"
        >
          <Skeleton className="w-2 h-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1.5" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="text-right">
            <Skeleton className="h-5 w-12 mb-1" />
            <Skeleton className="h-3 w-10 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
          <HugeiconsIcon icon={LayersIcon} size={28} className="text-primary/70" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">No waitlists yet</h3>
      <p className="text-sm text-muted-foreground text-center max-w-[280px] mb-6">
        Create your first waitlist to start collecting signups.
      </p>
      <CreateWaitlistDialog />
    </div>
  );
}

function ErrorState({ error }: { error: Error | null }) {
  const errorMessage = error instanceof ApiError
    ? error.message
    : error?.message || "Failed to load waitlists";

  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-destructive/10 rounded-full blur-2xl scale-150" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/10">
          <HugeiconsIcon icon={Alert02Icon} size={28} className="text-destructive/70" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
      <p className="text-sm text-muted-foreground text-center max-w-[320px] mb-2">
        {errorMessage}
      </p>
      <p className="text-xs text-muted-foreground/60 text-center max-w-[280px] mb-6">
        This might be a database setup issue. Make sure you've run migrations.
      </p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  );
}

function StatsErrorState({ error }: { error: Error | null }) {
  const errorMessage = error instanceof ApiError
    ? error.message
    : error?.message || "Failed to load stats";

  return (
    <div className="mb-8 rounded-lg border border-destructive/20 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 shrink-0">
          <HugeiconsIcon icon={Alert02Icon} size={16} className="text-destructive" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-destructive mb-1">Failed to load stats</h3>
          <p className="text-sm text-muted-foreground mb-3">{errorMessage}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateWaitlistDialog() {
  const createWaitlist = useCreateWaitlist();
  const { isDemoMode } = useDemoMode();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWaitlist.mutate(
      { name },
      {
        onSuccess: () => {
          toast.success("Waitlist created");
          setOpen(false);
          setName("");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DemoModeButton size="sm" disabled={isDemoMode}>
          <HugeiconsIcon icon={PlusSignIcon} size={16} className="mr-1.5" />
          <span className="hidden sm:inline">New Waitlist</span>
          <span className="sm:hidden">New</span>
        </DemoModeButton>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create waitlist</DialogTitle>
            <DialogDescription>
              Create a new waitlist to start collecting signups.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Product Waitlist"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                A URL-friendly slug will be auto-generated.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createWaitlist.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
