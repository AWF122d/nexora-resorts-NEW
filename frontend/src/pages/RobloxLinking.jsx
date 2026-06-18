import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link as LinkIcon, Unlink } from "lucide-react";

export default function RobloxLinking() {
  const { user, refresh } = useAuth();
  const [oauth, setOauth] = useState(null);

  useEffect(() => {
    const redirect = `${window.location.origin}/auth/roblox/callback`;
    api.get("/auth/roblox/url", { params: { redirect } }).then(({ data }) => setOauth(data));
  }, []);

  const start = () => {
    if (!oauth?.url) return;
    sessionStorage.setItem("nx_rbx_redirect", `${window.location.origin}/auth/roblox/callback`);
    window.location.href = oauth.url;
  };

  return (
    <div data-testid="roblox-linking-page" className="space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Step 2 of 2</div>
        <h1 className="font-serif text-4xl mt-2">Connect Roblox</h1>
        <p className="text-[var(--text-2)] mt-2 max-w-2xl">
          Securely link your Roblox account via Roblox OAuth. Your username, avatar and group rank in our
          Roblox group will sync automatically — this is what your in-game identity and authority overlay use.
        </p>
      </div>

      <div className="surface p-6">
        {user?.roblox_username ? (
          <>
            <div className="flex items-center gap-4">
              <img src={user.roblox_avatar} alt="" className="h-14 w-14 rounded-full bg-nx-gold/15" />
              <div className="flex-1">
                <div className="font-serif text-xl">{user.roblox_username}</div>
                <div className="text-xs text-[var(--text-2)]">ID {user.roblox_user_id} · {user.roblox_group_role?.name} ({user.roblox_group_role?.rank})</div>
              </div>
              <button onClick={start} disabled={!oauth?.configured}
                data-testid="roblox-reconnect-btn"
                className="rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5 inline-flex items-center gap-2">
                <LinkIcon className="h-3.5 w-3.5" /> Reconnect
              </button>
            </div>
            <a href="/dashboard" data-testid="roblox-continue-btn"
               className="btn-discord mt-6 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium">
              Continue to dashboard →
            </a>
          </>
        ) : (
          <div>
            <p className="text-sm text-[var(--text-2)]">No Roblox account linked yet.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={start} disabled={!oauth?.configured}
                data-testid="roblox-connect-btn"
                className="btn-discord rounded-md px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-60">
                <LinkIcon className="h-4 w-4" /> {oauth?.configured ? "Connect with Roblox" : "Roblox OAuth not configured"}
              </button>
              <a href="/dashboard" data-testid="roblox-skip-btn"
                 className="rounded-md border border-white/10 px-5 py-2.5 text-sm hover:bg-white/5">
                Skip for now
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
