import { Context, Next } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env, Variables, AccessUser } from "../bindings";
import { Errors } from "../lib/errors";

// Cache JWKS to avoid fetching on every request
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksCacheTeamDomain: string | null = null;

function getJWKS(teamDomain: string) {
  if (jwksCache && jwksCacheTeamDomain === teamDomain) {
    return jwksCache;
  }
  jwksCache = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
  jwksCacheTeamDomain = teamDomain;
  return jwksCache;
}

/**
 * Cloudflare Access authentication middleware
 * 
 * Validates the JWT from Cloudflare Access and extracts user info.
 * If CF_ACCESS_TEAM_DOMAIN is not set, auth is disabled (for local dev).
 */
export async function requireAuth(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  // If Cloudflare Access is not configured, skip auth (local dev mode)
  if (!c.env.CF_ACCESS_TEAM_DOMAIN || !c.env.CF_ACCESS_AUD) {
    console.log("[Auth] Cloudflare Access not configured, skipping auth");
    // Set a mock user for local development
    c.set("user", {
      email: "dev@localhost",
      sub: "local-dev",
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 3600,
    });
    await next();
    return;
  }

  // Get the JWT from the header (preferred) or cookie
  const token =
    c.req.header("cf-access-jwt-assertion") ||
    getCookie(c.req.raw, "CF_Authorization");

  if (!token) {
    throw Errors.Unauthorized();
  }

  try {
    const JWKS = getJWKS(c.env.CF_ACCESS_TEAM_DOMAIN);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: c.env.CF_ACCESS_TEAM_DOMAIN,
      audience: c.env.CF_ACCESS_AUD,
    });

    // Set user in context
    c.set("user", {
      email: payload.email as string,
      sub: payload.sub as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    });

    await next();
  } catch (error) {
    console.error("[Auth] JWT verification failed:", error);
    throw Errors.Unauthorized();
  }
}

/**
 * Get the current authenticated user
 */
export function getUser(c: Context<{ Bindings: Env; Variables: Variables }>): AccessUser | undefined {
  return c.get("user");
}

/**
 * Check auth status endpoint - returns user info if authenticated
 */
export async function checkAuth(c: Context<{ Bindings: Env; Variables: Variables }>) {
  const transactionalEmailEnabled = !!(c.env.RESEND_API_KEY && c.env.RESEND_FROM_EMAIL);

  // If Cloudflare Access is not configured, return mock auth
  if (!c.env.CF_ACCESS_TEAM_DOMAIN || !c.env.CF_ACCESS_AUD) {
    return c.json({
      authenticated: true,
      user: {
        email: "dev@localhost",
      },
      cfAccessConfigured: false,
      transactionalEmailEnabled,
    });
  }

  const token =
    c.req.header("cf-access-jwt-assertion") ||
    getCookie(c.req.raw, "CF_Authorization");

  if (!token) {
    return c.json({ authenticated: false, cfAccessConfigured: true, transactionalEmailEnabled });
  }

  try {
    const JWKS = getJWKS(c.env.CF_ACCESS_TEAM_DOMAIN);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: c.env.CF_ACCESS_TEAM_DOMAIN,
      audience: c.env.CF_ACCESS_AUD,
    });

    return c.json({
      authenticated: true,
      user: {
        email: payload.email,
      },
      cfAccessConfigured: true,
      transactionalEmailEnabled,
    });
  } catch {
    return c.json({ authenticated: false, cfAccessConfigured: true, transactionalEmailEnabled });
  }
}

/**
 * Simple cookie parser
 */
function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split("=");
    if (key === name) {
      return value;
    }
  }
  return undefined;
}
