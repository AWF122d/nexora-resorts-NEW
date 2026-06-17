import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";

const TYPES = ["Staff Warning", "Verbal Warning", "Mute", "Blacklist", "Termination", "Game Ban", "Machine Ban", "Note"];

export default function PlayerSearch() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [type, setType] = useState(TYPES[0]);
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");

  const load = async () => {
    const { data } = await api.get("/collections/punishments");
    setItems(data.items || []);
  };
  useEffect(() => { load(); }, []);

  const issue = async () => {
    if (!target || !reason) { toast.error("Target and reason are required."); return; }
    try {
      await api.post("/collections/punishments", { target, type, reason, status: "active" });
      toast.success(`${type} issued to ${target}`);
      setReason(""); setTarget("");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const revert = async (id) => {
    try { await api.delete(`/collections/punishments/${id}`); toast("Reverted"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const filtered = items.filter(i => !q || (i.target || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div data-testid="player-search-page">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Operations</div>
      <h1 className="font-serif text-4xl mt-2">Player Search</h1>

      <div className="surface mt-6 p-5">
        <div className="flex items-center gap-2 border border-[var(--border)] rounded-md px-3 py-2">
          <Search className="h-4 w-4 text-[var(--text-2)]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by Roblox username…"
            className="flex-1 bg-transparent outline-none text-sm" data-testid="player-search-input" />
        </div>

        <div className="mt-5 grid md:grid-cols-4 gap-3">
          <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Roblox username"
            className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm" data-testid="punish-target" />
          <select value={type} onChange={e => setType(e.target.value)} data-testid="punish-type"
            className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm">
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason"
            className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm" data-testid="punish-reason" />
          <button onClick={issue} className="btn-discord rounded-md px-4 py-2 text-sm inline-flex items-center justify-center gap-2" data-testid="punish-issue">
            <Plus className="h-4 w-4" /> Issue
          </button>
        </div>
      </div>

      <div className="surface mt-6 divide-y divide-[var(--border)]">
        {filtered.length === 0 && <div className="p-6 text-sm text-[var(--text-2)]">No records.</div>}
        {filtered.map(r => (
          <div key={r.id} className="p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm">{r.target} · <span className="text-nx-gold">{r.type}</span></div>
              <div className="text-xs text-[var(--text-2)] truncate">{r.reason} — issued by {r.created_by} on {new Date(r.created_at).toLocaleString()}</div>
            </div>
            <button onClick={() => revert(r.id)} className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5" data-testid={`revert-${r.id}`}>
              Revert
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
