import { useAuth } from "@/lib/queries";
import { useDelayedLoading } from "@/lib/hooks";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { LinkSquare02Icon, ShieldKeyIcon } from "@hugeicons/core-free-icons";

export function LoginPage() {
  const { data: auth, isLoading } = useAuth();
  const showLoading = useDelayedLoading(isLoading);

  // If authenticated, redirect to admin
  if (auth?.authenticated) {
    return <Navigate to="/admin" replace />;
  }

  if (showLoading && !auth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-muted-foreground/60" />
      </div>
    );
  }

  // Still loading but before delay - show nothing
  if (isLoading && !auth) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img src="/favicon.svg" alt="0list" className="h-12 w-12 mx-auto mb-3" />
          <h1 className="text-3xl font-bold tracking-tight">0list</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Self-hosted waitlist management
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon icon={ShieldKeyIcon} size={24} className="text-primary" />
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              {auth?.cfAccessConfigured
                ? "This app is protected by Cloudflare Access"
                : "Cloudflare Access is not configured"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {auth?.cfAccessConfigured ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  You need to authenticate through Cloudflare Access to continue.
                  If you're seeing this page, you may need to sign in again.
                </p>
                <Button className="w-full" onClick={() => window.location.reload()}>
                  Retry Authentication
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  To secure your admin dashboard, configure Cloudflare Access:
                </p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                  <li>Go to Cloudflare Zero Trust dashboard</li>
                  <li>Create an Access Application for your domain</li>
                  <li>
                    Set <code className="bg-muted px-1 rounded text-xs">CF_ACCESS_TEAM_DOMAIN</code> and{" "}
                    <code className="bg-muted px-1 rounded text-xs">CF_ACCESS_AUD</code>
                  </li>
                </ol>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href="https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <HugeiconsIcon icon={LinkSquare02Icon} size={16} className="mr-2" />
                    Cloudflare Access Docs
                  </a>
                </Button>
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    For local development, auth is bypassed
                  </p>
                  <Button className="w-full" asChild>
                    <a href="/admin">Continue to Dashboard</a>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Powered by{" "}
          <a
            href="https://github.com/0list/0list"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            0list
          </a>
        </p>
      </div>
    </div>
  );
}
