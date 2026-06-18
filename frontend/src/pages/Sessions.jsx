import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Check, StopCircle, Forward } from "lucide-react";

export default function Sessions() {
  const { user, hasPerm } = useAuth();
  const [types, setTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [typeId, setTypeId] = useState("");

  const load = async () => {
    const [t, s] = await Promise.all([
      api.get("/catalog/session-types"),
      api.get("/collections/sessions"),
    ]);
    setTypes(t.data.items || []);
    setItems(s.data.items || []);
    if (!typeId && t.data.items?.[0]) setTypeId(t.data.items[0].id);
  };
  useEffect(() => { load(); }, []);

  const start = async () => {
    const type = types.find((t) => t.id === typeId);
    if (!type) return;
    try {
      await api.post("/collections/sessions", {
        session_type: type.name,
        type_id: type.id,
        required_attendees: type.required_attendees,
        phases: type.phases,
        phase_progress: 0,
        status: "running",
        host: user?.roblox_username || user?.username,
        host_roblox_user_id: user?.roblox_user_id,
        attendees: [], co_hosts: [], supervisors: [], support_staff: [],
      });
      toast.success(`${type.name} started — embed posted to Discord`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to start"); }
  };

  const advance = async (s) => {
    try {
      const { data } = await api.post(`/sessions/${s.id}/advance`);
      toast.success(`Advanced to phase ${data.current_phase}/${data.total_phases}`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const end = async (s) => {
    try {
      await api.post(`/sessions/${s.id}/end`);
      toast("Session ended — embed removed from Discord");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const canSeeActive = hasPerm("sessions.view_active") || hasPerm("sessions.manage") || hasPerm("sessions.create");
  const canSeeLogs = hasPerm("sessions.view_logs") || hasPerm("sessions.manage");
  const active = items.filter((i) => i.status !== "ended");
  const logs = items.filter((i) => i.status === "ended");

  return (
    <div data-testid="sessions-page">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Operations</div>
      <h1 className="font-serif text-4xl mt-2">Sessions</h1>
      <p className="text-[var(--text-2)] mt-2 max-w-2xl">Pick a session type and start. You must be currently in your Roblox game (the in-game script registers your server) — otherwise the start button will refuse.</p>

      {hasPerm("sessions.create") && (
        <div className="surface mt-6 p-5 flex flex-wrap items-center gap-3">
          <label className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)]">Session type</label>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)} data-testid="session-type-select"
            className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm min-w-[260px]">
            {types.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.required_attendees} req · {t.phases.length} phases</option>)}
          </select>
          <button onClick={start} className="btn-discord rounded-md px-4 py-2 text-sm inline-flex items-center gap-2" data-testid="session-start">
            <Plus className="h-4 w-4" /> Start session
          </button>
        </div>
      )}

      {canSeeActive && (
        <div className="mt-8">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)] mb-3">Live</div>
          <div className="grid md:grid-cols-2 gap-4">
            {active.length === 0 && <div className="surface p-6 text-sm text-[var(--text-2)]">No active sessions.</div>}
            {active.map((s) => (
              <div key={s.id} className="surface p-5" data-testid={`session-card-${s.id}`}>
                <div className="flex items-center justify-between">
                  <div className="font-serif text-xl">Starting {s.session_type}</div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-nx-gold">{s.status}</div>
                </div>
                <div className="text-xs text-[var(--text-2)] mt-1">Hosted by {s.host} · {new Date(s.created_at).toLocaleString()}</div>
                {s.join_link && <a href={s.join_link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-nx-gold hover:underline">Join the server →</a>}
                <ol className="mt-4 space-y-1.5">
                  {(s.phases || []).map((p, i) => {
                    const done = i < (s.phase_progress || 0);
                    const cur = i === (s.phase_progress || 0);
                    return (
                      <li key={i} className={`flex items-center gap-2 text-sm ${cur ? "" : ""}`}>
                        <span className={`h-5 w-5 grid place-items-center rounded-full border ${done ? "bg-nx-gold/20 border-nx-gold/40 text-nx-gold" : cur ? "border-blue-400/60 text-blue-300" : "border-white/10 text-[var(--text-2)]"}`}>
                          {done ? <Check className="h-3 w-3" /> : i + 1}
                        </span>
                        <span className={done ? "line-through text-[var(--text-2)]" : cur ? "font-medium" : ""}>{p}</span>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => advance(s)} className="btn-discord rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1" data-testid={`session-advance-${s.id}`}>
                    <Forward className="h-3.5 w-3.5" /> Advance
                  </button>
                  <button onClick={() => end(s)} className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5 inline-flex items-center gap-1" data-testid={`session-end-${s.id}`}>
                    <StopCircle className="h-3.5 w-3.5" /> End session
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canSeeLogs && (
        <div className="mt-10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)] mb-3">Session logs</div>
          <div className="surface divide-y divide-[var(--border)]">
            {logs.length === 0 && <div className="p-5 text-sm text-[var(--text-2)]">No completed sessions yet.</div>}
            {logs.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm">{s.session_type} · <span className="text-[var(--text-2)]">{(s.phases || []).length} phases</span></div>
                  <div className="text-xs text-[var(--text-2)]">Host {s.host} · ended {new Date(s.ended_at || s.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
