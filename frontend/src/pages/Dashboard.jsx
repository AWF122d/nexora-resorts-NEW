import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { BedDouble, MessagesSquare, Activity, CalendarDays } from "lucide-react";

const Stat = ({ icon: I, label, value }) => (
  <div className="surface p-6">
    <div className="flex items-center justify-between">
      <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-2)]">{label}</div>
      <I className="h-4 w-4 text-nx-gold" />
    </div>
    <div className="mt-3 font-serif text-4xl">{value}</div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ bookings: 0, events: 0, sessions: 0, forum: 0 });
  const [health, setHealth] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [b, e, s, f, h] = await Promise.all([
          api.get("/bookings"), api.get("/collections/events"),
          api.get("/collections/sessions"), api.get("/collections/forum_threads"),
          api.get("/health"),
        ]);
        setStats({
          bookings: b.data.bookings?.length || 0,
          events: e.data.items?.length || 0,
          sessions: s.data.items?.length || 0,
          forum: f.data.items?.length || 0,
        });
        setHealth(h.data);
      } catch {}
    })();
  }, []);

  return (
    <div data-testid="dashboard-page">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Overview</div>
      <h1 className="font-serif text-4xl tracking-tight mt-2">Good to see you, {user?.username?.split(" ")[0]}.</h1>
      <p className="text-[var(--text-2)] mt-2">Everything you need to run today's operations.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
        <Stat icon={BedDouble} label="Bookings" value={stats.bookings} />
        <Stat icon={CalendarDays} label="Events" value={stats.events} />
        <Stat icon={Activity} label="Sessions" value={stats.sessions} />
        <Stat icon={MessagesSquare} label="Forum threads" value={stats.forum} />
      </div>

      <div className="surface mt-8 p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">System</div>
        <div className="mt-3 grid sm:grid-cols-3 gap-4 text-sm">
          <div><div className="text-[var(--text-2)]">Bot</div><div>{health?.bot || "—"}</div></div>
          <div><div className="text-[var(--text-2)]">OAuth</div><div>{health?.oauth || "—"}</div></div>
          <div><div className="text-[var(--text-2)]">Guild</div><div className="truncate">{health?.guild || "—"}</div></div>
        </div>
      </div>
    </div>
  );
}
