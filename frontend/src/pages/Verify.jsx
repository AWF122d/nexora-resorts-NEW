import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ASSETS } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

export default function Verify() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const [discordUrl, setDiscordUrl] = useState(null);
  const [robloxUrl, setRobloxUrl] = useState(null);

  useEffect(() => {
    api.get("/auth/discord/url", { params: { redirect: `${window.location.origin}/auth/callback` } })
      .then(({ data }) => { if (data.configured) setDiscordUrl(data.url); });
    if (user) {
      api.get("/auth/roblox/url", { params: { redirect: `${window.location.origin}/auth/roblox/callback` } })
        .then(({ data }) => { if (data.configured) setRobloxUrl(data.url); });
    }
  }, [user]);

  const startRoblox = () => {
    if (!robloxUrl) return;
    sessionStorage.setItem("nx_rbx_redirect", `${window.location.origin}/auth/roblox/callback`);
    window.location.href = robloxUrl;
  };

  const discordDone = !!user;
  const robloxDone = !!user?.roblox_username;

  const Step = ({ idx, title, body, done, action }) => (
    <div className={`surface p-6 transition-all ${done ? "opacity-90" : ""}`}>
      <div className="flex items-start gap-4">
        <div className={`h-10 w-10 rounded-full grid place-items-center text-sm ${done ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-[var(--text-2)]"}`}>
          {done ? <CheckCircle2 className="h-5 w-5" /> : idx}
        </div>
        <div className="flex-1">
          <div className="font-serif text-xl">{title}</div>
          <p className="text-sm text-[var(--text-2)] mt-1">{body}</p>
          {!done && action}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen text-white">
      <img src={ASSETS.hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/80 to-black/95" />

      <div className="relative z-10 min-h-screen px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <Link to="/" className="inline-flex items-center gap-3" data-testid="verify-brand">
            <img src={ASSETS.logo} alt="Nexora" className="h-9 w-9" />
            <span className="font-serif text-lg">Nexora Resorts</span>
          </Link>

          <div className="mt-10">
            <div className="text-[11px] uppercase tracking-[0.4em] text-white/50">Verification</div>
            <h1 className="font-serif text-4xl sm:text-5xl tracking-tight mt-3">Welcome. Let's get you in.</h1>
            <p className="mt-4 text-white/65 max-w-xl">
              Two short steps to link your Discord and Roblox accounts. We use this to apply your group ranks
              automatically and keep our records straight. It takes about 30 seconds.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            <Step
              idx="1"
              title="Sign in with Discord"
              body="We verify your Discord identity and check what server roles you have."
              done={discordDone}
              action={discordUrl ? (
                <a href={discordUrl} data-testid="verify-discord-btn"
                   className="btn-discord mt-4 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium">
                  Continue with Discord <ArrowRight className="h-4 w-4" />
                </a>
              ) : <div className="text-xs text-amber-200/80 mt-3">Discord sign-in is currently unavailable.</div>}
            />
            <Step
              idx="2"
              title="Link Roblox"
              body="Connect your Roblox via the official Roblox OAuth flow. We'll pull your username, avatar, and group rank — and we'll auto-assign your Discord roles based on what you have in the group."
              done={robloxDone}
              action={
                <button onClick={startRoblox} disabled={!discordDone || !robloxUrl}
                  data-testid="verify-roblox-btn"
                  className="btn-discord mt-4 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium disabled:opacity-50">
                  <Sparkles className="h-4 w-4" /> {discordDone ? "Connect with Roblox" : "Finish step 1 first"}
                </button>
              }
            />
          </div>

          {discordDone && robloxDone && (
            <div className="mt-8 surface p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                <div className="font-serif text-xl">You're verified.</div>
              </div>
              <p className="text-sm text-white/60 mt-2">Roles have been synced.</p>
              <Link to="/dashboard" className="btn-discord mt-5 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium" data-testid="verify-continue-btn">
                Enter Nexora <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
