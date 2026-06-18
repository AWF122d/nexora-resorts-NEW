import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Search, ArrowUp, ArrowDown, RefreshCw, Loader2 } from "lucide-react";

export default function Ranking() {
  const [q, setQ] = useState("");
  const [target, setTarget] = useState(null);
  const [roles, setRoles] = useState([]);
  const [pick, setPick] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/roblox/group/roles").then(({ data }) => {
      const sorted = (data.roles || []).slice().sort((a, b) => a.rank - b.rank);
      setRoles(sorted);
    }).catch(() => {});
  }, []);

  const search = async (e) => {
    e?.preventDefault?.();
    if (!q.trim()) return;
    setLoading(true); setTarget(null);
    try {
      const { data } = await api.get("/roblox/user", { params: { username: q.trim() } });
      setTarget(data);
      if (data.group_role) {
        const next = roles.find(r => r.rank === data.group_role.rank);
        if (next) setPick(String(next.id));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Not found");
    } finally { setLoading(false); }
  };

  const setRank = async () => {
    if (!target || !pick) return;
    setBusy(true);
    try {
      await api.post("/ranking/set", {
        username: target.user.name,
        roblox_user_id: target.user.id,
        role_id: Number(pick),
      });
      toast.success(`Rank updated for ${target.user.name}`);
      search();
    } catch (e) { toast.error(e.response?.data?.detail || "Rank update failed"); }
    finally { setBusy(false); }
  };

  const normalize = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const { data } = await api.post("/ranking/normalize", { username: target.user.name });
      if (data.skipped) toast(`${target.user.name} is already in the group.`);
      else toast.success(`${target.user.name} demoted to ${data.set_to.name}`);
      search();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const current = target?.group_role;
  const currentRank = current?.rank || 0;
  const selected = roles.find(r => String(r.id) === String(pick));
  const direction = selected ? (selected.rank > currentRank ? "promote" : selected.rank < currentRank ? "demote" : "set") : null;

  return (
    <div data-testid="ranking-page" className="space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Roblox Group</div>
        <h1 className="font-serif text-4xl mt-2">Ranking</h1>
        <p className="text-[var(--text-2)] mt-2 max-w-2xl">Search any Roblox user, pick a rank from the group, and apply the change. Users who left the group can be normalised back to rank 241 — Recreation Staff.</p>
      </div>

      <form onSubmit={search} className="surface p-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-[var(--text-2)] ml-1" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Roblox username"
          data-testid="rank-search-input"
          className="flex-1 bg-transparent outline-none text-sm" />
        <button type="submit" className="btn-discord rounded-md px-4 py-2 text-sm" data-testid="rank-search-btn">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
        <button type="button" onClick={async () => {
            try { const r = await api.post("/ranking/sweep"); toast.success(`Swept: ${r.data.changed.length} demoted, ${r.data.skipped} skipped`); }
            catch (e) { toast.error(e.response?.data?.detail || "Sweep failed"); }
          }} className="rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5 inline-flex items-center gap-1" data-testid="rank-sweep">
          <RefreshCw className="h-3.5 w-3.5" /> Sweep group
        </button>
      </form>

      {target && (
        <div className="surface p-6 grid sm:grid-cols-[120px,1fr] gap-6 items-start">
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-nx-gold/10">
              {target.user?.avatar ? <img src={target.user.avatar} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="text-sm">{target.user?.display_name || target.user?.name}</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)]">@{target.user?.name}</div>
          </div>
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)]">Roblox ID</div><div className="mt-1">{target.user?.id}</div></div>
              <div><div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)]">Current rank</div>
                <div className="mt-1">{current?.name || "Not in group"}{current?.rank ? <span className="text-[var(--text-2)]"> · {current.rank}</span> : null}</div>
              </div>
            </div>

            <div className="grid sm:grid-cols-[1fr,auto] gap-3 items-end">
              <div>
                <label className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)]">Set rank</label>
                <select value={pick} onChange={(e) => setPick(e.target.value)} data-testid="rank-select"
                  className="mt-1 w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm">
                  <option value="">— Choose a rank —</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.rank} · {r.name}</option>)}
                </select>
              </div>
              <button onClick={setRank} disabled={!pick || busy} data-testid="rank-apply"
                className="btn-discord rounded-md px-4 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-60">
                {direction === "promote" ? <ArrowUp className="h-4 w-4" /> :
                 direction === "demote" ? <ArrowDown className="h-4 w-4" /> : null}
                {direction === "promote" ? "Promote" : direction === "demote" ? "Demote" : "Apply"}
              </button>
            </div>

            {!current?.rank && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-200 text-xs p-3 flex items-start gap-3">
                <RefreshCw className="h-3.5 w-3.5 mt-0.5" />
                <div className="flex-1">
                  This user isn't currently in the group. Demote to rank 241 / Recreation Staff to bring them back into compliance.
                  <button onClick={normalize} disabled={busy} className="ml-2 underline hover:no-underline" data-testid="rank-normalize">
                    Normalise now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
