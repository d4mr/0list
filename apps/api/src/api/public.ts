import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import type { Env } from "../bindings";
import { createDb, waitlists, signups } from "../db";
import { Errors } from "../lib/errors";
import {
  generateToken,
  isValidEmail,
  normalizeEmail,
  getClientIp,
  getBaseUrl,
} from "../lib/utils";
import { signupRateLimit } from "../middleware/rate-limit";
import {
  sendConfirmationEmail,
  sendWelcomeEmail,
  sendAdminNotificationEmail,
  isEmailConfigured,
} from "../emails/send";
import type { Context, Next } from "hono";

// Schema for signup
const signupSchema = z.object({
  email: z.string().email(),
  customData: z.record(z.string(), z.string()).optional(),
  referralSource: z.string().optional(),
});

// Check if origin matches allowed patterns
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  // If no origins configured, allow all (open access)
  if (!allowedOrigins || allowedOrigins.length === 0) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host.toLowerCase();

    return allowedOrigins.some((pattern) => {
      const normalizedPattern = pattern.toLowerCase().trim();

      // Wildcard: *.example.com matches sub.example.com
      if (normalizedPattern.startsWith("*.")) {
        const domain = normalizedPattern.slice(2);
        return originHost === domain || originHost.endsWith("." + domain);
      }

      // Exact match (with or without protocol)
      if (normalizedPattern.includes("://")) {
        try {
          const patternUrl = new URL(normalizedPattern);
          return originUrl.origin === patternUrl.origin;
        } catch {
          return false;
        }
      }

      // Host-only match
      return originHost === normalizedPattern;
    });
  } catch {
    return false;
  }
}

// Dynamic CORS middleware that checks waitlist's allowed origins
async function dynamicCors(c: Context<{ Bindings: Env }>, next: Next) {
  const slug = c.req.param("slug");
  const origin = c.req.header("origin");

  // If no origin header (non-browser request), skip CORS
  if (!origin) {
    await next();
    return;
  }

  const db = createDb(c.env.DB);
  const waitlist = await db.query.waitlists.findFirst({
    where: eq(waitlists.slug, slug),
    columns: { allowedOrigins: true },
  });

  const allowedOrigins = waitlist?.allowedOrigins || [];
  const isAllowed = isOriginAllowed(origin, allowedOrigins);

  // Handle preflight
  if (c.req.method === "OPTIONS") {
    if (isAllowed) {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    } else {
      return new Response(null, { status: 403 });
    }
  }

  // For actual requests, check and set CORS headers
  if (!isAllowed) {
    throw Errors.Forbidden("This domain is not authorized to submit to this waitlist");
  }

  // Set CORS headers for response
  await next();

  c.res.headers.set("Access-Control-Allow-Origin", origin);
  c.res.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
}

