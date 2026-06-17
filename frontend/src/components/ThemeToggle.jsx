import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, Sparkles } from "lucide-react";

const Icon = { dark: Moon, light: Sun, blurple: Sparkles };

export default function ThemeToggle({ className = "" }) {
  const { theme, cycle } = useTheme();
  const I = Icon[theme] || Moon;
  return (
    <button
      data-testid="theme-toggle"
      onClick={cycle}
      className={`inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-[0.18em] hover:bg-white/5 transition-colors ${className}`}
      title={`Theme: ${theme} (click to change)`}
    >
      <I className="h-3.5 w-3.5" />
      <span>{theme}</span>
    </button>
  );
}
