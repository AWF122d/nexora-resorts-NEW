import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function RobloxCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { refresh, user } = useAuth();

  useEffect(() => {
    const code = params.get("code");
    const redirect = sessionStorage.getItem("nx_rbx_redirect") || `${window.location.origin}/auth/roblox/callback`;
    if (!code) { nav("/robloxlinking"); return; }
    if (!user) { nav("/login"); return; }
    (async () => {
      try {
        await api.post("/auth/roblox/callback", { code, redirect_uri: redirect });
        await refresh();
        toast.success("Roblox account connected");
        nav("/robloxlinking", { replace: true });
      } catch (e) {
        toast.error(e.response?.data?.detail || "Roblox link failed");
        nav("/robloxlinking", { replace: true });
      }
    })();
  }, [params, nav, refresh, user]);

  return <div className="min-h-screen grid place-items-center text-[var(--text-2)]">Linking your Roblox account…</div>;
}
