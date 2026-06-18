import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

function Section({ title, children }) {
  return (
    <div className="surface p-6">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">{title}</div>
      {children}
    </div>
  );
}

export default function RoleLinks() {
  const [dashRoles, setDashRoles] = useState([]);
  const [links, setLinks] = useState([]);
  const [perms, setPerms] = useState([]);
  const [newRole, setNewRole] = useState({ name: "", color: "#D4AF37" });
  const [newLink, setNewLink] = useState({ roblox_rank: "", roblox_rank_name: "", discord_role_id: "", dash_role_id: "", authority: false });

  const load = async () => {
    const [a, b, c] = await Promise.all([api.get("/catalog/dash-roles"), api.get("/catalog/role-links"), api.get("/permissions")]);
    setDashRoles(a.data.items || []); setLinks(b.data.items || []); setPerms(c.data.permissions || []);
  };
  useEffect(() => { load(); }, []);

  const addRole = async () => {
    if (!newRole.name) return;
    await api.post("/catalog/dash-roles", { ...newRole, permissions: [] });
    setNewRole({ name: "", color: "#D4AF37" }); load(); toast.success("Dashboard role added");
  };
  const togglePerm = async (role, perm) => {
    const next = role.permissions?.includes(perm) ? role.permissions.filter(p => p !== perm) : [...(role.permissions || []), perm];
    await api.put(`/catalog/dash-roles/${role.id}`, { name: role.name, color: role.color, permissions: next });
    setDashRoles(dashRoles.map(r => r.id === role.id ? { ...r, permissions: next } : r));
  };
  const delRole = async (id) => { await api.delete(`/catalog/dash-roles/${id}`); load(); };

  const addLink = async () => {
    const body = {
      roblox_rank: newLink.roblox_rank ? Number(newLink.roblox_rank) : null,
      roblox_rank_name: newLink.roblox_rank_name || null,
      discord_role_id: newLink.discord_role_id || null,
      dash_role_id: newLink.dash_role_id || null,
      authority: !!newLink.authority,
    };
    await api.post("/catalog/role-links", body);
    setNewLink({ roblox_rank: "", roblox_rank_name: "", discord_role_id: "", dash_role_id: "", authority: false });
    load(); toast.success("Mapping saved");
  };
  const delLink = async (id) => { await api.delete(`/catalog/role-links/${id}`); load(); };

  return (
    <div data-testid="rolelinks-page" className="space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Owner</div>
        <h1 className="font-serif text-4xl mt-2">Roles & Authority Linking</h1>
        <p className="text-[var(--text-2)] mt-2 max-w-2xl">Create real dashboard roles, attach the permissions they grant, and map them to Roblox group ranks + Discord roles. Authority slots are overlay roles your game can query.</p>
      </div>

      <Section title="Dashboard roles">
        <div className="space-y-5">
          {dashRoles.map((r) => (
            <div key={r.id} className="border-t border-[var(--border)] pt-4" data-testid={`dash-role-${r.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color || "#D4AF37" }} />
                  <div className="text-sm">{r.name}</div>
                </div>
                <button onClick={() => delRole(r.id)} className="rounded-md border border-white/10 p-1.5 hover:bg-white/5"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {perms.map(p => {
                  const on = r.permissions?.includes(p);
                  return (
                    <button key={p} onClick={() => togglePerm(r, p)}
                      className={`text-[11px] uppercase tracking-[0.18em] rounded-full border px-3 py-1 transition-colors ${on ? "bg-nx-gold/15 border-nx-gold/40 text-nx-gold" : "border-white/10 text-[var(--text-2)] hover:bg-white/5"}`}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="border-t border-[var(--border)] pt-4 flex items-center gap-2">
            <input value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder="New role name" data-testid="new-dash-role-name"
              className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
            <input type="color" value={newRole.color} onChange={(e) => setNewRole({ ...newRole, color: e.target.value })} className="h-9 w-12 rounded-md bg-[var(--surface-2)] border border-[var(--border)]" />
            <button onClick={addRole} data-testid="new-dash-role-add" className="btn-discord rounded-md px-3 py-1.5"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </Section>

      <Section title="Roblox rank ↔ Discord role ↔ Dashboard role">
        <div className="space-y-2">
          {links.map((l) => (
            <div key={l.id} className="grid grid-cols-12 gap-2 items-center text-sm" data-testid={`role-link-${l.id}`}>
              <div className="col-span-1 text-xs text-[var(--text-2)]">#{l.roblox_rank ?? "—"}</div>
              <div className="col-span-3 truncate">{l.roblox_rank_name || "—"}</div>
              <div className="col-span-3 font-mono text-xs truncate">{l.discord_role_id || "—"}</div>
              <div className="col-span-3 truncate">{dashRoles.find(r => r.id === l.dash_role_id)?.name || "—"}</div>
              <div className="col-span-1 text-xs text-nx-gold">{l.authority ? "AUTH" : ""}</div>
              <button onClick={() => delLink(l.id)} className="col-span-1 rounded-md border border-white/10 p-1.5 hover:bg-white/5"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <div className="grid grid-cols-12 gap-2 items-center pt-3 border-t border-[var(--border)]">
            <input value={newLink.roblox_rank} onChange={(e) => setNewLink({ ...newLink, roblox_rank: e.target.value })} placeholder="Rank #" className="col-span-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
            <input value={newLink.roblox_rank_name} onChange={(e) => setNewLink({ ...newLink, roblox_rank_name: e.target.value })} placeholder="Roblox rank name" className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
            <input value={newLink.discord_role_id} onChange={(e) => setNewLink({ ...newLink, discord_role_id: e.target.value })} placeholder="Discord role ID" className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
            <select value={newLink.dash_role_id} onChange={(e) => setNewLink({ ...newLink, dash_role_id: e.target.value })} className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm">
              <option value="">— Dashboard role —</option>
              {dashRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <label className="col-span-1 text-xs inline-flex items-center gap-1.5"><input type="checkbox" checked={newLink.authority} onChange={(e) => setNewLink({ ...newLink, authority: e.target.checked })} /> Auth</label>
            <button onClick={addLink} data-testid="role-link-add" className="col-span-1 btn-discord rounded-md py-1.5"><Plus className="h-4 w-4 mx-auto" /></button>
          </div>
        </div>
      </Section>
    </div>
  );
}
