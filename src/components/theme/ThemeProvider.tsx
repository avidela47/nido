"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  toggle: () => void;
  setTheme: (value: Theme) => void;
  hydrated: boolean;
};

const STORAGE_KEY = "nido_theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreferredTheme(): Theme {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark";
  }

  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) {
    return "dark";
  }

  return "light";
}

function applyThemeClass(next: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", next === "dark");
}

function persistTheme(next: Theme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* noop */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Importante: el estado inicial debe ser estable y no depender del cliente,
  // para que el HTML del servidor coincida con el primer render del cliente.
  const [theme, setThemeState] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Aplicar preferencia *después* de hidratar para evitar mismatch.
    let preferred: Theme | null = null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        preferred = stored;
      }
    } catch {
      /* ignore */
    }

    const nextTheme = preferred ?? readPreferredTheme();
    // Evitamos setState directamente en el cuerpo del effect (regla/lint).
    // El timeout también garantiza que el primer render del cliente coincida con el SSR.
    const id = window.setTimeout(() => {
      setThemeState(nextTheme);
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    applyThemeClass(theme);
    persistTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      toggle,
      setTheme,
      hydrated,
    }),
    [theme, toggle, setTheme, hydrated]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
