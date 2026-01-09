export interface Env {
  // D1 Database
  DB: D1Database;

  // Email Workers binding (optional)
  ADMIN_EMAIL?: SendEmail;

  // Cloudflare Access configuration
  CF_ACCESS_TEAM_DOMAIN?: string; // e.g., "https://myteam.cloudflareaccess.com"
  CF_ACCESS_AUD?: string; // Application Audience (AUD) tag

  // Resend configuration
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;

  // Optional configuration
  BASE_URL?: string; // For email links, defaults to request origin

  // Demo mode - disables all write operations
  DEMO_MODE?: string; // Set to "true" to enable
}

// Note: SendEmail and EmailMessage types come from @cloudflare/workers-types

// User from Cloudflare Access JWT
export interface AccessUser {
  email: string;
  sub: string; // Subject (user ID)
  iat: number; // Issued at
  exp: number; // Expiration
}

// App-wide types
export interface CustomField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select type
}

export interface WaitlistSettings {
  customFields: CustomField[];
}

// Hono context variables
export interface Variables {
  user?: AccessUser;
}

// Hono app environment types
export type AppEnv = { Bindings: Env; Variables: Variables };
