import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Ranking() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get("/users").then(({ data }) => setUsers(data.users || [])).catch(() => {}); }, []);

  const promote = (u) => toast.success(`${u.username} promoted (mocked Roblox call)`);

  return (
    <div data-testid="ranking-page">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Roblox Group</div>
      <h1 className="font-serif text-4xl mt-2">Ranking</h1>
      <p className="text-[var(--text-2)] mt-2">Promote eligible users by one rank. Roblox Open Cloud call is mocked until a group API key is provided in Settings.</p>
      <div className="surface mt-6 divide-y divide-[var(--border)]">
        {users.map(u => (
          <div key={u.id} className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm">{u.username}</div>
              <div className="text-xs text-[var(--text-2)]">{u.discord_id} · {u.roles?.join(", ")}</div>
            </div>
            <button onClick={() => promote(u)} className="btn-discord rounded-md px-3 py-1.5 text-xs" data-testid={`promote-${u.id}`}>
              Promote
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
