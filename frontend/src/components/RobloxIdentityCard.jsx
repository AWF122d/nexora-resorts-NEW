import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link as LinkIcon } from "lucide-react";

export default function RobloxIdentityCard() {
  const { user, refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const hasRoblox = !!user?.roblox_username;

  const link = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post("/me/roblox/link", { username: name.trim() });
      await refresh();
      toast.success(`Linked to ${name.trim()}`);
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not find Roblox user");
    } finally { setBusy(false); }
  };

  return (
    <div className="surface p-3" data-testid="roblox-identity-card">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full overflow-hidden bg-nx-gold/15 grid place-items-center text-sm shrink-0">
          {user?.roblox_avatar ? (
            <img src={user.roblox_avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{(user?.roblox_username || user?.username || "N")[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm truncate">{user?.roblox_username || user?.username}</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)] truncate">
            {user?.roblox_group_role?.name || (user?.roles?.[0] || "member")}
            {user?.roblox_group_role?.rank ? ` · ${user.roblox_group_role.rank}` : ""}
          </div>
        </div>
      </div>
      {!hasRoblox && !editing && (
        <button
          onClick={() => setEditing(true)}
          data-testid="link-roblox-open"
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] hover:bg-white/5"
        >
          <LinkIcon className="h-3 w-3" /> Link Roblox
        </button>
      )}
      {editing && (
        <form onSubmit={link} className="mt-3 flex gap-2">
          <input
            value={name} onChange={(e) => setName(e.target.value)} placeholder="Roblox username"
            data-testid="link-roblox-input"
            className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-white/30"
          />
          <button disabled={busy} type="submit" className="btn-discord rounded-md px-3 text-xs" data-testid="link-roblox-submit">
            {busy ? "…" : "Link"}
          </button>
        </form>
      )}
    </div>
  );
}
