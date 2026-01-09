import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Download04Icon,
  MoreHorizontalIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  UserGroupIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Mail01Icon,
  ChartIncreaseIcon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DateRangePicker,
  useDateRange,
} from "@/components/ui/date-range-picker";
import { MetricCard, MetricGrid } from "@/components/stats";
import { SignupsChart } from "@/components/stats";
import { SourcesList } from "@/components/stats";
import {
  useWaitlist,
  useSignups,
  useStats,
  useUpdateSignupStatus,
  getExportUrl,
  ApiError,
  type SignupsParams,
} from "@/lib/queries";
import { useDelayedLoading } from "@/lib/hooks";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";

export function WaitlistSignupsPage() {
  const { id } = useParams<{ id: string }>();
  const { dateRange, setDateRange } = useDateRange("30d");
  const [params, setParams] = useState<SignupsParams>({
    page: 1,
    limit: 25,
  });
  const [searchInput, setSearchInput] = useState("");
  const [showCharts, setShowCharts] = useState(true);

  const { data: waitlistData } = useWaitlist(id!);
  const { data: signupsData, isLoading, isError: signupsError, error: signupsErrorData } = useSignups(id!, params);
  const { data: statsData, isLoading: statsLoading, isFetching: statsFetching, isError: statsError, error: statsErrorData } = useStats(id!, {
    from: dateRange.from,
    to: dateRange.to,
    compare: true,
  });
  const updateStatus = useUpdateSignupStatus();

  const showStatsLoading = useDelayedLoading(statsLoading);
  const showSignupsLoading = useDelayedLoading(isLoading);

  const statsErrorMessage = statsErrorData instanceof ApiError
    ? statsErrorData.message
    : statsErrorData?.message || "Failed to load stats";
  const signupsErrorMessage = signupsErrorData instanceof ApiError
    ? signupsErrorData.message
    : signupsErrorData?.message || "Failed to load signups";

  const waitlist = waitlistData?.waitlist;
  const signups = signupsData?.signups || [];
  const pagination = signupsData?.pagination;
  const stats = statsData;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams((p) => ({ ...p, search: searchInput || undefined, page: 1 }));
  };

  const handleStatusFilter = (status: string) => {
    setParams((p) => ({
      ...p,
      status: status === "all" ? undefined : (status as SignupsParams["status"]),
      page: 1,
    }));
  };

  const handleStatusChange = (signupId: string, status: "pending" | "confirmed" | "invited") => {
    updateStatus.mutate(
      { waitlistId: id!, signupId, status },
      {
        onSuccess: () => {
          toast.success(`Status updated to ${status}`);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with date range */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Track signups and conversion rates over time
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stats Cards */}
      {showStatsLoading && !stats ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
      ) : statsError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 shrink-0">
              <HugeiconsIcon icon={Alert02Icon} size={16} className="text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-destructive mb-1">Failed to load stats</h3>
              <p className="text-sm text-muted-foreground">{statsErrorMessage}</p>
            </div>
          </div>
        </div>
      ) : stats ? (
        <MetricGrid columns={4}>
          <MetricCard
            label="Signups"
            value={stats.counts.current.total}
            change={stats.counts.change.total}
            previousValue={stats.counts.previous.total}
            icon={UserGroupIcon}
            isFetching={statsFetching}
          />
          <MetricCard
            label="Confirmed"
            value={stats.counts.current.confirmed + stats.counts.current.invited}
            change={stats.counts.change.confirmed}
            icon={CheckmarkCircle02Icon}
            isFetching={statsFetching}
          />
          <MetricCard
            label="Conversion Rate"
            value={stats.confirmationRate.current}
            suffix="%"
            change={stats.confirmationRate.change}
            icon={ChartIncreaseIcon}
            isFetching={statsFetching}
          />
          <MetricCard
            label="Today"
            value={stats.todaySignups}
            description="Signups today so far"
            icon={Clock01Icon}
            isFetching={statsFetching}
          />
        </MetricGrid>
      ) : null}

      {/* Charts */}
      {stats && showCharts && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Signup Trend
              </CardTitle>
              <CardDescription>
                Daily signups and confirmations for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignupsChart data={stats.dailySignups} height={240} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Traffic Sources
              </CardTitle>
              <CardDescription>
                Where signups are coming from
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SourcesList data={stats.sources} maxItems={5} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* All-time stats */}
      {stats && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            All-time: <strong className="text-foreground">{formatNumber(stats.counts.allTime.total)}</strong> signups
          </span>
          <span>·</span>
          <span>
            <strong className="text-foreground">{formatNumber(stats.counts.allTime.confirmed + stats.counts.allTime.invited)}</strong> confirmed
          </span>
          <span>·</span>
          <span>
            <strong className="text-foreground">{formatNumber(stats.counts.allTime.pending)}</strong> pending
          </span>
        </div>
      )}

      {/* Signups Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Signups</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCharts(!showCharts)}
          >
            {showCharts ? "Hide charts" : "Show charts"}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full sm:w-64 pl-9"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <Select
              value={params.status || "all"}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" asChild>
              <a href={getExportUrl(id!)} download>
                <HugeiconsIcon icon={Download04Icon} size={16} className="mr-2" />
                Export CSV
              </a>
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Signed up</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSignupsLoading && !signupsData ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : signupsError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 mb-3">
                        <HugeiconsIcon icon={Alert02Icon} size={20} className="text-destructive" />
                      </div>
                      <p className="font-medium text-destructive mb-1">Failed to load signups</p>
                      <p className="text-sm text-muted-foreground">{signupsErrorMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !isLoading && signups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground/50">
                      <HugeiconsIcon icon={UserGroupIcon} size={32} className="mb-2" />
                      <p className="font-medium">No signups yet</p>
                      <p className="text-sm mt-1">
                        Share your waitlist link to start collecting signups
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                signups.map((signup) => (
                  <TableRow key={signup.id}>
                    <TableCell className="font-mono text-muted-foreground">
                      {signup.position}
                    </TableCell>
                    <TableCell className="font-medium">{signup.email}</TableCell>
                    <TableCell>
                      <StatusBadge status={signup.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {signup.referralSource || "direct"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(signup.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(signup.id, "confirmed")}
                            disabled={signup.status === "confirmed"}
                          >
                            Mark as confirmed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(signup.id, "invited")}
                            disabled={signup.status === "invited"}
                          >
                            Mark as invited
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(signup.id, "pending")}
                            disabled={signup.status === "pending"}
                          >
                            Reset to pending
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {formatNumber(pagination.total)} signups
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "confirmed" | "invited" }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-normal",
        status === "confirmed" && "bg-success/10 text-success border-success/20",
        status === "invited" && "bg-primary/10 text-primary border-primary/20",
        status === "pending" && "bg-warning/10 text-warning border-warning/20"
      )}
    >
      {status}
    </Badge>
  );
}

export { WaitlistSignupsPage as default };
