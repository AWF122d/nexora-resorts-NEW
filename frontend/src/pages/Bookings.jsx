import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, ExternalLink, X } from "lucide-react";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1702830499141-a0634d87d6af?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function Bookings() {
  const { user, hasPerm } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    const [rt, legacy, b] = await Promise.all([
      api.get("/catalog/room-types"),
      api.get("/rooms"),
      api.get("/bookings"),
    ]);
    const cat = rt.data.items || [];
    setRooms(cat.length ? cat : (legacy.data.rooms || []));
    setBookings(b.data.bookings || []);
  };
  useEffect(() => { load(); }, []);

  const book = async (room) => {
    setBusy(room.id);
    try {
      // Try to use legacy room id if present, otherwise resolve by name
      let roomId = room.id;
      if (!roomId.match(/-/)) {
        const list = (await api.get("/rooms")).data.rooms;
        roomId = list.find((r) => r.name === room.name)?.id || roomId;
      }
      const { data } = await api.post("/bookings", { room_id: roomId });
      toast.success(`Booking confirmed — Room ${data.room_number}`, { description: `${data.room_name} for ${user.roblox_username || user.username}` });
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
      <p className="text-[var(--text-2)] mt-2 max-w-2xl">Each room links to its CheckMeIn shop entry — confirmations land in Discord.</p>

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        {rooms.length === 0 && (
          <div className="surface p-6 text-sm text-[var(--text-2)] md:col-span-3">No room types yet. Add them in Settings → Room types.</div>
        )}
        {rooms.map((r) => (
          <div key={r.id} className="surface overflow-hidden group flex flex-col">
            <div className="aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">
              <img src={r.image || FALLBACK_IMG} alt={r.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="font-serif text-xl">{r.name}</div>
              <p className="text-sm text-[var(--text-2)] mt-1 flex-1">{r.description}</p>
              <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-2)] mt-3">
                Gamepass: <span className="text-nx-gold">{r.gamepass_id ? r.gamepass_id : "verified"}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => book(r)} disabled={busy === r.id}
                  data-testid={`book-room-${(r.name || "").replace(/\s+/g, "-").toLowerCase()}`}
                  className="flex-1 btn-discord rounded-md px-4 py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2">
                  {busy === r.id ? "Booking…" : "Book Now"} <ArrowRight className="h-4 w-4" />
                </button>
                {r.checkmein_link && (
                  <a href={r.checkmein_link} target="_blank" rel="noreferrer" className="rounded-md border border-white/10 px-3 py-2.5 text-xs hover:bg-white/5 inline-flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> CheckMeIn
                  </a>
                )}
              </div>
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
            <div key={b.id} className="flex items-center justify-between p-5 gap-4">
              <div className="min-w-0">
                <div className="text-sm">{b.room_name} · <span className="text-nx-gold">Room #{b.room_number}</span></div>
                <div className="text-xs text-[var(--text-2)] truncate">{b.user_username} · {new Date(b.created_at).toLocaleString()} · {b.status}</div>
              </div>
              {b.status !== "cancelled" && (
                <button onClick={() => cancel(b.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
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
