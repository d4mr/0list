import { useState, useEffect } from "react";

/**
 * Returns a delayed loading state that only becomes true after the specified delay.
 * This prevents flash of loading state for fast requests.
 *
 * @param isLoading - The actual loading state from a query
 * @param delay - Delay in ms before showing loading state (default: 150ms)
 * @returns boolean - Whether to show loading UI
 */
export function useDelayedLoading(isLoading: boolean, delay: number = 150): boolean {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoading(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [isLoading, delay]);

  return showLoading;
}

/**
 * Returns delayed loading states for multiple queries.
 * Useful when you have independent data that loads at different speeds.
 *
 * @param loadingStates - Object with named loading states
 * @param delay - Delay in ms before showing loading state (default: 150ms)
 * @returns Object with same keys but delayed loading states
 */
export function useDelayedLoadingMultiple<T extends Record<string, boolean>>(
  loadingStates: T,
  delay: number = 150
): T {
  const [showStates, setShowStates] = useState<T>(
    () => Object.fromEntries(Object.keys(loadingStates).map(k => [k, false])) as T
  );

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    Object.entries(loadingStates).forEach(([key, isLoading]) => {
      if (isLoading) {
        const timer = setTimeout(() => {
          setShowStates(prev => ({ ...prev, [key]: true }));
        }, delay);
        timers.push(timer);
      } else {
        setShowStates(prev => ({ ...prev, [key]: false }));
      }
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [JSON.stringify(loadingStates), delay]);

  return showStates;
}
