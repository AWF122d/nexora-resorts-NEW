import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

const COLOR = {
  booking: "text-nx-gold",
  punishment: "text-red-400",
  event: "text-blue-300",
  session: "text-emerald-300",
  authority: "text-purple-300",
};

export default function ActivityPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/activity").then(({ data }) => setItems(data.items || [])); }, []);

  return (
    <div data-testid="activity-page">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Live Feed</div>
      <h1 className="font-serif text-4xl mt-2">Activity</h1>
      <p className="text-[var(--text-2)] mt-2 max-w-2xl">Recent operations across bookings, sessions, events, punishments, and authorities — managed entirely through the API.</p>
      <div className="surface mt-6 divide-y divide-[var(--border)]">
        {items.length === 0 && <div className="p-6 text-sm text-[var(--text-2)]">Nothing yet.</div>}
        {items.map((i, idx) => (
          <div key={`${i.id}-${idx}`} className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className={`text-[10px] uppercase tracking-[0.22em] ${COLOR[i.kind] || "text-[var(--text-2)]"}`}>{i.kind}</div>
              <div className="text-sm mt-1 truncate">
                {i.kind === "booking" && `${i.user_username} · ${i.room_name} · Room #${i.room_number}`}
                {i.kind === "punishment" && `${i.type} → ${i.target} — ${i.reason}`}
                {i.kind === "event" && (i.title || "Event")}
                {i.kind === "session" && `${i.session_type || "Session"} by ${i.host || "—"}`}
                {i.kind === "authority" && `${i.rank} → ${i.roblox_username}`}
              </div>
              <div className="text-xs text-[var(--text-2)]">{new Date(i.created_at).toLocaleString()}{i.created_by ? ` · by ${i.created_by}` : ""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
