import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Tema claro/escuro/sistema. O flash na carga é evitado por um script inline
 * em index.html que já aplica a classe antes da primeira pintura — os efeitos
 * abaixo só mantêm a classe em sincronia depois que o React assume.
 */

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "vita:theme";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "dark" ? "#0e1514" : "#f7f9f8");
}

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lida na inicialização do estado, e não em efeito — mesmo motivo do
  // padrão em app-layout.tsx: ler em efeito reescreveria o valor salvo antes
  // que a remontagem do StrictMode o lesse de volta.
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    } catch {
      return "system";
    }
  });

  const resolvedTheme: ResolvedTheme = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Com "Sistema", acompanha a preferência do SO mesmo sem recarregar a página.
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme(systemPrefersDark() ? "dark" : "light");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = (value: ThemePreference) => {
    setThemeState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Preferência apenas em memória.
    }
  };

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme, resolvedTheme }), [theme, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme precisa estar dentro de <ThemeProvider>.");
  return context;
}
