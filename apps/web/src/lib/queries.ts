import {
  useQuery,
  useMutation,
  useQueryClient,
  queryOptions,
  keepPreviousData,
} from "@tanstack/react-query";
import { api, handleResponse, ApiError } from "./api";

// Import types from backend
import type { Waitlist as DbWaitlist, Signup as DbSignup } from "@d4mr/0list-api/schema";
import type { CustomField } from "@d4mr/0list-api/types";

// ============ Query Keys ============

export const queryKeys = {
  config: ["config"] as const,
  auth: ["auth"] as const,
  waitlists: ["waitlists"] as const,
  waitlist: (id: string) => ["waitlists", id] as const,
  signups: (waitlistId: string, params?: SignupsParams) =>
    ["waitlists", waitlistId, "signups", params] as const,
  stats: (waitlistId: string, params?: StatsParams) =>
    ["waitlists", waitlistId, "stats", params] as const,
  dashboardStats: (params?: StatsParams) => ["dashboard", "stats", params] as const,
};

// ============ Types ============

// Re-export backend types with serialized dates (API returns ISO strings, not Date objects)
export interface Waitlist extends Omit<DbWaitlist, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

export interface Signup extends Omit<DbSignup, "createdAt" | "confirmedAt"> {
  createdAt: string;
  confirmedAt: string | null;
}

export interface WaitlistWithCounts {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  createdAt: string;
  signupCount: number;
  confirmedCount: number;
}

export type { CustomField };

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StatsParams {
  from?: string;
  to?: string;
  compare?: boolean;
}

export interface WaitlistStats {
  period: { from: string; to: string };
  counts: {
    current: { total: number; pending: number; confirmed: number; invited: number };
    previous: { total: number; pending: number; confirmed: number; invited: number };
    allTime: { total: number; pending: number; confirmed: number; invited: number };
    change: { total: number; confirmed: number };
  };
  todaySignups: number;
  confirmationRate: { current: number; previous: number; change: number };
  dailySignups: { date: string; count: number; confirmed: number }[];
  hourlyDistribution: { hour: number; count: number }[];
  sources: { source: string; count: number; confirmed: number; rate: number }[];
}

export interface DashboardStats {
  period: { from: string; to: string };
  overview: {
    waitlists: number;
    signups: { current: number; previous: number; allTime: number; change: number };
    confirmed: { current: number; previous: number; allTime: number; change: number };
    confirmationRate: { current: number; previous: number; change: number };
  };
  dailySignups: { date: string; count: number; confirmed: number }[];
  topWaitlists: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string | null;
    signups: number;
    confirmed: number;
    rate: number;
  }[];
  sources: { source: string; count: number }[];
}

export interface SignupsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "pending" | "confirmed" | "invited";
  sort?: string;
  order?: "asc" | "desc";
}

export interface AuthResponse {
  authenticated: boolean;
  user?: { email: string };
  cfAccessConfigured: boolean;
  transactionalEmailEnabled: boolean;
}

export interface ConfigResponse {
  demoMode: boolean;
}

// ============ Config Queries ============

export const configQueryOptions = queryOptions({
  queryKey: queryKeys.config,
  queryFn: async () => {
    const res = await api.config.$get();
    return handleResponse<ConfigResponse>(res);
  },
  staleTime: Infinity, // Config doesn't change during session
  retry: false,
});

export function useConfig() {
  return useQuery(configQueryOptions);
}

// ============ Auth Queries ============

export const authQueryOptions = queryOptions({
  queryKey: queryKeys.auth,
  queryFn: async () => {
    const res = await api.admin.auth.$get();
    return handleResponse<AuthResponse>(res);
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
  retry: false,
});

export function useAuth() {
  return useQuery(authQueryOptions);
}

// ============ Waitlist Queries ============

export const waitlistsQueryOptions = queryOptions({
  queryKey: queryKeys.waitlists,
  queryFn: async () => {
    const res = await api.admin.waitlists.$get();
    return handleResponse<{ waitlists: WaitlistWithCounts[] }>(res);
  },
});

export function useWaitlists() {
  return useQuery(waitlistsQueryOptions);
}

export function waitlistQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.waitlist(id),
    queryFn: async () => {
      const res = await api.admin.waitlists[":id"].$get({
        param: { id },
      });
      return handleResponse<{ waitlist: Waitlist }>(res);
    },
    enabled: !!id,
  });
}

