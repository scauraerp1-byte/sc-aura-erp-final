import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { Plus, X, Search, Loader2, ScanLine, Download, Share2, Truck } from "lucide-react";
import { SizeQuantityEditor } from "../components/SizeWidgets";
import QRScanner from "../components/QRScanner";
import FilterBar from "../components/FilterBar";
import { useBranding } from "../contexts/BrandingContext";
import { buildEstimatePDF, downloadPDF, sharePDF } from "../lib/pdf";
import { formatRupee } from "../lib/share";
import { useBodyLock } from "../hooks/useBodyLock";
import useEscapeClose from "../hooks/useEscapeClose";
import { cachedGet, bust } from "../lib/dataCache";
import useDebounced from "../hooks/useDebounced";
import { initSizes } from "../lib/sizeInit";

export function EstimatesList() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const navigate = useNavigate();
  const { branding } = useBranding();
  const dq = useDebounced(search, 220);

  const load = () => {
    const params = {};
    if (status !== "All") params.status = status;
    if (dq.trim()) params.q = dq.trim();
    api.get("/estimates", { params }).then((r) => setItems(r.data || [])).catch(() => setItems([]));
  };
  useEffect(load, [status, dq]);

  const cancel = async (e) => {
    if (!window.confirm(`Cancel estimate ${e.estimate_no}?`)) return;
    await api.delete(`/estimates/${e.id}`); load();
  };
  const confirmDispatch = async (e) => {
    setBusy(e.id);
    try {
      const fresh = await api.get(`/estimates/${e.id}`);
      navigate(`/dispatch/new`, { state: { estimate: fresh.data } });
    } finally { setBusy(""); }
  };
  const downloadPdf = async (e) => {
    setBusy(e.id);
    try { const doc = await buildEstimatePDF(e, branding); await downloadPDF(doc, `${e.estimate_no}.pdf`); }
    finally { setBusy(""); }
  };
  const sharePdf = async (e) => {
    setBusy(e.id);
    try { const doc = await buildEstimatePDF(e, branding); await sharePDF(doc, `${e.estimate_no}.pdf`, e.customer_phone); }
    finally { setBusy(""); }
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        overline="Operations"
        title="Estimates / Draft Orders"
        action={
          <button onClick={() => navigate("/estimates/new")} data-testid="estimate-new" className="btn-primary rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Estimate
          </button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search estimate no, customer, phone…"
        filters={[
          { key: "status", label: "Status", value: status, onChange: setStatus,
            options: [
              { value: "All", label: "All" }, { value: "active", label: "Active" },
              { value: "converted", label: "Converted" }, { value: "expired", label: "Expired" }, { value: "cancelled", label: "Cancelled" },
            ] },
        ]}
      />

      <div className="grid lg:grid-cols-2 gap-3">
        {items.length === 0 && <GlassCard className="lg:col-span-2 text-center py-10 text-white/55">No estimates.</GlassCard>}
        {items.map((e) => {
          const qty = (e.items || []).reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + b, 0), 0);
          return (
            <GlassCard key={e.id} data-testid={`estimate-card-${e.estimate_no}`} className="!p-4 sm:!p-5">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono-receipt text-white/60">{e.estimate_no}</div>
                  <div className="font-display text-lg mt-0.5 truncate">{e.customer_name || "Walk-in"}</div>
                  <div className="text-xs text-white/55">{e.customer_phone || "—"}</div>
                </div>
                <Pill tone={e.status === "active" ? "primary" : e.status === "converted" ? "success" : e.status === "expired" ? "warning" : "danger"}>{e.status}</Pill>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(e.items || []).slice(0, 4).map((it, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono-receipt">{it.sr_number}</span>
                ))}
                {(e.items || []).length > 4 && <span className="text-[11px] text-white/45">+{e.items.length - 4} more</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <MiniStat label="Pieces" value={qty} />
                <MiniStat label="Grand" value={formatRupee(e.grand_total)} />
                <MiniStat label="Remaining" value={formatRupee(e.remaining)} />
              </div>
              <div className="text-[10px] text-white/45 mt-2">{new Date(e.created_at).toLocaleString()}</div>
              <div className="flex flex-wrap gap-2 mt-3">
                {e.status === "active" && (
                  <>
                    <button data-testid={`estimate-confirm-${e.estimate_no}`} onClick={() => confirmDispatch(e)} disabled={busy === e.id} className="btn-primary rounded-full px-3 py-2 text-xs uppercase tracking-[0.18em] inline-flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Confirm Dispatch
                    </button>
                    <button onClick={() => navigate(`/estimates/${e.id}/edit`)} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10">Edit</button>
                  </>
                )}
                <button onClick={() => downloadPdf(e)} disabled={busy === e.id} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-1.5">
                  {busy === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                </button>
                <button onClick={() => sharePdf(e)} disabled={busy === e.id} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
                {e.status === "active" && (
                  <button onClick={() => cancel(e)} className="rounded-full bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-red-500/20">Cancel</button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="font-display tabular-nums">{value}</div>
    </div>
  );
}

export function EstimateForm({ editMode = false }) {
  const navigate = useNavigate();
  const { id: editIdFromRoute } = useParams();
  const editId = editMode ? editIdFromRoute : null;

  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [advance, setAdvance] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const [notes, setNotes] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picQ, setPicQ] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [sr, setSr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dq = useDebounced(picQ, 180);

  useEffect(() => {
    cachedGet("products:full", "/products", { ttl: 30000 }).then(setProducts).catch(() => {});
    cachedGet("customers:list", "/customers", { ttl: 30000 }).then(setCustomers).catch(() => {});
    if (editId) {
      api.get(`/estimates/${editId}`).then((r) => {
        const e = r.data;
        setCustomerId(e.customer_id || "");
        setCustomerName(e.customer_name || "");
        setCustomerPhone(e.customer_phone || "");
        setAdvance(e.advance_received || 0);
        setDelivery(e.delivery_charges || 0);
        setNotes(e.notes || "");
        Promise.all((e.items || []).map((it) => api.get(`/products/${it.product_id}`).then((rr) => ({ ...it, size_preset: rr.data.size_preset, image: it.image || rr.data.images?.[0] })).catch(() => it))).then(setItems);
      });
    }
  }, [editId]);

  useEffect(() => {
    const c = customers.find((x) => x.id === customerId);
    if (c) { setCustomerName(c.name); setCustomerPhone(c.phone); }
  }, [customerId, customers]);

  const itemTotal = useMemo(
    () => items.reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0) * Number(it.unit_price || 0), 0),
    [items]
  );
  const grandTotal = itemTotal + (Number(delivery) || 0);
  const remaining = Math.max(0, grandTotal - (Number(advance) || 0));

  const addProduct = (p) => {
    if (!p) return;
    if (items.find((i) => i.product_id === p.id)) { setPickerOpen(false); return; }
    setItems((prev) => [
      ...prev,
      { product_id: p.id, sr_number: p.sr_number, title: p.title, size_preset: p.size_preset,
        sizes: initSizes(p.size_preset, p.stock_by_size),
        unit_price: p.price, image: p.images?.[0] || "" },
    ]);
    setPickerOpen(false); setPicQ("");
  };
  const onScan = async (code) => {
    setScanOpen(false);
    try { const { data } = await api.get(`/products/by-sr/${code}`); addProduct(data); }
    catch { setError(`No product with SR ${code}`); }
  };
  const loadBySr = async () => {
    if (!sr.trim()) return;
    try { const { data } = await api.get(`/products/by-sr/${sr.trim()}`); addProduct(data); setSr(""); }
    catch { setError(`No product with SR ${sr}`); }
  };
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));
  const setItemSizes = (idx, sizes) => setItems((p) => p.map((it, i) => (i === idx ? { ...it, sizes } : it)));
  const setUnitPrice = (idx, v) => setItems((p) => p.map((it, i) => (i === idx ? { ...it, unit_price: Math.max(0, Number(v) || 0) } : it)));

  const save = async () => {
    setError("");
    if (items.length === 0) return setError("Add at least one product");
    const cleaned = items.map((it) => ({
      product_id: it.product_id, sr_number: it.sr_number, title: it.title,
      sizes: Object.fromEntries(Object.entries(it.sizes || {}).filter(([, v]) => v > 0)),
      unit_price: Number(it.unit_price) || 0, image: it.image || "",
    }));
    if (cleaned.some((it) => Object.keys(it.sizes).length === 0)) return setError("Each item needs at least one size with quantity");
    const payload = {
      customer_id: customerId || null, customer_name: customerName, customer_phone: customerPhone,
      items: cleaned, advance_received: Number(advance) || 0, delivery_charges: Number(delivery) || 0, notes,
    };
    setBusy(true);
    try {
      if (editId) await api.patch(`/estimates/${editId}`, payload);
      else await api.post("/estimates", payload);
      bust("estimates"); navigate("/estimates");
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  const filtered = useMemo(() => {
    if (!dq) return products;
    const q = dq.toLowerCase();
    return products.filter((p) => (p.title || "").toLowerCase().includes(q) || (p.sr_number || "").toLowerCase().includes(q));
  }, [products, dq]);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      <SectionTitle overline="Operations" title={editId ? "Edit Estimate" : "New Estimate / Draft Order"} />

      <GlassCard>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Saved customer (optional)</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="aura-input">
              <option value="">— Walk-in / Custom —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Customer name</span>
            <input data-testid="estimate-customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="aura-input" placeholder="Walk-in customer" />
          </label>
          <label className="block">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Phone</span>
            <input data-testid="estimate-customer-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="aura-input" placeholder="+91 …" />
          </label>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">Items · Stock not affected</div>
          <div className="flex gap-2">
            <button onClick={() => setScanOpen(true)} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-2">
              <ScanLine className="w-3.5 h-3.5" /> Scan
            </button>
            <button onClick={() => setPickerOpen(true)} data-testid="estimate-add-item" className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input data-testid="estimate-sr-input" value={sr} onChange={(e) => setSr(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), loadBySr())}
              placeholder="SCA-00001" className="aura-input pl-10 uppercase font-mono-receipt" />
          </div>
          <button onClick={loadBySr} className="btn-primary rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.2em]">Add by SR</button>
        </div>
        {items.length === 0 && <div className="text-sm text-white/55 py-6 text-center">No items added.</div>}
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={it.product_id} className="rounded-xl border border-white/10 p-3.5">
              <div className="flex items-start justify-between mb-2 gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">
                    {it.image && <img src={it.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono-receipt text-white/60">{it.sr_number}</div>
                    <div className="text-sm truncate font-medium">{it.title}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-white/55">₹</span>
                      <input type="number" min={0} step="0.01" value={it.unit_price} onChange={(e) => setUnitPrice(idx, e.target.value)}
                        className="w-20 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs tabular-nums" />
                      <Pill>{it.size_preset}</Pill>
                    </div>
                  </div>
                </div>
                <button onClick={() => removeItem(idx)} aria-label="Remove" className="text-white/45 hover:text-red-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SizeQuantityEditor preset={it.size_preset} value={it.sizes} onChange={(s) => setItemSizes(idx, s)} />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle overline="Payment & Delivery" title="Summary" />
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">Delivery Charges (₹)</span>
            <input data-testid="estimate-delivery" type="number" min={0} step="0.01" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="aura-input" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">Advance Received (₹)</span>
            <input data-testid="estimate-advance" type="number" min={0} step="0.01" value={advance} onChange={(e) => setAdvance(e.target.value)} className="aura-input" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="aura-input" />
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <MiniStat label="Item Total" value={formatRupee(itemTotal)} />
          <MiniStat label="Delivery" value={formatRupee(delivery)} />
          <MiniStat label="Grand Total" value={formatRupee(grandTotal)} />
          <div className="rounded-lg border border-[var(--sca-primary)]/40 bg-[var(--sca-primary)]/5 px-2 py-1.5">
            <div className="text-[9px] uppercase tracking-[0.18em] text-white/60">Remaining</div>
            <div className="font-display tabular-nums">{formatRupee(remaining)}</div>
          </div>
        </div>
      </GlassCard>

      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="flex justify-end gap-2">
        <button onClick={() => navigate(-1)} className="rounded-full glass px-5 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-white/10">Cancel</button>
        <button data-testid="estimate-submit" disabled={busy} onClick={save} className="btn-primary rounded-full px-7 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {editId ? "Save Changes" : "Save Estimate"}
        </button>
      </div>

      <QRScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />
      {pickerOpen && <ProductPickerModal products={filtered} query={picQ} onQuery={setPicQ} onPick={addProduct} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

function ProductPickerModal({ products, query, onQuery, onPick, onClose }) {
  useBodyLock(true);
  useEscapeClose(onClose, true);
  return (
    <div className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm grid place-items-center modal-viewport"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true">
      <div className="modal-shell w-full max-w-xl rounded-2xl border shadow-2xl fade-up
        bg-white border-[var(--sca-border)] text-[var(--sca-text)]
        dark:bg-[#11151d] dark:border-white/12 dark:text-white">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--sca-border)] dark:border-white/10">
          <h3 className="font-display text-lg">Pick a product</h3>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-3 border-b border-[var(--sca-border)] dark:border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" />
            <input autoFocus placeholder="Search SR or name…" value={query} onChange={(e) => onQuery(e.target.value)} className="aura-input pl-10" />
          </div>
        </div>
        <div className="modal-body p-3 space-y-2">
          {products.length === 0 && (
            <div className="text-center text-sm text-white/55 py-8">{query ? `No products match “${query}”` : "No products in inventory."}</div>
          )}
          {products.map((p) => (
            <button key={p.id} type="button" onClick={() => onPick(p)}
              data-testid={`pick-product-${p.sr_number}`}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/5 hover:bg-black/[0.05] dark:hover:bg-white/10 text-left transition">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 border border-[var(--sca-border)] dark:border-white/10">
                {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono-receipt text-[var(--sca-text-muted)] dark:text-white/60">{p.sr_number}</div>
                <div className="text-sm truncate font-medium">{p.title}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-display tabular-nums text-sm">₹{p.price}</div>
                <div className="text-[10px] text-[var(--sca-text-muted)] dark:text-white/55 mt-0.5">{p.size_preset}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
