import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ASSETS } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { user, demoLogin } = useAuth();
  const nav = useNavigate();
  const [discordUrl, setDiscordUrl] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav("/dashboard", { replace: true });
  }, [user, nav]);

  useEffect(() => {
    api.get("/auth/discord/url", { params: { redirect: `${window.location.origin}/auth/callback` } })
      .then(({ data }) => { if (data.configured) setDiscordUrl(data.url); })
      .catch(() => {});
  }, []);

  const onDemo = async () => {
    setBusy(true);
    try { await demoLogin(true); toast.success("Signed in (Demo Owner)"); nav("/dashboard"); }
    catch (e) { toast.error("Demo login failed"); }
    finally { setBusy(false); }
  };

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
          <p className="mt-2 text-sm text-white/60">Sign in to access the operations cockpit.</p>

          <div className="mt-8 space-y-3">
            {discordUrl ? (
              <a
                href={discordUrl}
                data-testid="login-discord-btn"
                className="btn-discord block rounded-md px-6 py-3 font-medium text-sm"
              >
                Continue with Discord
              </a>
            ) : (
              <button
                disabled
                className="btn-discord w-full rounded-md px-6 py-3 font-medium text-sm opacity-60 cursor-not-allowed"
                title="Add DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET to enable real OAuth."
                data-testid="login-discord-disabled"
              >
                Discord OAuth not configured
              </button>
            )}

            <button
              onClick={onDemo}
              disabled={busy}
              data-testid="login-demo-btn"
              className="w-full rounded-md border border-white/15 px-6 py-3 text-sm hover:bg-white/5 transition-colors"
            >
              {busy ? "Signing in…" : "Continue as Demo Owner"}
            </button>
          </div>

          <p className="mt-7 text-[11px] uppercase tracking-[0.3em] text-white/40">
            Protected · Role-based · Logged
          </p>
        </div>
      </div>
    </div>
  );
}
