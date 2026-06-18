import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

function SessionTypeEditor() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState({ name: "", required_attendees: 5, phases: "Briefing, Drills, Debrief" });
  const load = async () => setItems((await api.get("/catalog/session-types")).data.items || []);
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!draft.name) return;
    await api.post("/catalog/session-types", { name: draft.name, required_attendees: Number(draft.required_attendees) || 1, phases: draft.phases.split(",").map(s => s.trim()).filter(Boolean) });
    toast.success("Session type added"); setDraft({ name: "", required_attendees: 5, phases: "Briefing, Drills, Debrief" }); load();
  };
  const remove = async (id) => { await api.delete(`/catalog/session-types/${id}`); load(); };
  const update = async (i, patch) => {
    const next = { ...items[i], ...patch }; setItems(items.map((x, idx) => idx === i ? next : x));
    await api.put(`/catalog/session-types/${next.id}`, { name: next.name, required_attendees: Number(next.required_attendees) || 1, phases: Array.isArray(next.phases) ? next.phases : String(next.phases).split(",").map(s => s.trim()).filter(Boolean) });
  };
  return (
    <div className="surface p-6">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">Session types</div>
      <div className="space-y-3">
        {items.map((s, i) => (
          <div key={s.id} className="grid grid-cols-12 gap-2 items-center" data-testid={`session-type-row-${s.id}`}>
            <input value={s.name} onChange={(e) => update(i, { name: e.target.value })} className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
            <input type="number" min="1" value={s.required_attendees} onChange={(e) => update(i, { required_attendees: e.target.value })} className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
            <input value={Array.isArray(s.phases) ? s.phases.join(", ") : s.phases} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, phases: e.target.value.split(",").map(p => p.trim()).filter(Boolean) } : x))} onBlur={(e) => update(i, { phases: e.target.value.split(",").map(p => p.trim()).filter(Boolean) })} className="col-span-6 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
            <button onClick={() => remove(s.id)} className="col-span-1 rounded-md border border-white/10 px-2 py-1.5 hover:bg-white/5"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <div className="grid grid-cols-12 gap-2 items-center pt-3 border-t border-[var(--border)]">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" data-testid="new-session-type-name" className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
          <input type="number" min="1" value={draft.required_attendees} onChange={(e) => setDraft({ ...draft, required_attendees: e.target.value })} placeholder="Req attendees" className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
          <input value={draft.phases} onChange={(e) => setDraft({ ...draft, phases: e.target.value })} placeholder="Phases (comma separated)" className="col-span-6 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
          <button onClick={create} className="col-span-1 btn-discord rounded-md py-1.5" data-testid="new-session-type-add"><Plus className="h-4 w-4 mx-auto" /></button>
        </div>
      </div>
    </div>
  );
}

function RoomTypeEditor() {
  const [items, setItems] = useState([]);
  const [d, setD] = useState({ name: "", description: "", image: "", checkmein_link: "", gamepass_id: "" });
  const load = async () => setItems((await api.get("/catalog/room-types")).data.items || []);
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!d.name) return;
    await api.post("/catalog/room-types", d);
    toast.success("Room type added"); setD({ name: "", description: "", image: "", checkmein_link: "", gamepass_id: "" }); load();
  };
  const remove = async (id) => { await api.delete(`/catalog/room-types/${id}`); load(); };
  return (
    <div className="surface p-6">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">Room types (CheckMeIn)</div>
      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="grid grid-cols-12 gap-2 items-center" data-testid={`room-type-row-${r.id}`}>
            <div className="col-span-3 text-sm">{r.name}</div>
            <div className="col-span-3 text-xs text-[var(--text-2)] truncate">{r.description}</div>
            <a href={r.checkmein_link || "#"} target="_blank" rel="noreferrer" className="col-span-3 text-xs text-nx-gold truncate hover:underline">{r.checkmein_link || "—"}</a>
            <div className="col-span-2 text-xs text-[var(--text-2)] truncate">GP: {r.gamepass_id || "—"}</div>
            <button onClick={() => remove(r.id)} className="col-span-1 rounded-md border border-white/10 px-2 py-1.5 hover:bg-white/5"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <div className="grid grid-cols-12 gap-2 items-center pt-3 border-t border-[var(--border)]">
          <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Name" data-testid="new-room-type-name" className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
          <input value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder="Description" className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
          <input value={d.checkmein_link} onChange={(e) => setD({ ...d, checkmein_link: e.target.value })} placeholder="CheckMeIn link or ID" className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
          <input value={d.gamepass_id} onChange={(e) => setD({ ...d, gamepass_id: e.target.value })} placeholder="Gamepass ID" className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
          <button onClick={add} className="col-span-1 btn-discord rounded-md py-1.5" data-testid="new-room-type-add"><Plus className="h-4 w-4 mx-auto" /></button>
        </div>
        <input value={d.image} onChange={(e) => setD({ ...d, image: e.target.value })} placeholder="Image URL (optional)" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm" />
      </div>
    </div>
  );
}

