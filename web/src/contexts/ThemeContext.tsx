import React, { createContext, useContext, useState, useEffect } from "react";

export type Theme = "lavender" | "hacker" | "paper" | "ocean" | "popart";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeNames: Record<Theme, { vi: string; en: string }> = {
  lavender: { vi: "Tím Mộng Mơ (Mặc định)", en: "Lavender (Default)" },
  hacker: { vi: "Hacker Mode", en: "Hacker Mode" },
  paper: { vi: "Giấy Cũ", en: "Old School Paper" },
  ocean: { vi: "Gió Biển", en: "Ocean Breeze" },
  popart: { vi: "Nghệ Thuật", en: "Pop Art" },
};

export const getThemeName = (theme: Theme, lang: "vi" | "en") => themeNames[theme][lang];

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("mailhub-theme");
    return (saved as Theme) || "lavender";
  });

  useEffect(() => {
    localStorage.setItem("mailhub-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
