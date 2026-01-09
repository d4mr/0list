import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { Env, Variables } from "./bindings";
import { AppError } from "./lib/errors";
import { demoModeGuard, isDemoMode } from "./middleware/demo-mode";
import publicRoutes from "./api/public";
import adminRoutes from "./api/admin";

// Create app with proper typing
const app = new Hono<{ Bindings: Env; Variables: Variables }>()
  .use("*", logger())
  .use("*", secureHeaders())
  .use(
    "/api/*",
    cors({
      origin: (origin) => origin,
      credentials: true,
    })
  )
  // Demo mode guard - blocks write operations when DEMO_MODE=true
  .use("/api/admin/*", demoModeGuard)
  .use("/api/w/*", demoModeGuard)
  .get("/api/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  })
  // Config endpoint - exposes demo mode status to frontend
  .get("/api/config", (c) => {
    return c.json({
      demoMode: isDemoMode(c.env),
    });
  })
  .route("/api/w", publicRoutes)
  .route("/api/admin", adminRoutes);

// Error handler
app.onError((err, c) => {
  console.error("[Error]", err);

  if (err instanceof AppError) {
    return c.json(err.toJSON(), err.status);
  }

  if (err.message.includes("Validation")) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: err.message,
        },
      },
      400
    );
  }

  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    500
  );
});

// 404 handler - serve index.html for SPA routes
app.notFound(async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Endpoint not found",
        },
      },
      404
    );
  }
  // For non-API routes, let the static asset handler serve index.html
  // This enables client-side routing for the React SPA
  return c.notFound();
});

// Export app type for RPC client
export type AppType = typeof app;
export default app;
