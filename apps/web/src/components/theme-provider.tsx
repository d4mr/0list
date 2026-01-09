import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
} from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "0list-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
}

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

let themeListeners: Array<() => void> = [];

function subscribeToTheme(listener: () => void) {
  themeListeners = [...themeListeners, listener];
  return () => {
    themeListeners = themeListeners.filter((l) => l !== listener);
  };
}

function emitThemeChange() {
  for (const listener of themeListeners) {
    listener();
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getStoredTheme,
    () => "system" as Theme
  );

  const systemTheme = useSyncExternalStore(
    (callback) => {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", callback);
      return () => mediaQuery.removeEventListener("change", callback);
    },
    getSystemTheme,
    () => "dark" as const
  );

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  // Apply theme to document
  useSyncExternalStore(
    subscribeToTheme,
    () => {
      const resolved = theme === "system" ? getSystemTheme() : theme;
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
      return resolved;
    },
    () => "dark"
  );

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    emitThemeChange();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
