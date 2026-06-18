import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    const code = params.get("code");
    if (!code) { nav("/login"); return; }
    (async () => {
      try {
        const { data } = await api.post("/auth/discord/callback", {
          code,
          redirect_uri: `${window.location.origin}/auth/callback`,
        });
        localStorage.setItem("nx_token", data.token);
        await refresh();
        toast.success(`Welcome, ${data.user.username}`);
        if (!data.user.roblox_username) {
          nav("/verify", { replace: true });
        } else {
          nav("/dashboard", { replace: true });
        }
      } catch (e) {
        toast.error("Discord sign-in failed");
        nav("/login", { replace: true });
      }
    })();
  }, [params, nav, refresh]);

  return (
    <div className="min-h-screen grid place-items-center text-zinc-400">Signing you in…</div>
  );
}
