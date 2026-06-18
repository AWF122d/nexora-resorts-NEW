import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Check, ExternalLink, StopCircle, Forward } from "lucide-react";

export default function SessionDetail() {
  const { id } = useParams();
  const [s, setS] = useState(null);

  const load = async () => {
    try { const { data } = await api.get(`/sessions/${id}`); setS(data.session); }
    catch (e) { toast.error(e.response?.data?.detail || "Not found"); }
  };
  useEffect(() => { load(); }, [id]);

  const advance = async () => { try { await api.post(`/sessions/${id}/advance`); load(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const end     = async () => { try { await api.post(`/sessions/${id}/end`);     load(); toast("Session ended"); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };

  if (!s) return <div className="text-[var(--text-2)]">Loading…</div>;

  return (
    <div data-testid="session-detail-page" className="space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/sessions" className="text-xs uppercase tracking-[0.22em] text-[var(--text-2)] hover:text-white inline-flex items-center gap-2"><ArrowLeft className="h-3.5 w-3.5" /> Back to sessions</Link>
        <div className="text-[10px] uppercase tracking-[0.22em] text-nx-gold">{s.status}</div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Session</div>
        <h1 className="font-serif text-4xl mt-2">Starting {s.session_type}</h1>
        <p className="text-[var(--text-2)] mt-2">Hosted by <span className="text-white">{s.host}</span> · {new Date(s.created_at).toLocaleString()}</p>
        {s.join_link && (
          <a href={s.join_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-nx-gold hover:underline">
            Join the server <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <div className="surface p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)]">High Command</div>
          <div className="mt-3 text-sm space-y-2">
            <div><div className="text-[var(--text-2)] text-[10px] uppercase tracking-[0.2em]">Host</div><div>{s.host || "—"}</div></div>
            {(s.supervisors || []).map((n, i) => (
              <div key={i}><div className="text-[var(--text-2)] text-[10px] uppercase tracking-[0.2em]">Supervisor</div><div>{n}</div></div>
            ))}
          </div>
        </div>
        <div className="surface p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)]">Co-Hosts</div>
          <div className="mt-3 text-sm space-y-2">
            {(s.co_hosts || []).length === 0 && <div className="text-[var(--text-2)]">—</div>}
            {(s.co_hosts || []).map((n, i) => (
              <div key={i}><div className="text-[var(--text-2)] text-[10px] uppercase tracking-[0.2em]">Co-Host</div><div>{n}</div></div>
            ))}
          </div>
        </div>
        <div className="surface p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)]">Helpers</div>
          <div className="mt-3 text-sm space-y-2">
            {(s.support_staff || []).length === 0 && <div className="text-[var(--text-2)]">—</div>}
            {(s.support_staff || []).map((n, i) => (
              <div key={i}><div className="text-[var(--text-2)] text-[10px] uppercase tracking-[0.2em]">Helper</div><div>{n}</div></div>
            ))}
          </div>
        </div>
      </div>

      <div className="surface p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">Phases</div>
        <ol className="space-y-2">
          {(s.phases || []).map((p, i) => {
            const done = i < (s.phase_progress || 0);
            const cur = i === (s.phase_progress || 0);
            return (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className={`h-6 w-6 grid place-items-center rounded-full border ${done ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : cur ? "border-blue-400/60 text-blue-300" : "border-white/10 text-[var(--text-2)]"}`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={done ? "line-through text-[var(--text-2)]" : cur ? "font-medium" : ""}>{p}</span>
              </li>
            );
          })}
        </ol>
        {s.status !== "ended" && (
          <div className="mt-5 flex gap-2">
            <button onClick={advance} className="btn-discord rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1" data-testid="session-detail-advance"><Forward className="h-3.5 w-3.5" /> Advance phase</button>
            <button onClick={end} className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5 inline-flex items-center gap-1" data-testid="session-detail-end"><StopCircle className="h-3.5 w-3.5" /> End session</button>
          </div>
        )}
      </div>
    </div>
  );
}
