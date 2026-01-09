import type { Context, Next } from "hono";
import type { Env, Variables } from "../bindings";
import { AppError } from "../lib/errors";

export function isDemoMode(env: Env): boolean {
  return env.DEMO_MODE === "true";
}

/**
 * Middleware that blocks write operations (POST, PUT, PATCH, DELETE) in demo mode.
 * Read operations (GET, HEAD, OPTIONS) are always allowed.
 */
export async function demoModeGuard(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const method = c.req.method.toUpperCase();
  const writeMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (isDemoMode(c.env) && writeMethods.includes(method)) {
    throw new AppError(
      403,
      "DEMO_MODE",
      "This action is disabled in demo mode. Deploy your own instance to make changes."
    );
  }

  await next();
}
