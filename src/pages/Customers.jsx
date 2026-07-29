import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { Plus, Phone, MapPin, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import FilterBar from "../components/FilterBar";
import { useBodyLock } from "../hooks/useBodyLock";
import useEscapeClose from "../hooks/useEscapeClose";
import useDebounced from "../hooks/useDebounced";
import { bust } from "../lib/dataCache";

const COUNTRIES = [
  { code: "+91",  label: "IN +91",  flag: "🇮🇳" },
  { code: "+1",   label: "US +1",   flag: "🇺🇸" },
  { code: "+44",  label: "UK +44",  flag: "🇬🇧" },
  { code: "+971", label: "UAE +971", flag: "🇦🇪" },
  { code: "+61",  label: "AU +61",  flag: "🇦🇺" },
  { code: "+65",  label: "SG +65",  flag: "🇸🇬" },
];

export default function Customers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();
  const dq = useDebounced(q, 220);

  useEffect(() => {
    api.get("/customers", { params: dq ? { q: dq } : {} }).then((r) => setItems(r.data)).catch(() => {});
  }, [dq]);

  return (
    <div className="space-y-4">
      <SectionTitle overline="People" title="Customers" action={
        <button
          onClick={() => setShowAdd(true)}
          data-testid="customers-add"
          className="btn-primary rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      } />

      <FilterBar search={q} onSearchChange={setQ} searchPlaceholder="Search by name, phone or shop…" />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.length === 0 && (
          <GlassCard className="md:col-span-2 lg:col-span-3 text-center py-10 text-white/55">No customers yet.</GlassCard>
        )}
        {items.map((c) => (
          <Link
            key={c.id}
            to={`/customers/${c.id}`}
            data-testid={`customer-card-${c.id}`}
            className="glass rounded-2xl p-4 sm:p-5 hover:bg-white/[0.06] transition"
          >
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="min-w-0">
                <div className="font-display text-base sm:text-lg truncate">{c.name}</div>
                {c.shop_name && <div className="text-xs text-white/55 truncate">{c.shop_name}</div>}
              </div>
              <Pill tone="neutral">Customer</Pill>
            </div>
            <div className="text-xs text-white/70 flex items-center gap-2 mt-1">
              <Phone className="w-3 h-3" /> {c.country_code || ""} {c.phone}
            </div>
            {c.address && (
              <div className="text-xs text-white/55 flex items-center gap-2 mt-1">
                <MapPin className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{c.address}</span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {showAdd && (
        <CustomerAddModal
          onClose={() => setShowAdd(false)}
          onCreated={(c) => {
            setShowAdd(false);
            bust("customers");
            navigate(`/customers/${c.id}`);
          }}
        />
      )}
    </div>
  );
}

function CustomerAddModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "", country_code: "+91", phone: "", address: "", gst: "", shop_name: "", notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useBodyLock(true);
  useEscapeClose(onClose, true);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const payload = { ...form, phone: `${form.country_code} ${form.phone.trim()}`.trim() };
      const { data } = await api.post("/customers", payload);
      toast.success("Customer added");
      onCreated?.(data);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm grid place-items-center modal-viewport"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true"
    >
      <form
        onSubmit={submit}
        className="modal-shell w-full max-w-lg rounded-2xl border shadow-2xl fade-up
          bg-white border-[var(--sca-border)] text-[var(--sca-text)]
          dark:bg-[#11151d] dark:border-white/12 dark:text-white"
        data-testid="customer-form"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--sca-border)] dark:border-white/10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--sca-text-muted)] dark:text-white/50">People</div>
            <h3 className="font-display text-xl leading-tight mt-0.5">Add Customer</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="modal-body px-6 py-5 space-y-3">
          <label className="block">
            <span className="text-xs text-[var(--sca-text-soft)] dark:text-white/70 mb-1.5 inline-block">Full name *</span>
            <input data-testid="cust-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="aura-input" placeholder="Meena Fashion Hub" />
          </label>

          <div>
            <span className="text-xs text-[var(--sca-text-soft)] dark:text-white/70 mb-1.5 inline-block">Mobile number *</span>
            <div className="flex gap-2">
              <select
                data-testid="cust-country-code"
                value={form.country_code}
                onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                <select
  className="aura-input !w-[72px] flex-shrink-0 px-2"
>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
              <input
                data-testid="cust-phone"
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9\s\-]{6,15}"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d\s-]/g, "") })}
                c className="aura-input flex-1 w-full"
  placeholder="98765 43210"
/>
            </div>
          </div>

          <label className="block">
            <span className="text-xs text-[var(--sca-text-soft)] dark:text-white/70 mb-1.5 inline-block">Shop name (optional)</span>
            <input data-testid="cust-shop" value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} className="aura-input" placeholder="Meena Hub" />
          </label>

          <label className="block">
            <span className="text-xs text-[var(--sca-text-soft)] dark:text-white/70 mb-1.5 inline-block">Address (optional)</span>
            <input data-testid="cust-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="aura-input" placeholder="Jaipur, Rajasthan" />
          </label>

          <details className="rounded-lg border border-[var(--sca-border)] dark:border-white/10 px-3 py-2">
            <summary className="text-xs text-[var(--sca-text-soft)] dark:text-white/70 cursor-pointer select-none">More details (GST, notes)</summary>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <label className="block">
                <span className="text-xs text-[var(--sca-text-soft)] dark:text-white/70 mb-1.5 inline-block">GST</span>
                <input data-testid="cust-gst" value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} className="aura-input" />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--sca-text-soft)] dark:text-white/70 mb-1.5 inline-block">Notes</span>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="aura-input" />
              </label>
            </div>
          </details>

          {error && <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-[var(--sca-border)] dark:border-white/10 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full glass px-5 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-black/5 dark:hover:bg-white/10">
            Cancel
          </button>
          <button data-testid="cust-submit" disabled={busy} className="btn-primary rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.18em] inline-flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Create
          </button>
        </div>
      </form>
    </div>
  );
}
