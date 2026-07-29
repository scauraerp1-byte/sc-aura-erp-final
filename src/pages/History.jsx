import { useEffect, useState } from "react";
import api from "../lib/api";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { ClipboardList, Truck } from "lucide-react";

const FILTERS = [
  { label: "24h", hours: 24 }, { label: "48h", hours: 48 },
  { label: "72h", hours: 72 }, { label: "7 days", hours: 168 }, { label: "30 days", hours: 720 },
];

export default function History() {
  const [hours, setHours] = useState(168);
  const [data, setData] = useState({ bookings: [], dispatches: [] });

  useEffect(() => { api.get(`/analytics/history?hours=${hours}`).then(r => setData(r.data)); }, [hours]);

  const events = [
    ...data.bookings.map(b => ({ type: "booking", ...b, ts: b.created_at })),
    ...data.dispatches.map(d => ({ type: "dispatch", ...d, ts: d.created_at })),
  ].sort((a, b) => (a.ts < b.ts ? 1 : -1));

  return (
    <div className="space-y-6">
      <SectionTitle overline="Logs" title="History" />

      <div className="flex gap-2 overflow-x-auto scroll-hide">
        {FILTERS.map(f => (
          <button key={f.hours} onClick={() => setHours(f.hours)} className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border whitespace-nowrap ${hours === f.hours ? "bg-[#d4af37] text-black border-[#d4af37]" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}>{f.label}</button>
        ))}
      </div>

      <GlassCard>
        <div className="space-y-1">
          {events.length === 0 && <div className="text-center text-white/50 py-8">No events in this window.</div>}
          {events.map(ev => (
            <div key={ev.id} className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
              <div className={`mt-1 w-8 h-8 rounded-full grid place-items-center ${ev.type === "booking" ? "bg-amber-500/15 text-amber-300" : "bg-[#d4af37]/15 text-[#ebd281]"}`}>
                {ev.type === "booking" ? <ClipboardList className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-display">{ev.type === "booking" ? ev.booking_no : ev.dispatch_no}</div>
                  <Pill tone={ev.status === "fulfilled" || ev.status === "delivered" ? "success" : ev.status === "cancelled" ? "danger" : "gold"}>{ev.status}</Pill>
                </div>
                <div className="text-xs text-white/55">
                  {ev.type === "booking"
                    ? `Booking · ${ev.customer_snapshot?.name} · ₹${Number(ev.booking_amount).toLocaleString("en-IN")}`
                    : `Dispatch · ${ev.dispatch_to}`}
                </div>
                <div className="text-[11px] text-white/40">{new Date(ev.ts).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
