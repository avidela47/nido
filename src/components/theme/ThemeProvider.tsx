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
    // Modo oscuro deshabilitado globalmente: forzamos siempre "light".
    // - Si el usuario tenía `nido_theme=dark`, lo sobrescribimos.
    // - Si el <html> tenía la clase `dark`, la removemos.
    const id = window.setTimeout(() => {
      setThemeState("light");
      applyThemeClass("light");
      persistTheme("light");
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    // Blindaje extra: aunque alguien intente setear theme a "dark",
    // la clase y la persistencia se mantienen en light.
    applyThemeClass("light");
    persistTheme("light");
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    // Soportamos la API para no romper imports, pero ignoramos "dark".
    setThemeState(next === "dark" ? "light" : next);
  }, []);

  const toggle = useCallback(() => {
    // Toggle deshabilitado: se queda en light.
    setThemeState("light");
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
