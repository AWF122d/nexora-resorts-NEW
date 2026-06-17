import React from "react";
import { Link } from "react-router-dom";
import { ASSETS } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

export default function MarketingHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="brand-home-link">
          <img src={ASSETS.logo} alt="Nexora" className="h-9 w-9" />
          <div className="leading-tight">
            <div className="font-serif text-lg text-white">Nexora</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">Resorts</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-white/70">
          <a href="#experience" className="hover:text-white transition-colors">Experience</a>
          <a href="#suites" className="hover:text-white transition-colors">Suites</a>
          <a href="#operations" className="hover:text-white transition-colors">Operations</a>
          <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/login"
            data-testid="header-signin-link"
            className="btn-discord inline-flex items-center rounded-md px-4 py-2 text-sm font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
