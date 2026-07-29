import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle, Pill, StatCard } from "../components/Primitives";
import { Loader2, ArrowLeft, Save, MessageCircle, Trash2 } from "lucide-react";
import { shareWhatsApp } from "../lib/share";

export default function CustomerEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { api.get(`/customers/${id}`).then(r => setForm(r.data)); }, [id]);
  if (!form) return <div className="h-64 rounded-2xl shimmer" />;

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const payload = {
        name: form.name, phone: form.phone, address: form.address,
        gst: form.gst, shop_name: form.shop_name, notes: form.notes,
      };
      await api.patch(`/customers/${id}`, payload);
      navigate(`/customers/${id}`);
    } catch (err) { setError(formatApiError(err.response?.data?.detail) || err.message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm("Delete this customer permanently?")) return;
    try { await api.delete(`/customers/${id}`); navigate("/customers"); }
    catch (err) { setError(formatApiError(err.response?.data?.detail) || err.message); }
  };

  const whatsappShortcut = () => {
    shareWhatsApp({ phone: form.phone, text: `Hi ${form.name}, this is from SC Aura Kurtis.` });
  };

  // Build merged activity timeline
  const events = [
    ...(form.bookings || []).map(b => ({ kind: "booking", ts: b.created_at, title: `Booking ${b.booking_no}`, sub: `${b.items.length} item(s) · ₹${b.item_total || b.booking_amount || 0}`, status: b.status })),
    ...(form.dispatches || []).map(d => ({ kind: "dispatch", ts: d.created_at, title: `Dispatch ${d.dispatch_no}`, sub: `₹${d.grand_total || d.item_total || 0}`, status: d.status })),
  ].sort((a, b) => (a.ts < b.ts ? 1 : -1));

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <SectionTitle overline="Customer" title="Edit Customer" action={
        <button onClick={whatsappShortcut} className="rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 px-4 py-2 text-xs uppercase tracking-[0.2em] hover:bg-emerald-500/25 inline-flex items-center gap-2"><MessageCircle className="w-4 h-4" /> WhatsApp</button>
      } />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Orders" value={form.stats?.total_orders ?? 0} accent />
        <StatCard label="Pending" value={form.stats?.pending_orders ?? 0} />
        <StatCard label="Lifetime Value" value={`₹${Number(form.stats?.total_value || 0).toLocaleString("en-IN")}`} />
      </div>

      <form onSubmit={save} className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="lg:col-span-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Name</span>
              <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="aura-input" />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Phone</span>
              <input required value={form.phone} onChange={(e) => update("phone", e.target.value)} className="aura-input" />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Shop name</span>
              <input value={form.shop_name || ""} onChange={(e) => update("shop_name", e.target.value)} className="aura-input" />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">GST</span>
              <input value={form.gst || ""} onChange={(e) => update("gst", e.target.value)} className="aura-input" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Address</span>
              <input value={form.address || ""} onChange={(e) => update("address", e.target.value)} className="aura-input" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Notes</span>
              <textarea rows={2} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} className="aura-input" />
            </label>
          </div>
        </GlassCard>

        <div className="space-y-3">
          <GlassCard>
            {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs mb-3">{error}</div>}
            <div className="grid gap-2">
              <button data-testid="cust-edit-save" disabled={busy} className="btn-gold rounded-full px-5 py-3 text-xs uppercase tracking-[0.25em] inline-flex items-center justify-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save</button>
              <button type="button" onClick={remove} className="rounded-full bg-red-500/10 border border-red-500/30 text-red-200 px-5 py-3 text-xs uppercase tracking-[0.2em] hover:bg-red-500/20 inline-flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
            </div>
          </GlassCard>
        </div>
      </form>

      <GlassCard>
        <SectionTitle overline="History" title="Activity timeline" />
        <div className="relative pl-6 space-y-4 max-h-[400px] overflow-y-auto">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-white/10" />
          {events.length === 0 && <div className="text-sm text-white/50 py-3 text-center">No activity yet.</div>}
          {events.map((ev, i) => (
            <div key={i} className="relative">
              <div className={`absolute -left-4 top-1 w-2.5 h-2.5 rounded-full ${ev.kind === "booking" ? "bg-amber-300" : "bg-[#d4af37]"}`} />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-display">{ev.title}</div>
                  <div className="text-xs text-white/55">{ev.sub}</div>
                  <div className="text-[10px] text-white/40">{new Date(ev.ts).toLocaleString()}</div>
                </div>
                <Pill tone={ev.status === "fulfilled" || ev.status === "delivered" ? "success" : ev.status === "cancelled" ? "danger" : "gold"}>{ev.status}</Pill>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
