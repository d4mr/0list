import { Outlet, NavLink, useParams, Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  Settings02Icon,
  Mail01Icon,
  ArrowLeft02Icon,
  TestTube01Icon,
  Alert02Icon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWaitlist, useAuth, ApiError } from "@/lib/queries";
import { useDelayedLoading } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function WaitlistDetailLayout() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useWaitlist(id!);
  const { data: authData } = useAuth();
  const showLoading = useDelayedLoading(isLoading);
  const waitlist = data?.waitlist;
  const transactionalEmailEnabled = authData?.transactionalEmailEnabled ?? false;

  const showEmailWarning = waitlist?.doubleOptIn && !transactionalEmailEnabled;

  const tabs = [
    { to: "signups", label: "Signups", icon: UserGroupIcon },
    { to: "settings", label: "Settings", icon: Settings02Icon },
    { to: "emails", label: "Emails", icon: Mail01Icon },
    { to: "integrate", label: "Integrate", icon: HelpCircleIcon },
    { to: "tester", label: "Tester", icon: TestTube01Icon },
  ];

  // Error state
  if (isError) {
    const errorMessage = error instanceof ApiError
      ? error.message
      : error?.message || "Failed to load waitlist";

    return (
      <div className="min-h-[calc(100vh-3.5rem)]">
        <div className="border-b border-border bg-background">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-3 py-4">
              <Link
                to="/admin"
                className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors -ml-1"
              >
                <HugeiconsIcon icon={ArrowLeft02Icon} size={18} className="text-muted-foreground" />
              </Link>
              <h1 className="text-lg font-semibold">Error</h1>
            </div>
          </div>
        </div>
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-destructive/10 rounded-full blur-2xl scale-150" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/10">
                <HugeiconsIcon icon={Alert02Icon} size={28} className="text-destructive/70" />
              </div>
            </div>
            <h2 className="text-lg font-semibold mb-2">Failed to load waitlist</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-2">{errorMessage}</p>
            <p className="text-xs text-muted-foreground/60 max-w-sm mb-6">
              This might be a database issue or the waitlist may not exist.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link to="/admin">Back to dashboard</Link>
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-[calc(100vh-3.5rem)]">
        {/* Waitlist header with back button and tabs */}
        <div className="border-b border-border bg-background">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6">
            {/* Back + Title row */}
            <div className="flex items-center gap-3 py-4">
              <Link
                to="/admin"
                className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors -ml-1"
              >
                <HugeiconsIcon icon={ArrowLeft02Icon} size={18} className="text-muted-foreground" />
              </Link>
              <div className="flex items-center gap-3 min-w-0">
                {showLoading && !waitlist ? (
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                ) : waitlist?.logoUrl ? (
                  <img
                    src={waitlist.logoUrl}
                    alt=""
                    className="h-8 w-8 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: waitlist?.primaryColor || 'hsl(var(--primary))' }}
                  >
                    {waitlist?.name?.charAt(0).toUpperCase() || 'W'}
                  </div>
                )}
                <div className="min-w-0">
                  {showLoading && !waitlist ? (
                    <Skeleton className="h-6 w-40" />
                  ) : (
                    <h1 className="text-lg font-semibold truncate">{waitlist?.name || "Waitlist"}</h1>
                  )}
                </div>
                {showEmailWarning && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-warning/15 text-warning shrink-0 cursor-help">
                        <HugeiconsIcon icon={Alert02Icon} size={14} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">Double opt-in is enabled but transactional email is not configured. Signups will be confirmed immediately without verification.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Tab navigation */}
            <nav className="flex gap-1 -mb-px">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                      isActive
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    )
                  }
                >
                  <HugeiconsIcon icon={tab.icon} size={16} />
                  {tab.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Page content */}
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </div>
    </TooltipProvider>
  );
}

export { WaitlistDetailLayout as default };