export function useWaitlist(id: string) {
  return useQuery(waitlistQueryOptions(id));
}

export function useCreateWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await api.admin.waitlists.$post({
        json: data,
      });
      return handleResponse<{ waitlist: Waitlist }>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.waitlists });
    },
  });
}

export function useUpdateWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Waitlist> }) => {
      const res = await api.admin.waitlists[":id"].$patch({
        param: { id },
        json: data,
      });
      return handleResponse<{ waitlist: Waitlist }>(res);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.waitlist(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.waitlists });
    },
  });
}

export function useDeleteWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.admin.waitlists[":id"].$delete({
        param: { id },
      });
      return handleResponse<{ success: boolean }>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.waitlists });
    },
  });
}

// ============ Signups Queries ============

export function signupsQueryOptions(waitlistId: string, params: SignupsParams = {}) {
  return queryOptions({
    queryKey: queryKeys.signups(waitlistId, params),
    queryFn: async () => {
      const res = await api.admin.waitlists[":id"].signups.$get({
        param: { id: waitlistId },
        query: params as Record<string, string>,
      });
      return handleResponse<{ signups: Signup[]; pagination: Pagination }>(res);
    },
    enabled: !!waitlistId,
  });
}

export function useSignups(waitlistId: string, params: SignupsParams = {}) {
  return useQuery(signupsQueryOptions(waitlistId, params));
}

export function useUpdateSignupStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      waitlistId,
      signupId,
      status,
    }: {
      waitlistId: string;
      signupId: string;
      status: "pending" | "confirmed" | "invited";
    }) => {
      const res = await api.admin.waitlists[":id"].signups[":signupId"].$patch({
        param: { id: waitlistId, signupId },
        json: { status },
      });
      return handleResponse<{ signup: Signup }>(res);
    },
    onSuccess: (_, { waitlistId }) => {
      queryClient.invalidateQueries({
        queryKey: ["waitlists", waitlistId, "signups"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats(waitlistId),
      });
    },
  });
}

// ============ Stats Queries ============

export function statsQueryOptions(waitlistId: string, params: StatsParams = {}) {
  return queryOptions({
    queryKey: queryKeys.stats(waitlistId, params),
    queryFn: async () => {
      const res = await api.admin.waitlists[":id"].stats.$get({
        param: { id: waitlistId },
        query: {
          from: params.from,
          to: params.to,
          compare: params.compare ? "true" : undefined,
        },
      });
      return handleResponse<WaitlistStats>(res);
    },
    enabled: !!waitlistId,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: keepPreviousData, // Keep showing old data while fetching new
  });
}

export function useStats(waitlistId: string, params: StatsParams = {}) {
  return useQuery(statsQueryOptions(waitlistId, params));
}

export function dashboardStatsQueryOptions(params: StatsParams = {}) {
  return queryOptions({
    queryKey: queryKeys.dashboardStats(params),
    queryFn: async () => {
      const res = await api.admin.stats.$get({
        query: {
          from: params.from,
          to: params.to,
          compare: params.compare ? "true" : undefined,
        },
      });
      return handleResponse<DashboardStats>(res);
    },
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: keepPreviousData, // Keep showing old data while fetching new
  });
}

export function useDashboardStats(params: StatsParams = {}) {
  return useQuery(dashboardStatsQueryOptions(params));
}

// ============ Export URL Helper ============

export function getExportUrl(waitlistId: string): string {
  return `/api/admin/waitlists/${waitlistId}/signups/export`;
}

export function getEmailPreviewUrl(
  waitlistId: string,
  template: string,
  params?: { email?: string; position?: number }
): string {
  const searchParams = new URLSearchParams();
  if (params?.email) searchParams.set("email", params.email);
  if (params?.position) searchParams.set("position", params.position.toString());
  const query = searchParams.toString();
  return `/api/admin/waitlists/${waitlistId}/emails/${template}/preview${query ? `?${query}` : ""}`;
}

// Re-export ApiError for use in components
export { ApiError };
