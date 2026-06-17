import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import Bookings from "@/pages/Bookings";
import PlayerSearch from "@/pages/PlayerSearch";
import Events from "@/pages/Events";
import Sessions from "@/pages/Sessions";
import Schedule from "@/pages/Schedule";
import Ranking from "@/pages/Ranking";
import Authorities from "@/pages/Authorities";
import Forum from "@/pages/Forum";
import Hosting from "@/pages/Hosting";
import Settings from "@/pages/Settings";
import RobloxLinking from "@/pages/RobloxLinking";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";

function Protected({ children, perm }) {
  const { user, loading, hasPerm } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-zinc-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (perm && !hasPerm(perm)) {
    return (
      <div className="min-h-screen grid place-items-center p-8 text-center">
        <div className="max-w-md">
          <h2 className="font-serif text-3xl mb-3">Access Restricted</h2>
          <p className="text-zinc-400">You do not have the <code className="text-nx-gold">{perm}</code> permission required to view this page.</p>
        </div>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" theme="dark" />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/privacy-policy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            <Route element={<Protected perm="dashboard.view"><DashboardLayout /></Protected>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/player-search" element={<Protected perm="players.view"><PlayerSearch /></Protected>} />
              <Route path="/events" element={<Protected perm="events.create"><Events /></Protected>} />
              <Route path="/sessions" element={<Protected perm="sessions.create"><Sessions /></Protected>} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/ranking" element={<Protected perm="ranking.promote"><Ranking /></Protected>} />
              <Route path="/authorities" element={<Protected perm="authorities.grant"><Authorities /></Protected>} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/hosting" element={<Protected perm="hosting.manage"><Hosting /></Protected>} />
              <Route path="/settings" element={<Protected perm="settings.manage"><Settings /></Protected>} />
              <Route path="/robloxlinking" element={<Protected perm="roblox.link"><RobloxLinking /></Protected>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
