import { createContext, useContext, useEffect, useMemo, useState } from "react";

const DEFAULT_THEME = "dark";
const STORAGE_KEY = "levelup-theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_THEME;
    }

    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    return storedTheme === "light" ? "light" : DEFAULT_THEME;
  });

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.remove("theme-dark", "theme-light");
    root.classList.add(theme === "light" ? "theme-light" : "theme-dark");
    root.style.colorScheme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      isLight: theme === "light",
      setTheme,
      toggleTheme: () => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return value;
}
