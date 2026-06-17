import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Schedule() {
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    Promise.all([api.get("/collections/events"), api.get("/collections/sessions")])
      .then(([e, s]) => { setEvents(e.data.items || []); setSessions(s.data.items || []); });
  }, []);
  const all = [
    ...events.map(e => ({ ...e, kind: "Event" })),
    ...sessions.map(s => ({ ...s, kind: "Session" })),
  ].sort((a, b) => (a.timestamp || a.created_at).localeCompare(b.timestamp || b.created_at));

  return (
    <div data-testid="schedule-page">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Calendar</div>
      <h1 className="font-serif text-4xl mt-2">Schedule</h1>
      <div className="surface mt-6 divide-y divide-[var(--border)]">
        {all.length === 0 && <div className="p-6 text-sm text-[var(--text-2)]">Nothing scheduled.</div>}
        {all.map(i => (
          <div key={i.id} className="p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-nx-gold">{i.kind}</div>
              <div className="text-sm mt-1">{i.title || i.session_type || "Untitled"}</div>
              <div className="text-xs text-[var(--text-2)]">{i.timestamp || new Date(i.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
