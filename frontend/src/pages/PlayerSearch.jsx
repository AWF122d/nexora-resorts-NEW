import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Search, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TABS = [
  { key: "chat", label: "Chat Logs" },
  { key: "admin", label: "Admin Logs" },
  { key: "sessions", label: "Sessions" },
  { key: "punishments", label: "Punishments" },
];
const P_TYPES = ["Staff Warning", "Verbal Warning", "Mute", "Blacklist", "Termination", "Game Ban", "Machine Ban", "Note"];

export default function PlayerSearch() {
  const { hasPerm } = useAuth();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("chat");
  const [pForm, setPForm] = useState({ type: P_TYPES[0], reason: "" });

  const lookup = async (e) => {
    e?.preventDefault?.();
    if (!q.trim()) return;
    setLoading(true); setData(null);
    try {
      const { data } = await api.get("/players/lookup", { params: { username: q.trim() } });
      setData(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Not found");
    } finally { setLoading(false); }
  };

  const issuePunishment = async () => {
    if (!pForm.reason) return toast.error("Reason required");
    try {
      await api.post("/collections/punishments", {
        target: data.roblox?.name || q,
        type: pForm.type, reason: pForm.reason, status: "active",
      });
      toast.success(`${pForm.type} issued`);
      setPForm({ type: P_TYPES[0], reason: "" });
      lookup();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const Tab = ({ k, label, count }) => (
    <button onClick={() => setTab(k)} data-testid={`tab-${k}`}
      className={`px-4 py-2 text-xs uppercase tracking-[0.22em] rounded-md transition-colors ${
        tab === k ? "bg-white/10 text-white" : "text-[var(--text-2)] hover:text-white hover:bg-white/5"
      }`}>
      {label}{typeof count === "number" ? <span className="ml-1.5 text-nx-gold">{count}</span> : null}
    </button>
  );

  const sessions = data?.sessions || {};
  const counts = {
    chat: data?.chat_logs?.length || 0,
    admin: data?.admin_logs?.length || 0,
    sessions: (sessions.hosted?.length || 0) + (sessions.attended?.length || 0) + (sessions.cohosted?.length || 0) + (sessions.supervised?.length || 0),
    punishments: data?.punishments?.length || 0,
  };

  return (
    <div data-testid="player-search-page">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Operations</div>
      <h1 className="font-serif text-4xl mt-2">Player Search</h1>
      <p className="text-[var(--text-2)] mt-2 max-w-2xl">Look up any Roblox user. Chat logs are stored unfiltered as received from the in-game ingest endpoint.</p>

      <form onSubmit={lookup} className="surface mt-6 p-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-[var(--text-2)] ml-1" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Roblox username (e.g. Builderman)"
          data-testid="player-search-input"
          className="flex-1 bg-transparent outline-none text-sm" />
        <button type="submit" className="btn-discord rounded-md px-4 py-2 text-sm" data-testid="player-search-submit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {data && (
        <div className="mt-8 grid lg:grid-cols-[300px,1fr] gap-6">
          <div className="space-y-4">
            <div className="surface p-5">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-nx-gold/15">
                  {data.roblox?.avatar ? <img src={data.roblox.avatar} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-lg truncate">{data.roblox?.display_name || data.roblox?.name || q}</div>
                  <div className="text-xs text-[var(--text-2)] truncate">@{data.roblox?.name}</div>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-sm">
                <div><div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)]">Roblox ID</div><div>{data.roblox?.id || "—"}</div></div>
                <div><div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)]">Group Rank</div><div>{data.group_role?.name || "—"}{data.group_role?.rank ? ` · ${data.group_role.rank}` : ""}</div></div>
              </div>
            </div>

            {hasPerm("players.warn") && (
              <div className="surface p-5" data-testid="quick-punish-card">
                <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-3">Issue punishment</div>
                <select value={pForm.type} onChange={(e) => setPForm({ ...pForm, type: e.target.value })} data-testid="qp-type"
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm">
                  {P_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <textarea value={pForm.reason} onChange={(e) => setPForm({ ...pForm, reason: e.target.value })} placeholder="Reason" data-testid="qp-reason"
                  className="mt-2 w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm min-h-[70px]" />
                <button onClick={issuePunishment} data-testid="qp-submit" className="btn-discord mt-3 w-full rounded-md py-2 text-sm inline-flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" /> Issue
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-2 mb-5">
              <Tab k="chat" label="Chat" count={counts.chat} />
              <Tab k="admin" label="Admin" count={counts.admin} />
              <Tab k="sessions" label="Sessions" count={counts.sessions} />
              <Tab k="punishments" label="Punishments" count={counts.punishments} />
            </div>

            {tab === "chat" && (
              <div className="surface divide-y divide-[var(--border)]" data-testid="chat-panel">
                {(data.chat_logs || []).length === 0 && <div className="p-5 text-sm text-[var(--text-2)]">No chat logs.</div>}
                {(data.chat_logs || []).map((l) => (
                  <div key={l.id} className="p-4">
                    <div className="text-xs text-[var(--text-2)]">{new Date(l.created_at).toLocaleString()} · server {l.server_id || "—"}</div>
                    <div className="text-sm mt-1">{l.message}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === "admin" && (
              <div className="surface divide-y divide-[var(--border)]" data-testid="admin-panel">
                {(data.admin_logs || []).length === 0 && <div className="p-5 text-sm text-[var(--text-2)]">No admin logs.</div>}
                {(data.admin_logs || []).map((l) => (
                  <div key={l.id} className="p-4">
                    <div className="text-xs text-[var(--text-2)]">{new Date(l.created_at).toLocaleString()}</div>
                    <div className="text-sm mt-1"><span className="text-nx-gold">{l.command}</span> {l.target ? `→ ${l.target}` : ""} {l.args || ""}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === "sessions" && (
              <div className="grid sm:grid-cols-2 gap-4" data-testid="sessions-panel">
                {["hosted", "cohosted", "supervised", "attended"].map((k) => (
                  <div key={k} className="surface p-4">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)]">{k}</div>
                    <div className="font-serif text-3xl mt-1">{(sessions[k] || []).length}</div>
                    <ul className="mt-3 space-y-1 text-sm text-[var(--text-2)]">
                      {(sessions[k] || []).slice(0, 5).map((s) => (
                        <li key={s.id} className="truncate">· {s.session_type || s.title || s.id}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {tab === "punishments" && (
              <div className="surface divide-y divide-[var(--border)]" data-testid="punishments-panel">
                {(data.punishments || []).length === 0 && <div className="p-5 text-sm text-[var(--text-2)]">No punishments.</div>}
                {(data.punishments || []).map((p) => (
                  <div key={p.id} className="p-4">
                    <div className="text-xs text-[var(--text-2)]">{new Date(p.created_at).toLocaleString()} by {p.created_by}</div>
                    <div className="text-sm mt-1"><span className="text-nx-gold">{p.type}</span> — {p.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

