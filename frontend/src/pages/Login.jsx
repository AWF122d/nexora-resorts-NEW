import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ASSETS } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [discordUrl, setDiscordUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) nav("/dashboard", { replace: true });
  }, [user, nav]);

  useEffect(() => {
    api.get("/auth/discord/url", { params: { redirect: `${window.location.origin}/auth/callback` } })
      .then(({ data }) => { if (data.configured) setDiscordUrl(data.url); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative min-h-screen text-white">
      <img src={ASSETS.hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90" />

      <div className="relative z-10 min-h-screen grid place-items-center px-6">
        <div className="w-full max-w-md surface p-8 sm:p-10 text-center bg-black/60 backdrop-blur-xl border-white/10">
          <Link to="/" className="inline-flex items-center gap-3 mb-7" data-testid="login-brand">
            <img src={ASSETS.logo} alt="Nexora" className="h-10 w-10" />
            <span className="font-serif text-xl">Nexora Resorts</span>
          </Link>
          <h1 className="font-serif text-3xl tracking-tight">Welcome back.</h1>
          <p className="mt-2 text-sm text-white/60">Sign in with Discord to access the resort.</p>

          <div className="mt-8">
            {loading ? (
              <div className="text-sm text-white/50">Checking sign-in…</div>
            ) : discordUrl ? (
              <a href={discordUrl} data-testid="login-discord-btn"
                 className="btn-discord block rounded-md px-6 py-3 font-medium text-sm">
                Continue with Discord
              </a>
            ) : (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-200 text-xs p-4 text-left">
                Sign-in is temporarily unavailable. Please contact a Nexora administrator.
              </div>
            )}
          </div>

          <p className="mt-7 text-[11px] uppercase tracking-[0.3em] text-white/40">
            Protected · Role-based · Logged
          </p>
        </div>
      </div>
    </div>
  );
}
