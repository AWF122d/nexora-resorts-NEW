import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Settings() {
  const [s, setS] = useState(null);
  const [users, setUsers] = useState([]);
  const [perms, setPerms] = useState([]);
  useEffect(() => {
    Promise.all([
      api.get("/settings"), api.get("/users"), api.get("/permissions"),
    ]).then(([a, b, c]) => { setS(a.data.settings); setUsers(b.data.users || []); setPerms(c.data.permissions || []); });
  }, []);

  const save = async () => {
    try {
      await api.put("/settings", { roblox_group_id: s.roblox_group_id || null });
      toast.success("Settings saved");
    } catch (e) { toast.error("Save failed"); }
  };

  const togglePerm = async (u, perm) => {
    const has = u.permissions?.includes(perm);
    const next = has ? u.permissions.filter(p => p !== perm) : [...(u.permissions || []), perm];
    await api.put(`/users/${u.id}/permissions`, { permissions: next });
    setUsers(users.map(x => x.id === u.id ? { ...x, permissions: next } : x));
  };

  if (!s) return <div className="text-[var(--text-2)]">Loading…</div>;

  return (
    <div data-testid="settings-page" className="space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Configuration</div>
        <h1 className="font-serif text-4xl mt-2">Settings</h1>
      </div>

      <div className="surface p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">Discord</div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><div className="text-[var(--text-2)]">Guild ID</div><div className="mt-1">{s.guild_id || "—"}</div></div>
          <div><div className="text-[var(--text-2)]">Bot status</div><div className="mt-1">{s.bot_status}</div></div>
          {Object.entries(s.log_channels || {}).map(([k, v]) => (
            <div key={k}><div className="text-[var(--text-2)]">Log: {k}</div><div className="mt-1">{v || "—"}</div></div>
          ))}
        </div>
      </div>

      <div className="surface p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">Roblox</div>
        <label className="text-sm text-[var(--text-2)]">Group ID</label>
        <input
          value={s.roblox_group_id || ""}
          onChange={e => setS({ ...s, roblox_group_id: e.target.value })}
          className="mt-1 block w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
          data-testid="settings-roblox-group"
        />
        <button onClick={save} className="btn-discord mt-4 rounded-md px-4 py-2 text-sm" data-testid="settings-save">Save</button>
      </div>

      <div className="surface p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">Dashboard Permissions</div>
        <div className="space-y-5">
          {users.map(u => (
            <div key={u.id} className="border-t border-[var(--border)] pt-4">
              <div className="text-sm">{u.username} <span className="text-[var(--text-2)]">· {u.roles?.join(", ")}</span></div>
              <div className="mt-3 flex flex-wrap gap-2">
                {perms.map(p => {
                  const on = u.permissions?.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePerm(u, p)}
                      data-testid={`perm-${u.id}-${p}`}
                      className={`text-[11px] uppercase tracking-[0.18em] rounded-full border px-3 py-1 transition-colors ${
                        on ? "bg-nx-gold/15 border-nx-gold/40 text-nx-gold"
                           : "border-white/10 text-[var(--text-2)] hover:bg-white/5"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
