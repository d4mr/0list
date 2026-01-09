import { hc } from "hono/client";
import type { AppType } from "@d4mr/0list-api";

// Create typed client
export const client = hc<AppType>("/", {
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
});

// Convenience accessors
export const api = {
  health: client.api.health,
  config: client.api.config,
  admin: client.api.admin,
  public: client.api.w,
};

// Error handling helper
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
  }
}

// Response handler that throws on error
export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: { code?: string; message?: string } };
    throw new ApiError(
      response.status,
      data.error?.code || "UNKNOWN_ERROR",
      data.error?.message || "An error occurred"
    );
  }
  return response.json() as Promise<T>;
}
