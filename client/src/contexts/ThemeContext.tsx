import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type Accent = "blue" | "purple" | "cyan" | "emerald" | "amber" | "rose";
type Density = "comfortable" | "compact" | "spacious";
type CardStyle = "glass" | "solid" | "bordered";
type Preset = "neural" | "cyber" | "minimal" | "oled" | "studio";

interface ThemeConfig {
  mode: Theme;
  accent: Accent;
  density: Density;
  cardStyle: CardStyle;
  preset: Preset;
  animations: boolean;
}

interface ThemeContextType {
  config: ThemeConfig;
  setAccent: (a: Accent) => void;
  setDensity: (d: Density) => void;
  setCardStyle: (s: CardStyle) => void;
  setPreset: (p: Preset) => void;
  setAnimations: (v: boolean) => void;
  toggleTheme: () => void;
  theme: Theme;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const PRESETS: Record<Preset, Partial<ThemeConfig>> = {
  neural: { mode: "dark", accent: "blue", cardStyle: "glass", density: "comfortable" },
  cyber: { mode: "dark", accent: "cyan", cardStyle: "bordered", density: "compact" },
  minimal: { mode: "dark", accent: "blue", cardStyle: "solid", density: "compact" },
  oled: { mode: "dark", accent: "blue", cardStyle: "bordered", density: "compact" },
  studio: { mode: "light", accent: "blue", cardStyle: "solid", density: "comfortable" },
};

const ACCENT_COLORS: Record<Accent, { light: string; dark: string; ring: string }> = {
  blue: { light: "217.2 91.2% 59.8%", dark: "217.2 91.2% 59.8%", ring: "224.3 76.3% 48%" },
  purple: { light: "270 95% 75%", dark: "270 95% 75%", ring: "270 95% 60%" },
  cyan: { light: "189 94% 43%", dark: "189 94% 55%", ring: "189 94% 48%" },
  emerald: { light: "160 84% 39%", dark: "160 84% 50%", ring: "160 84% 39%" },
  amber: { light: "38 92% 50%", dark: "38 92% 55%", ring: "38 92% 45%" },
  rose: { light: "350 89% 60%", dark: "350 89% 65%", ring: "350 89% 55%" },
};

function getStoredConfig(): ThemeConfig {
  try {
    const stored = localStorage.getItem("forge-theme-config");
    if (stored) return JSON.parse(stored) as ThemeConfig;
  } catch {}
  return PRESETS.neural as ThemeConfig;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = true,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}) {
  const [config, setConfig] = useState<ThemeConfig>(getStoredConfig);

  useEffect(() => {
    localStorage.setItem("forge-theme-config", JSON.stringify(config));
    const root = document.documentElement;

    // Mode
    if (config.mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    // Accent CSS variables
    const accent = ACCENT_COLORS[config.accent];
    root.style.setProperty("--accent-color", accent.dark);
    root.style.setProperty("--accent-ring", accent.ring);

    // Density
    root.style.setProperty("--density-padding", config.density === "compact" ? "0.5rem" : config.density === "spacious" ? "1.25rem" : "1rem");
    root.style.setProperty("--density-gap", config.density === "compact" ? "0.5rem" : config.density === "spacious" ? "1.25rem" : "0.75rem");

    // Animations
    root.style.setProperty("--transition-speed", config.animations ? "0.2s" : "0s");

    // Card style
    root.setAttribute("data-card-style", config.cardStyle);
    if (config.preset === "oled") {
      root.style.setProperty("--background", "#000000");
    }
  }, [config]);

  const theme = config.mode;

  const toggleTheme = switchable
    ? () => setConfig(prev => ({ ...prev, mode: prev.mode === "dark" ? "light" : "dark" }))
    : () => {};

  return (
    <ThemeContext.Provider
      value={{
        config,
        theme,
        switchable,
        toggleTheme,
        setAccent: (a) => setConfig(prev => ({ ...prev, accent: a })),
        setDensity: (d) => setConfig(prev => ({ ...prev, density: d })),
        setCardStyle: (s) => setConfig(prev => ({ ...prev, cardStyle: s })),
        setPreset: (p) => setConfig(prev => ({ ...prev, ...PRESETS[p], preset: p })),
        setAnimations: (v) => setConfig(prev => ({ ...prev, animations: v })),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
