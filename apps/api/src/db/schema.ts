import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import type { CustomField } from "../bindings";

// Waitlists table
export const waitlists = sqliteTable("waitlists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),

  // Branding
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#6366f1"),

  // Behavior
  doubleOptIn: integer("double_opt_in", { mode: "boolean" }).default(true),
  redirectUrl: text("redirect_url"),

  // Custom fields schema (JSON)
  customFields: text("custom_fields", { mode: "json" })
    .$type<CustomField[]>()
    .default([]),

  // Notifications
  notifyOnSignup: integer("notify_on_signup", { mode: "boolean" }).default(true),
  notifyEmail: text("notify_email"),
  webhookUrl: text("webhook_url"),

  // Email customization
  emailFromName: text("email_from_name"),
  emailSubjectConfirmation: text("email_subject_confirmation"),
  emailSubjectWelcome: text("email_subject_welcome"),

  // Security
  allowedOrigins: text("allowed_origins", { mode: "json" })
    .$type<string[]>()
    .default([]),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Signups table
export const signups = sqliteTable(
  "signups",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    waitlistId: text("waitlist_id")
      .notNull()
      .references(() => waitlists.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    position: integer("position").notNull(),
    status: text("status", { enum: ["pending", "confirmed", "invited"] })
      .notNull()
      .default("pending"),

    // Custom field values (JSON)
    customData: text("custom_data", { mode: "json" })
      .$type<Record<string, string>>()
      .default({}),

    // Tracking
    referralSource: text("referral_source"), // tag: "producthunt", "twitter"
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    // Confirmation
    confirmationToken: text("confirmation_token"),
    confirmedAt: integer("confirmed_at", { mode: "timestamp" }),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("waitlist_email_unique").on(table.waitlistId, table.email),
    index("waitlist_position_idx").on(table.waitlistId, table.position),
    index("status_idx").on(table.status),
    index("confirmation_token_idx").on(table.confirmationToken),
    index("created_at_idx").on(table.createdAt),
  ]
);

// Type exports
export type Waitlist = typeof waitlists.$inferSelect;
export type NewWaitlist = typeof waitlists.$inferInsert;
export type Signup = typeof signups.$inferSelect;
export type NewSignup = typeof signups.$inferInsert;
