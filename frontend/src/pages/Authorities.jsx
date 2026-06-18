import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Authorities() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ roblox_username: "", discord_id: "", rank: "" });
  const load = async () => setItems((await api.get("/collections/authorities")).data.items || []);
  useEffect(() => { load(); }, []);

  const grant = async () => {
    if (!form.roblox_username || !form.rank) return toast.error("Roblox username and rank are required.");
    try { await api.post("/authorities/grant", form); toast.success(`Authority granted to ${form.roblox_username}`); setForm({ roblox_username: "", discord_id: "", rank: "" }); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  const revoke = async (id) => { await api.post(`/authorities/${id}/revoke`); toast("Revoked"); load(); };

  return (
    <div data-testid="authorities-page">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Operations</div>
      <h1 className="font-serif text-4xl mt-2">Authorities</h1>
      <p className="text-[var(--text-2)] mt-2 max-w-2xl">Grant authority overlays. The website exposes <code>/api/game/authority</code> so your game treats the user as that rank in-game, while keeping their Discord role intact.</p>

      <div className="surface mt-6 p-5 grid md:grid-cols-4 gap-3">
        <input value={form.roblox_username} onChange={(e) => setForm({ ...form, roblox_username: e.target.value })} placeholder="Roblox username" data-testid="auth-roblox-username" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm" />
        <input value={form.discord_id} onChange={(e) => setForm({ ...form, discord_id: e.target.value })} placeholder="Discord user ID (optional)" data-testid="auth-discord-id" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm" />
        <input value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} placeholder="Authority rank" data-testid="auth-rank" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm" />
        <button onClick={grant} className="btn-discord rounded-md px-4 py-2 text-sm" data-testid="auth-grant">Grant authority</button>
      </div>

      <div className="surface mt-6 divide-y divide-[var(--border)]">
        {items.length === 0 && <div className="p-5 text-sm text-[var(--text-2)]">No authorities granted.</div>}
        {items.map((a) => (
          <div key={a.id} className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm">{a.roblox_username} <span className="text-[var(--text-2)]">· {a.rank}</span> {a.active === false ? <span className="text-red-300 text-xs">· revoked</span> : null}</div>
              <div className="text-xs text-[var(--text-2)]">{a.discord_id || "—"} · granted by {a.granted_by || a.created_by} · {new Date(a.created_at).toLocaleString()}</div>
            </div>
            {a.active !== false && (
              <button onClick={() => revoke(a.id)} className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">Revoke</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