export default function Settings() {
  const [s, setS] = useState(null);
  const [users, setUsers] = useState([]);
  const [perms, setPerms] = useState([]);
  const [ingest, setIngest] = useState(null);
  useEffect(() => {
    Promise.all([api.get("/settings"), api.get("/users"), api.get("/permissions"), api.get("/ingest/info").catch(() => null)])
      .then(([a, b, c, d]) => { setS(a.data.settings); setUsers(b.data.users || []); setPerms(c.data.permissions || []); setIngest(d?.data); });
  }, []);
  const save = async () => { await api.put("/settings", { roblox_group_id: s.roblox_group_id || null }); toast.success("Settings saved"); };
  const togglePerm = async (u, perm) => {
    const has = u.permissions?.includes(perm);
    const next = has ? u.permissions.filter((p) => p !== perm) : [...(u.permissions || []), perm];
    await api.put(`/users/${u.id}/permissions`, { permissions: next });
    setUsers(users.map((x) => x.id === u.id ? { ...x, permissions: next } : x));
  };
  if (!s) return <div className="text-[var(--text-2)]">Loading…</div>;

  return (
    <div data-testid="settings-page" className="space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Configuration</div>
        <h1 className="font-serif text-4xl mt-2">Owner Settings</h1>
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
        <input value={s.roblox_group_id || ""} onChange={(e) => setS({ ...s, roblox_group_id: e.target.value })}
          className="mt-1 block w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm" data-testid="settings-roblox-group" />
        <button onClick={save} className="btn-discord mt-4 rounded-md px-4 py-2 text-sm inline-flex items-center gap-2" data-testid="settings-save"><Save className="h-4 w-4" /> Save</button>
      </div>

      <SessionTypeEditor />
      <RoomTypeEditor />

      {ingest && (
        <div className="surface p-6">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">Game ingest</div>
          <p className="text-sm text-[var(--text-2)] mb-3">POST chat & admin logs from your Roblox game to feed Player Search. Keep the secret out of public scripts.</p>
          <div className="text-xs space-y-1 font-mono break-all">
            <div><span className="text-[var(--text-2)]">SECRET:</span> {ingest.ingest_secret}</div>
            {ingest.endpoints.map((e) => <div key={e}><span className="text-[var(--text-2)]">POST</span> {e}</div>)}
          </div>
        </div>
      )}

      <div className="surface p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">Dashboard permissions</div>
        <div className="space-y-5">
          {users.map((u) => (
            <div key={u.id} className="border-t border-[var(--border)] pt-4">
              <div className="text-sm">{u.roblox_username || u.username} <span className="text-[var(--text-2)]">· {u.roles?.join(", ")}</span></div>
              <div className="mt-3 flex flex-wrap gap-2">
                {perms.map((p) => {
                  const on = u.permissions?.includes(p);
                  return (
                    <button key={p} onClick={() => togglePerm(u, p)} data-testid={`perm-${u.id}-${p}`}
                      className={`text-[11px] uppercase tracking-[0.18em] rounded-full border px-3 py-1 transition-colors ${
                        on ? "bg-nx-gold/15 border-nx-gold/40 text-nx-gold" : "border-white/10 text-[var(--text-2)] hover:bg-white/5"
                      }`}>{p}</button>
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
