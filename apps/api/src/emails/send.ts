import { Resend } from "resend";
import { render } from "@react-email/render";
import { createMimeMessage } from "mimetext";
import * as React from "react";
import type { Env } from "../bindings";
import type { Waitlist, Signup } from "../db/schema";
import { ConfirmationEmail } from "./templates/confirmation";
import { WelcomeEmail } from "./templates/welcome";
import { AdminNotificationEmail } from "./templates/admin-notification";

interface EmailContext {
  env: Env;
  baseUrl: string;
}

/**
 * Send confirmation email to user
 */
/**
 * Check if email sending is configured
 */
export function isEmailConfigured(env: Env): boolean {
  return !!(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
}

/**
 * Send confirmation email to user
 * Throws if email is not configured (confirmation emails are required for double opt-in)
 */
export async function sendConfirmationEmail(
  ctx: EmailContext,
  waitlist: Waitlist,
  signup: Signup
): Promise<void> {
  if (!ctx.env.RESEND_API_KEY || !ctx.env.RESEND_FROM_EMAIL) {
    throw new Error("Email not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL to enable double opt-in.");
  }

  const confirmationUrl = `${ctx.baseUrl}/api/w/${waitlist.slug}/confirm/${signup.confirmationToken}`;
  
  const html = await render(
    React.createElement(ConfirmationEmail, {
      waitlistName: waitlist.name,
      logoUrl: waitlist.logoUrl || undefined,
      primaryColor: waitlist.primaryColor || "#6366f1",
      confirmationUrl,
      position: signup.position,
    })
  );

  const resend = new Resend(ctx.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: `${waitlist.emailFromName || waitlist.name} <${ctx.env.RESEND_FROM_EMAIL}>`,
    to: signup.email,
    subject: waitlist.emailSubjectConfirmation || `Confirm your spot on the ${waitlist.name} waitlist`,
    html,
  });
}

/**
 * Send welcome email after confirmation
 */
export async function sendWelcomeEmail(
  ctx: EmailContext,
  waitlist: Waitlist,
  signup: Signup
): Promise<void> {
  if (!ctx.env.RESEND_API_KEY || !ctx.env.RESEND_FROM_EMAIL) {
    console.log("[Email] Resend not configured, skipping welcome email");
    return;
  }

  const html = await render(
    React.createElement(WelcomeEmail, {
      waitlistName: waitlist.name,
      logoUrl: waitlist.logoUrl || undefined,
      primaryColor: waitlist.primaryColor || "#6366f1",
      position: signup.position,
    })
  );

  const resend = new Resend(ctx.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: `${waitlist.emailFromName || waitlist.name} <${ctx.env.RESEND_FROM_EMAIL}>`,
    to: signup.email,
    subject: waitlist.emailSubjectWelcome || `You're #${signup.position} on the ${waitlist.name} waitlist!`,
    html,
  });
}

/**
 * Send notification to admin using CF Email Workers or Resend
 */
export async function sendAdminNotificationEmail(
  ctx: EmailContext,
  waitlist: Waitlist,
  signup: Signup
): Promise<void> {
  if (!waitlist.notifyOnSignup) return;

  const adminUrl = `${ctx.baseUrl}/admin/waitlists/${waitlist.id}/signups`;

  const html = await render(
    React.createElement(AdminNotificationEmail, {
      waitlistName: waitlist.name,
      signupEmail: signup.email,
      position: signup.position,
      customData: (signup.customData as Record<string, string>) || {},
      referralSource: signup.referralSource || undefined,
      adminUrl,
    })
  );

  // Try CF Email Workers first if configured
  if (ctx.env.ADMIN_EMAIL && waitlist.notifyEmail) {
    try {
      // Dynamic import for cloudflare:email (not available in local dev)
      const { EmailMessage } = await import("cloudflare:email");
      
      const msg = createMimeMessage();
      msg.setSender({ name: "0list", addr: `noreply@${new URL(ctx.baseUrl).hostname}` });
      msg.setRecipient(waitlist.notifyEmail);
      msg.setSubject(`New signup #${signup.position}: ${signup.email}`);
      msg.addMessage({ contentType: "text/html", data: html });

      const message = new EmailMessage(
        `noreply@${new URL(ctx.baseUrl).hostname}`,
        waitlist.notifyEmail,
        msg.asRaw()
      );
      
      await ctx.env.ADMIN_EMAIL.send(message);
      return;
    } catch (error) {
      console.error("[Email] CF Email Workers failed:", error);
      // Fall through to Resend
    }
  }

  // Fallback to Resend
  if (ctx.env.RESEND_API_KEY && ctx.env.RESEND_FROM_EMAIL && waitlist.notifyEmail) {
    const resend = new Resend(ctx.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: `0list <${ctx.env.RESEND_FROM_EMAIL}>`,
      to: waitlist.notifyEmail,
      subject: `New signup #${signup.position}: ${signup.email}`,
      html,
    });
  } else {
    console.log("[Email] Admin notification not configured, skipping");
  }
}

/**
 * Render email template for preview
 */
export async function renderEmailPreview(
  template: "confirmation" | "welcome" | "admin-notification",
  waitlist: Waitlist,
  sampleData: {
    email?: string;
    position?: number;
    customData?: Record<string, string>;
    referralSource?: string;
  },
  baseUrl: string
): Promise<string> {
  const { email = "test@example.com", position = 47, customData = {}, referralSource } = sampleData;

  switch (template) {
    case "confirmation":
      return render(
        React.createElement(ConfirmationEmail, {
          waitlistName: waitlist.name,
          logoUrl: waitlist.logoUrl || undefined,
          primaryColor: waitlist.primaryColor || "#6366f1",
          confirmationUrl: `${baseUrl}/api/w/${waitlist.slug}/confirm/sample-token`,
          position,
        })
      );

    case "welcome":
      return render(
        React.createElement(WelcomeEmail, {
          waitlistName: waitlist.name,
          logoUrl: waitlist.logoUrl || undefined,
          primaryColor: waitlist.primaryColor || "#6366f1",
          position,
        })
      );

    case "admin-notification":
      return render(
        React.createElement(AdminNotificationEmail, {
          waitlistName: waitlist.name,
          signupEmail: email,
          position,
          customData,
          referralSource,
          adminUrl: `${baseUrl}/admin/waitlists/${waitlist.id}/signups`,
        })
      );

    default:
      throw new Error(`Unknown template: ${template}`);
  }
}
