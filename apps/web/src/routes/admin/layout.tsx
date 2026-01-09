import { Outlet, Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoonIcon,
  SunIcon,
  ComputerIcon,
  GithubIcon,
} from "@/components/ui/icon";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { DemoModeBanner } from "@/components/demo-mode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AdminLayout() {
  const { theme, setTheme } = useTheme();
  const { data: authData } = useAuth();
  const userEmail = authData?.user?.email;
  const cfAccessConfigured = authData?.cfAccessConfigured ?? false;
  const isDemoMode = authData?.demoMode ?? false;

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Mode Banner */}
      <DemoModeBanner />

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container max-w-6xl mx-auto">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            {/* Logo */}
            <Link to="/admin" className="flex items-center gap-2">
              <img src="/favicon.svg" alt="0list" className="h-7 w-7" />
              <span className="text-base font-semibold tracking-tight">0list</span>
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-1">
              {/* Auth Warning - hide in demo mode */}
              {!cfAccessConfigured && !isDemoMode && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10 text-warning text-xs font-medium cursor-help">
                        <HugeiconsIcon icon={Alert02Icon} size={14} />
                        <span className="hidden sm:inline">No Auth</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm mb-2">Cloudflare Access is not configured. This admin panel is unprotected.</p>
                      <a
                        href="https://0list.d4mr.com/docs/authentication"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium underline hover:no-underline"
                      >
                        Learn how to configure authentication →
                      </a>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* GitHub Link */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <a
                  href="https://github.com/d4mr/0list"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <HugeiconsIcon icon={GithubIcon} size={16} />
                </a>
              </Button>

              {/* Theme Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <HugeiconsIcon
                      icon={theme === "dark" ? MoonIcon : theme === "light" ? SunIcon : ComputerIcon}
                      size={16}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <HugeiconsIcon icon={SunIcon} size={16} className="mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <HugeiconsIcon icon={MoonIcon} size={16} className="mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <HugeiconsIcon icon={ComputerIcon} size={16} className="mr-2" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              {userEmail && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {userEmail.charAt(0).toUpperCase()}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{userEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          {cfAccessConfigured ? "Cloudflare Access" : "Development Mode"}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-3.5rem-3rem)]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-border bg-background/50">
        <div className="container max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            made with love by{" "}
            <a
              href="https://github.com/d4mr"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              d4mr
            </a>
            {" "}and{" "}
            <span className="font-medium text-foreground">opus 4.5</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
