import { useEffect, useState } from "react";
import api from "../lib/api";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { Flame } from "lucide-react";

const FILTERS = [
  { label: "24h", hours: 24 },
  { label: "48h", hours: 48 },
  { label: "72h", hours: 72 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
];

export default function FastSelling() {
  const [hours, setHours] = useState(168);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics/fast-selling?hours=${hours}`).then(r => { setItems(r.data); setLoading(false); });
  }, [hours]);

  return (
    <div className="space-y-6">
      <SectionTitle overline="Intelligence" title="Fast Selling Articles" />

      <div className="flex gap-2 overflow-x-auto scroll-hide">
        {FILTERS.map(f => (
          <button key={f.hours} data-testid={`fast-filter-${f.label}`} onClick={() => setHours(f.hours)} className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border whitespace-nowrap ${hours === f.hours ? "bg-[#d4af37] text-black border-[#d4af37]" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-2xl shimmer" />)}
        </div>
      ) : items.length === 0 ? (
        <GlassCard className="text-center py-12 text-white/50">No dispatches in this window.</GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(f => (
            <GlassCard key={f.product_id} className="!p-4">
              <div className="flex gap-3">
                <div className="w-20 h-24 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                  {f.image && <img src={f.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#ebd281]">{f.sr_number}</span>
                    <Pill tone={f.badge === "Low Stock Risk" ? "warning" : "gold"}><Flame className="w-3 h-3" />{f.badge}</Pill>
                  </div>
                  <div className="text-sm truncate">{f.title}</div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Metric label="Sold" value={f.sold_qty} accent />
                    <Metric label="Orders" value={f.frequency} />
                    <Metric label="Left" value={f.remaining} />
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className={`font-display text-lg ${accent ? "gold-text" : "text-white"}`}>{value}</div>
    </div>
  );
}
