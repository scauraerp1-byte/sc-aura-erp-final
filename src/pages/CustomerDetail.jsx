import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { GlassCard, Pill, SectionTitle, StatCard } from "../components/Primitives";
import { ArrowLeft, Phone, MapPin, ShoppingBag, ClipboardList, Truck } from "lucide-react";

export default function CustomerDetail() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { api.get(`/customers/${id}`).then(r => setC(r.data)); }, [id]);
  if (!c) return <div className="h-64 rounded-2xl shimmer" />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <GlassCard>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">Customer</div>
            <h1 className="font-display text-3xl tracking-tight">{c.name}</h1>
            <div className="text-sm text-white/60 mt-2 space-y-1">
              <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {c.phone}</div>
              {c.address && <div className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {c.address}</div>}
              {c.shop_name && <div className="flex items-center gap-2"><ShoppingBag className="w-3 h-3" /> {c.shop_name}</div>}
              {c.gst && <div className="text-xs text-white/50">GST: {c.gst}</div>}
            </div>
          </div>
          <Link to="/bookings/new" state={{ preselectCustomer: c }} className="btn-gold rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> New Booking
          </Link>
          <Link to={`/customers/${c.id}/edit`} data-testid="customer-edit-btn" className="rounded-full glass px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2 ml-2">
            Edit
          </Link>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Orders" value={c.stats.total_orders} accent />
        <StatCard label="Pending" value={c.stats.pending_orders} />
        <StatCard label="Lifetime Value" value={`₹${Number(c.stats.total_value).toLocaleString("en-IN")}`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard>
          <SectionTitle overline="History" title="Bookings" />
          <div className="divide-y divide-white/5">
            {c.bookings.length === 0 && <div className="text-sm text-white/50 py-4">No bookings yet.</div>}
            {c.bookings.map(b => (
              <Link key={b.id} to={`/bookings/${b.id}`} className="flex items-center justify-between py-3 group">
                <div>
                  <div className="font-display text-base">{b.booking_no}</div>
                  <div className="text-xs text-white/50">{new Date(b.created_at).toLocaleDateString()} · {b.items.length} item{b.items.length !== 1 ? "s" : ""}</div>
                </div>
                <div className="text-right">
                  <Pill tone={b.status === "fulfilled" ? "success" : b.status === "pending" ? "warning" : b.status === "cancelled" ? "danger" : "gold"}>{b.status}</Pill>
                  <div className="text-sm mt-1 gold-text">₹{Number(b.booking_amount).toLocaleString("en-IN")}</div>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle overline="History" title="Dispatches" />
          <div className="divide-y divide-white/5">
            {c.dispatches.length === 0 && <div className="text-sm text-white/50 py-4">No dispatches yet.</div>}
            {c.dispatches.map(d => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-display text-base">{d.dispatch_no}</div>
                  <div className="text-xs text-white/50">{new Date(d.created_at).toLocaleDateString()} · {d.transport || "—"}</div>
                </div>
                <Pill tone={d.status === "delivered" ? "success" : d.status === "dispatched" ? "gold" : "default"}>{d.status}</Pill>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
