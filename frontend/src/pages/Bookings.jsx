import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, X } from "lucide-react";

export default function Bookings() {
  const { user, hasPerm } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    const [r, b] = await Promise.all([api.get("/rooms"), api.get("/bookings")]);
    setRooms(r.data.rooms); setBookings(b.data.bookings);
  };
  useEffect(() => { load(); }, []);

  const book = async (room) => {
    setBusy(room.id);
    try {
      const { data } = await api.post("/bookings", { room_id: room.id });
      toast.success(`Booking confirmed — Room ${data.room_number}`, { description: `${data.room_name} for ${user.username}` });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Booking failed"); }
    finally { setBusy(null); }
  };

  const cancel = async (id) => {
    try { await api.post(`/bookings/${id}/cancel`); toast("Booking cancelled"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Cancel failed"); }
  };

  return (
    <div data-testid="bookings-page">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Reservations</div>
      <h1 className="font-serif text-4xl tracking-tight mt-2">Choose your stay.</h1>
      <p className="text-[var(--text-2)] mt-2">Bookings are confirmed instantly. The Nexora bot will message you in Discord.</p>

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        {rooms.map((r) => (
          <div key={r.id} className="surface overflow-hidden group flex flex-col">
            <div className="aspect-[4/3] overflow-hidden">
              <img src={r.image} alt={r.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="font-serif text-xl">{r.name}</div>
              <p className="text-sm text-[var(--text-2)] mt-1 flex-1">{r.description}</p>
              <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-2)] mt-3">
                Gamepass: <span className="text-nx-gold">verified</span>
              </div>
              <button
                onClick={() => book(r)}
                disabled={busy === r.id}
                data-testid={`book-room-${r.name.replace(/\s+/g, "-").toLowerCase()}`}
                className="mt-4 btn-discord rounded-md px-4 py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2"
              >
                {busy === r.id ? "Booking…" : "Book Now"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">
          {hasPerm("bookings.manage") ? "All bookings" : "Your bookings"}
        </div>
        <div className="surface divide-y divide-[var(--border)]">
          {bookings.length === 0 && <div className="p-6 text-sm text-[var(--text-2)]">No bookings yet.</div>}
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-5 gap-4" data-testid={`booking-row-${b.id}`}>
              <div className="min-w-0">
                <div className="text-sm">{b.room_name} · <span className="text-nx-gold">Room #{b.room_number}</span></div>
                <div className="text-xs text-[var(--text-2)] truncate">
                  {b.user_username} · {new Date(b.created_at).toLocaleString()} · {b.status}
                </div>
              </div>
              {b.status !== "cancelled" && (
                <button
                  onClick={() => cancel(b.id)}
                  data-testid={`cancel-booking-${b.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
