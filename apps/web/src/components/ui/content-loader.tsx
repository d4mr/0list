import * as React from "react";
import { useDelayedLoading } from "@/lib/hooks";

interface ContentLoaderProps<T> {
  /** The data being loaded - used to determine if content is available */
  data: T | undefined | null;
  /** Whether the query is currently loading */
  isLoading: boolean;
  /** Content to show while loading (only shown after delay) */
  skeleton?: React.ReactNode;
  /** Content to show when data is empty (only shown when not loading and data is empty/undefined) */
  empty?: React.ReactNode;
  /** The content to render when data is available */
  children: React.ReactNode | ((data: T) => React.ReactNode);
  /** Delay in ms before showing skeleton (default: 150ms) */
  delay?: number;
  /** Custom function to check if data is considered empty (default: checks if data is falsy or empty array) */
  isEmpty?: (data: T) => boolean;
}

/**
 * ContentLoader handles loading states properly:
 * 1. Shows nothing initially while loading (no flash)
 * 2. Shows skeleton only after delay if still loading
 * 3. Shows empty state only when loading is complete and data is empty
 * 4. Shows children when data is available
 *
 * @example
 * ```tsx
 * <ContentLoader
 *   data={waitlists}
 *   isLoading={isLoading}
 *   skeleton={<WaitlistsSkeleton />}
 *   empty={<EmptyState />}
 * >
 *   {(data) => <WaitlistsList waitlists={data} />}
 * </ContentLoader>
 * ```
 */
export function ContentLoader<T>({
  data,
  isLoading,
  skeleton,
  empty,
  children,
  delay = 150,
  isEmpty: customIsEmpty,
}: ContentLoaderProps<T>) {
  const showLoading = useDelayedLoading(isLoading, delay);

  // Check if data is empty
  const dataIsEmpty = React.useMemo(() => {
    if (data === undefined || data === null) return true;
    if (customIsEmpty) return customIsEmpty(data);
    if (Array.isArray(data)) return data.length === 0;
    if (typeof data === "object") return Object.keys(data).length === 0;
    return false;
  }, [data, customIsEmpty]);

  // Show skeleton if loading for longer than delay and no data yet
  if (showLoading && !data) {
    return <>{skeleton}</>;
  }

  // Show empty state only when loading is complete and data is empty
  if (!isLoading && dataIsEmpty) {
    return <>{empty}</>;
  }

  // Show content when data is available
  if (data && !dataIsEmpty) {
    if (typeof children === "function") {
      return <>{children(data)}</>;
    }
    return <>{children}</>;
  }

  // Still loading but before delay - show nothing
  return null;
}

/**
 * A simpler variant for when you just want to conditionally show content or skeleton.
 * Use when you don't need an empty state.
 *
 * @example
 * ```tsx
 * <LoadingContent
 *   isLoading={isLoading}
 *   hasData={!!data}
 *   skeleton={<Skeleton className="h-6 w-40" />}
 * >
 *   <h1>{data.title}</h1>
 * </LoadingContent>
 * ```
 */
export function LoadingContent({
  isLoading,
  hasData,
  skeleton,
  children,
  delay = 150,
}: {
  isLoading: boolean;
  hasData: boolean;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) {
  const showLoading = useDelayedLoading(isLoading, delay);

  // Show skeleton if loading for longer than delay and no data
  if (showLoading && !hasData) {
    return <>{skeleton}</>;
  }

  // Show content if we have data
  if (hasData) {
    return <>{children}</>;
  }

  // Still loading but before delay - show nothing
  return null;
}
