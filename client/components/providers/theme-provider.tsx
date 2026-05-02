"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  CRM_THEME_STORAGE_KEY,
  DEFAULT_CRM_THEME,
  type CRMThemeMode,
  readStoredTheme,
} from "@/lib/theme-storage";

type ThemeContextValue = {
  theme: CRMThemeMode;
  setTheme: (theme: CRMThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_CRM_THEME,
  setTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<CRMThemeMode>(DEFAULT_CRM_THEME);

  useLayoutEffect(() => {
    const stored = readStoredTheme();
    const next = stored ?? DEFAULT_CRM_THEME;
    setThemeState(next);
    document.documentElement.dataset.theme = next;
  }, []);

  const setTheme = useCallback((nextTheme: CRMThemeMode) => {
    setThemeState(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CRM_THEME_STORAGE_KEY, nextTheme);
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
