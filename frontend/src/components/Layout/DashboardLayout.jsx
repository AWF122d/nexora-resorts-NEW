import React from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ASSETS } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard, BedDouble, Search, CalendarDays, Activity,
  CalendarRange, TrendingUp, ShieldCheck, MessagesSquare,
  Server, Settings as SettingsIcon, Link2, LogOut, Terminal, GitBranch,
} from "lucide-react";
import RobloxIdentityCard from "@/components/RobloxIdentityCard";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, perm: "dashboard.view" },
  { to: "/bookings", label: "Bookings", icon: BedDouble, perm: "bookings.create" },
  { to: "/player-search", label: "Player Search", icon: Search, perm: "players.view" },
  { to: "/events", label: "Events", icon: CalendarDays, perm: "events.create" },
  { to: "/sessions", label: "Sessions", icon: Activity, perm: "sessions.create" },
  { to: "/schedule", label: "Schedule", icon: CalendarRange, perm: "dashboard.view" },
  { to: "/activity", label: "Activity", icon: Activity, perm: "dashboard.view" },
  { to: "/ranking", label: "Ranking", icon: TrendingUp, perm: "ranking.promote" },
  { to: "/authorities", label: "Authorities", icon: ShieldCheck, perm: "authorities.grant" },
  { to: "/role-links", label: "Role Linking", icon: GitBranch, perm: "settings.manage" },
  { to: "/forum", label: "Forum", icon: MessagesSquare, perm: "dashboard.view" },
  { to: "/hosting", label: "Bot Hosting", icon: Server, perm: "hosting.manage" },
  { to: "/api-integration", label: "Game API", icon: Terminal, perm: "settings.manage" },
  { to: "/robloxlinking", label: "Roblox Link", icon: Link2 },
  { to: "/settings", label: "Settings", icon: SettingsIcon, perm: "settings.manage" },
];

export default function DashboardLayout() {
  const { user, logout, hasPerm } = useAuth();
  const nav = useNavigate();
  const onLogout = () => { logout(); nav("/"); };

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)]">
      <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface-2)] hidden md:flex flex-col">
        <Link to="/dashboard" className="flex items-center gap-3 px-5 py-5 border-b border-[var(--border)]" data-testid="dash-brand">
          <img src={ASSETS.logo} alt="Nexora" className="h-8 w-8" />
          <div className="leading-tight">
            <div className="font-serif text-base">Nexora</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-2)]">Operations</div>
          </div>
        </Link>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.filter(n => !n.perm || hasPerm(n.perm)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`nav-${n.to.slice(1) || "home"}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-white/5 text-white"
                    : "text-[var(--text-2)] hover:text-white hover:bg-white/5"
                }`
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[var(--border)] p-3 space-y-3">
          <RobloxIdentityCard />
          <div className="flex items-center gap-2">
            <ThemeToggle className="flex-1 justify-center" />
            <button
              onClick={onLogout}
              data-testid="logout-btn"
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5 inline-flex items-center gap-2"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
