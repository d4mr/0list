import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AppError extends HTTPException {
  code: string;

  constructor(
    status: ContentfulStatusCode,
    code: string,
    message: string,
    options?: { cause?: Error }
  ) {
    super(status, { message, cause: options?.cause });
    this.code = code;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

// Common errors
export const Errors = {
  // Auth
  Unauthorized: () =>
    new AppError(401, "UNAUTHORIZED", "Authentication required"),
  InvalidCredentials: () =>
    new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials"),
  Forbidden: (message: string = "Access denied") =>
    new AppError(403, "FORBIDDEN", message),

  // Validation
  ValidationError: (message: string) =>
    new AppError(400, "VALIDATION_ERROR", message),
  InvalidEmail: () =>
    new AppError(400, "INVALID_EMAIL", "Invalid email address"),

  // Resources
  NotFound: (resource: string) =>
    new AppError(404, "NOT_FOUND", `${resource} not found`),
  WaitlistNotFound: () =>
    new AppError(404, "WAITLIST_NOT_FOUND", "Waitlist not found"),
  SignupNotFound: () =>
    new AppError(404, "SIGNUP_NOT_FOUND", "Signup not found"),

  // Conflicts
  AlreadyExists: (resource: string) =>
    new AppError(409, "ALREADY_EXISTS", `${resource} already exists`),
  AlreadySignedUp: () =>
    new AppError(409, "ALREADY_SIGNED_UP", "This email is already on the waitlist"),
  AlreadyConfirmed: () =>
    new AppError(409, "ALREADY_CONFIRMED", "This email is already confirmed"),

  // Rate limiting
  RateLimited: () =>
    new AppError(429, "RATE_LIMITED", "Too many requests. Please try again later."),

  // Server
  InternalError: (message: string = "An unexpected error occurred") =>
    new AppError(500, "INTERNAL_ERROR", message),
  EmailError: () =>
    new AppError(500, "EMAIL_ERROR", "Failed to send email. Please try again."),
};
