import type { Context, Next } from "hono";
import type { Env } from "../bindings";
import { Errors } from "../lib/errors";
import { getClientIp } from "../lib/utils";

// Simple in-memory rate limiting using a sliding window approach
// For production with multiple workers, consider using KV or Durable Objects
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyGenerator?: (c: Context<{ Bindings: Env }>) => string;
}

/**
 * Clean up expired entries (called on each request, cheap operation)
 */
function cleanupExpiredIfNeeded() {
  const now = Date.now();
  // Only cleanup if store is getting large (simple heuristic)
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Rate limiting middleware factory
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyGenerator = (c) => getClientIp(c) || "unknown",
  } = options;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Cleanup on each request if needed (no setInterval in Workers)
    cleanupExpiredIfNeeded();
    const key = keyGenerator(c);
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || record.resetAt < now) {
      // Create new window
      record = { count: 1, resetAt: now + windowMs };
      rateLimitStore.set(key, record);
    } else {
      // Increment count in current window
      record.count++;
    }

    // Set rate limit headers
    c.header("X-RateLimit-Limit", max.toString());
    c.header("X-RateLimit-Remaining", Math.max(0, max - record.count).toString());
    c.header("X-RateLimit-Reset", Math.ceil(record.resetAt / 1000).toString());

    if (record.count > max) {
      c.header("Retry-After", Math.ceil((record.resetAt - now) / 1000).toString());
      throw Errors.RateLimited();
    }

    await next();
  };
}

/**
 * Signup rate limit - 10 signups per IP per hour
 */
export const signupRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (c) => {
    const ip = getClientIp(c) || "unknown";
    return `signup:${ip}`;
  },
});

/**
 * API rate limit - 100 requests per IP per minute
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  keyGenerator: (c) => {
    const ip = getClientIp(c) || "unknown";
    return `api:${ip}`;
  },
});
