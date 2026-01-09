import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { DemoModeProvider } from "@/components/demo-mode";
import { useAuth } from "@/lib/queries";
import { useDelayedLoading } from "@/lib/hooks";

// Pages
import { LoginPage } from "@/routes/admin/login";
import { AdminLayout } from "@/routes/admin/layout";
import { DashboardPage } from "@/routes/admin/dashboard";
import { WaitlistDetailLayout } from "@/routes/admin/waitlists/[id]/layout";
import { WaitlistSignupsPage } from "@/routes/admin/waitlists/[id]/signups";
import { WaitlistSettingsPage } from "@/routes/admin/waitlists/[id]/settings";
import { WaitlistEmailsPage } from "@/routes/admin/waitlists/[id]/emails";
import { WaitlistTesterPage } from "@/routes/admin/waitlists/[id]/tester";
import { WaitlistIntegratePage } from "@/routes/admin/waitlists/[id]/integrate";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useAuth();
  const showLoading = useDelayedLoading(isLoading);

  if (showLoading && !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Still loading but before delay - show nothing to prevent flash
  if (isLoading && !data) {
    return null;
  }

  // If CF Access is configured and user is not authenticated,
  // they need to go through CF Access login (redirect happens automatically)
  if (isError || !data?.authenticated) {
    // If CF Access is not configured, show a helpful message
    if (data && !data.cfAccessConfigured) {
      return (
        <div className="flex h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold mb-4">Development Mode</h1>
            <p className="text-muted-foreground mb-4">
              Cloudflare Access is not configured. In production, set{" "}
              <code className="bg-muted px-1 rounded">CF_ACCESS_TEAM_DOMAIN</code> and{" "}
              <code className="bg-muted px-1 rounded">CF_ACCESS_AUD</code> environment variables.
            </p>
            <p className="text-sm text-muted-foreground">
              For now, auth is bypassed for local development.
            </p>
          </div>
        </div>
      );
    }

    // CF Access is configured but user isn't authenticated
    // This shouldn't normally happen as CF Access handles the redirect
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <ThemeProvider>
      <DemoModeProvider>
        <BrowserRouter>
          <Routes>
          {/* Redirect root to admin */}
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* Login page - shows info about CF Access */}
          <Route path="/admin/login" element={<LoginPage />} />

          {/* Admin routes - protected by CF Access */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="waitlists/:id" element={<WaitlistDetailLayout />}>
              <Route index element={<Navigate to="signups" replace />} />
              <Route path="signups" element={<WaitlistSignupsPage />} />
              <Route path="settings" element={<WaitlistSettingsPage />} />
              <Route path="emails" element={<WaitlistEmailsPage />} />
              <Route path="integrate" element={<WaitlistIntegratePage />} />
              <Route path="tester" element={<WaitlistTesterPage />} />
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "glass-strong",
          }}
        />
      </DemoModeProvider>
    </ThemeProvider>
  );
}
