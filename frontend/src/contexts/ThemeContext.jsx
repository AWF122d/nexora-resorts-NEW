import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const THEMES = ["dark", "light", "blurple"];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("nx_theme") || "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "light") document.documentElement.classList.remove("dark");
    else document.documentElement.classList.add("dark");
    localStorage.setItem("nx_theme", theme);
  }, [theme]);

  const cycle = () => {
    const i = THEMES.indexOf(theme);
    setTheme(THEMES[(i + 1) % THEMES.length]);
  };
  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycle, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