// Create routes with chaining for type inference
const publicRoutes = new Hono<{ Bindings: Env }>()
  // Handle CORS preflight for all routes
  .options("/:slug/*", dynamicCors)
  .options("/:slug", dynamicCors)

  .post("/:slug/signup", dynamicCors, signupRateLimit, zValidator("json", signupSchema), async (c) => {
    const { slug } = c.req.param();
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    // Find waitlist
    const waitlist = await db.query.waitlists.findFirst({
      where: eq(waitlists.slug, slug),
    });

    if (!waitlist) {
      throw Errors.WaitlistNotFound();
    }

    // Normalize and validate email
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) {
      throw Errors.InvalidEmail();
    }

    // Validate custom fields
    const customFields = waitlist.customFields || [];
    const customData: Record<string, string> = {};

    for (const field of customFields) {
      const value = body.customData?.[field.key];

      if (field.required && (!value || value.trim() === "")) {
        throw Errors.ValidationError(`${field.label} is required`);
      }

      if (value) {
        customData[field.key] = value.trim();
      }
    }

    // Check for existing signup
    const existingSignup = await db.query.signups.findFirst({
      where: and(eq(signups.waitlistId, waitlist.id), eq(signups.email, email)),
    });

    if (existingSignup) {
      if (existingSignup.status === "confirmed" || existingSignup.status === "invited") {
        throw Errors.AlreadySignedUp();
      }

      // Still pending - resend confirmation if double opt-in and email is configured
      if (waitlist.doubleOptIn && existingSignup.status === "pending" && isEmailConfigured(c.env)) {
        const confirmationToken = generateToken();

        await db
          .update(signups)
          .set({ confirmationToken })
          .where(eq(signups.id, existingSignup.id));

        const updatedSignup = { ...existingSignup, confirmationToken };

        // Let it throw if email fails - user needs the confirmation email
        await sendConfirmationEmail(
          { env: c.env, baseUrl: getBaseUrl(c) },
          waitlist,
          updatedSignup
        );

        return c.json({
          success: true,
          message: "Confirmation email resent. Please check your inbox.",
          position: existingSignup.position,
          requiresConfirmation: true,
        });
      }

      throw Errors.AlreadySignedUp();
    }

    // Check if double opt-in is possible
    const emailConfigured = isEmailConfigured(c.env);
    const useDoubleOptIn = waitlist.doubleOptIn && emailConfigured;
    
    // If waitlist wants double opt-in but email isn't configured, fall back to direct confirm
    if (waitlist.doubleOptIn && !emailConfigured) {
      console.warn("[Signup] Double opt-in enabled but email not configured, falling back to direct confirmation");
    }

    // Get next position
    const positionResult = await db
      .select({ maxPosition: sql<number>`COALESCE(MAX(${signups.position}), 0)` })
      .from(signups)
      .where(eq(signups.waitlistId, waitlist.id));

    const position = (positionResult[0]?.maxPosition || 0) + 1;

    // Create signup
    const confirmationToken = useDoubleOptIn ? generateToken() : null;
    const status = useDoubleOptIn ? "pending" : "confirmed";
    const confirmedAt = useDoubleOptIn ? null : new Date();

    const [newSignup] = await db
      .insert(signups)
      .values({
        waitlistId: waitlist.id,
        email,
        position,
        status,
        customData,
        referralSource: body.referralSource || null,
        ipAddress: getClientIp(c),
        userAgent: c.req.header("user-agent") || null,
        confirmationToken,
        confirmedAt,
      })
      .returning();

    // Send emails
    const emailCtx = { env: c.env, baseUrl: getBaseUrl(c) };

    if (useDoubleOptIn) {
      // Confirmation email is required for double opt-in - let it throw if it fails
      await sendConfirmationEmail(emailCtx, waitlist, newSignup);
    } else if (emailConfigured) {
      // Welcome/admin emails are nice-to-have, don't fail the request
      try {
        await sendWelcomeEmail(emailCtx, waitlist, newSignup);
        await sendAdminNotificationEmail(emailCtx, waitlist, newSignup);
      } catch (error) {
        console.error("[Signup] Failed to send welcome/notification email:", error);
      }
    }

    // Trigger webhook if configured
    if (waitlist.webhookUrl) {
      triggerWebhook(waitlist.webhookUrl, {
        event: "signup.created",
        waitlist: { id: waitlist.id, name: waitlist.name, slug: waitlist.slug },
        signup: {
          email: newSignup.email,
          position: newSignup.position,
          status: newSignup.status,
          customData: newSignup.customData,
          referralSource: newSignup.referralSource,
          createdAt: newSignup.createdAt,
        },
      }).catch((err) => console.error("[Webhook] Failed:", err));
    }

    return c.json({
      success: true,
      message: useDoubleOptIn
        ? "Please check your email to confirm your spot."
        : "You're on the list!",
      position,
      requiresConfirmation: useDoubleOptIn,
      redirectUrl: waitlist.redirectUrl || null,
    });
  })

  .get("/:slug/confirm/:token", async (c) => {
    const { slug, token } = c.req.param();
    const db = createDb(c.env.DB);

    const waitlist = await db.query.waitlists.findFirst({
      where: eq(waitlists.slug, slug),
    });

    if (!waitlist) {
      throw Errors.WaitlistNotFound();
    }

    const signup = await db.query.signups.findFirst({
      where: and(eq(signups.waitlistId, waitlist.id), eq(signups.confirmationToken, token)),
    });

    if (!signup) {
      throw Errors.NotFound("Confirmation link");
    }

    if (signup.status === "confirmed" || signup.status === "invited") {
      if (waitlist.redirectUrl) {
        return c.redirect(waitlist.redirectUrl);
      }
      return c.json({
        success: true,
        message: "Your email is already confirmed.",
        position: signup.position,
      });
    }

    await db
      .update(signups)
      .set({
        status: "confirmed",
        confirmedAt: new Date(),
        confirmationToken: null,
      })
      .where(eq(signups.id, signup.id));

    const confirmedSignup = { ...signup, status: "confirmed" as const, confirmedAt: new Date() };
    const emailCtx = { env: c.env, baseUrl: getBaseUrl(c) };

    try {
      await sendWelcomeEmail(emailCtx, waitlist, confirmedSignup);
      await sendAdminNotificationEmail(emailCtx, waitlist, confirmedSignup);
    } catch (error) {
      console.error("[Confirm] Failed to send emails:", error);
    }

    if (waitlist.webhookUrl) {
      triggerWebhook(waitlist.webhookUrl, {
        event: "signup.confirmed",
        waitlist: { id: waitlist.id, name: waitlist.name, slug: waitlist.slug },
        signup: {
          email: confirmedSignup.email,
          position: confirmedSignup.position,
          status: confirmedSignup.status,
          customData: confirmedSignup.customData,
          referralSource: confirmedSignup.referralSource,
          confirmedAt: confirmedSignup.confirmedAt,
        },
      }).catch((err) => console.error("[Webhook] Failed:", err));
    }

    if (waitlist.redirectUrl) {
      return c.redirect(waitlist.redirectUrl);
    }

    return c.json({
      success: true,
      message: "Your email has been confirmed!",
      position: signup.position,
    });
  })

  .get("/:slug/status", async (c) => {
    const { slug } = c.req.param();
    const db = createDb(c.env.DB);

    const waitlist = await db.query.waitlists.findFirst({
      where: eq(waitlists.slug, slug),
    });

    if (!waitlist) {
      throw Errors.WaitlistNotFound();
    }

    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(signups)
      .where(and(eq(signups.waitlistId, waitlist.id), eq(signups.status, "confirmed")));

    return c.json({
      name: waitlist.name,
      slug: waitlist.slug,
      logoUrl: waitlist.logoUrl,
      primaryColor: waitlist.primaryColor,
      customFields: waitlist.customFields,
      signupCount: countResult[0]?.count || 0,
    });
  });

async function triggerWebhook(url: string, payload: unknown): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export default publicRoutes;
export type PublicRoutes = typeof publicRoutes;
