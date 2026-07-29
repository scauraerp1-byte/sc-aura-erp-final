import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { Plus, X, Search, Loader2, ScanLine, Download, Share2, RotateCcw } from "lucide-react";
import { SizeQuantityEditor } from "../components/SizeWidgets";
import QRScanner from "../components/QRScanner";
import { useBranding } from "../contexts/BrandingContext";
import { buildReturnPDF, downloadPDF, sharePDF } from "../lib/pdf";
import { formatRupee } from "../lib/share";
import FilterBar from "../components/FilterBar";
import { useBodyLock } from "../hooks/useBodyLock";
import useEscapeClose from "../hooks/useEscapeClose";
import { cachedGet, bust } from "../lib/dataCache";
import useDebounced from "../hooks/useDebounced";
import { initSizes } from "../lib/sizeInit";

export function VendorReturnsList() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const { branding } = useBranding();
  const dq = useDebounced(search, 220);

  useEffect(() => {
    setLoading(true);
    const params = dq.trim() ? { q: dq.trim() } : {};
    api.get("/vendor-returns", { params })
      .then((r) => setItems(r.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [dq]);

  const navigate = useNavigate();

  const downloadPdf = async (r) => {
    setBusy(r.id);
    try { const doc = await buildReturnPDF(r, branding); await downloadPDF(doc, `${r.return_no}.pdf`); }
    finally { setBusy(""); }
  };
  const sharePdf = async (r) => {
    setBusy(r.id);
    try { const doc = await buildReturnPDF(r, branding); await sharePDF(doc, `${r.return_no}.pdf`); }
    finally { setBusy(""); }
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        overline="Operations"
        title="Vendor Returns"
        action={
          <button onClick={() => navigate("/vendor-returns/new")} data-testid="return-new" className="btn-primary rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Return
          </button>
        }
      />

      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search return no, vendor…" />

      <div className="grid lg:grid-cols-2 gap-3">
        {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 rounded-2xl shimmer" />)}
        {!loading && items.length === 0 && (
          <GlassCard className="lg:col-span-2 text-center py-10 text-white/55">No vendor returns yet.</GlassCard>
        )}
        {items.map((r) => {
          const qty = (r.items || []).reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + b, 0), 0);
          return (
            <GlassCard key={r.id} data-testid={`return-card-${r.return_no}`} className="!p-4 sm:!p-5">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono-receipt text-white/60">{r.return_no}</div>
                  <div className="font-display text-lg mt-0.5 truncate">{r.vendor_name || "—"}</div>
                  {r.reason && <div className="text-xs text-white/55">Reason: {r.reason}</div>}
                </div>
                <Pill tone="warning">Returned</Pill>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(r.items || []).slice(0, 5).map((it, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono-receipt">{it.sr_number}</span>
                ))}
                {(r.items || []).length > 5 && <span className="text-[11px] text-white/45">+{r.items.length - 5} more</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="rounded-lg bg-white/5 px-2 py-1.5">
                  <div className="text-[9px] uppercase text-white/45">Pieces</div>
                  <div className="font-display tabular-nums">{qty}</div>
                </div>
                <div className="rounded-lg bg-white/5 px-2 py-1.5">
                  <div className="text-[9px] uppercase text-white/45">Item Total</div>
                  <div className="font-display tabular-nums">{formatRupee(r.item_total)}</div>
                </div>
              </div>
              <div className="text-[10px] text-white/45 mt-2">{new Date(r.created_at).toLocaleString()} · by {r.created_by}</div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => downloadPdf(r)} disabled={busy === r.id} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-1.5">
                  {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                </button>
                <button onClick={() => sharePdf(r)} disabled={busy === r.id} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

export function VendorReturnForm() {
  const navigate = useNavigate();
  const [vendorName, setVendorName] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picQ, setPicQ] = useState("");
  const [sr, setSr] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [initializing, setInitializing] = useState(true);
  const dq = useDebounced(picQ, 180);

  // Safe initialization – if products endpoint fails, we still render an
  // empty form instead of a blank screen.
  useEffect(() => {
    let mounted = true;
    cachedGet("products:full", "/products", { ttl: 30000 })
      .then((data) => { if (mounted) setProducts(Array.isArray(data) ? data : []); })
      .catch(() => { if (mounted) setProducts([]); })
      .finally(() => { if (mounted) setInitializing(false); });
    return () => { mounted = false; };
  }, []);

  const vendors = useMemo(
    () => Array.from(new Set((products || []).map((p) => p.vendor_name || p.factory_name).filter(Boolean))),
    [products]
  );

  const addProduct = (p) => {
    if (!p) return;
    if (items.find((i) => i.product_id === p.id)) { setPickerOpen(false); return; }
    setItems((prev) => [
      ...prev,
      { product_id: p.id, sr_number: p.sr_number, title: p.title, size_preset: p.size_preset,
        sizes: initSizes(p.size_preset, p.stock_by_size),
        unit_price: p.price, stock_by_size: p.stock_by_size, image: p.images?.[0] || "" },
    ]);
    setPickerOpen(false); setPicQ("");
    if (!vendorName && (p.vendor_name || p.factory_name)) setVendorName(p.vendor_name || p.factory_name);
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

  const itemTotal = useMemo(
    () => items.reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0) * Number(it.unit_price || 0), 0),
    [items]
  );

  const submit = async () => {
    setError("");
    if (!vendorName.trim()) return setError("Vendor name is required");
    if (items.length === 0) return setError("Add at least one product");
    const cleaned = items.map((it) => ({
      product_id: it.product_id, sr_number: it.sr_number, title: it.title,
      sizes: Object.fromEntries(Object.entries(it.sizes || {}).filter(([, v]) => v > 0)),
      unit_price: Number(it.unit_price) || 0, image: it.image || "",
    }));
    if (cleaned.some((it) => Object.keys(it.sizes).length === 0)) return setError("Each item needs at least one size with quantity");
    setBusy(true);
    try {
      await api.post("/vendor-returns", { vendor_name: vendorName, items: cleaned, reason, notes });
      bust("vendor-returns"); bust("products");
      navigate("/vendor-returns");
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  const filtered = useMemo(() => {
    if (!dq) return products;
    const q = dq.toLowerCase();
    return products.filter((p) => (p.title || "").toLowerCase().includes(q) || (p.sr_number || "").toLowerCase().includes(q));
  }, [products, dq]);

  if (initializing) return <div className="h-64 rounded-2xl shimmer" />;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      <SectionTitle overline="Operations" title="New Vendor Return" />

      <GlassCard>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Vendor *</span>
            <input list="vendors-list" data-testid="return-vendor" value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="aura-input" placeholder="Surat Mills" />
            <datalist id="vendors-list">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
          </label>
          <label className="block">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Reason</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="aura-input" placeholder="Defective / Wrong size / Damaged…" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="aura-input" />
          </label>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">Items · Stock will be reduced</div>
          <div className="flex gap-2">
            <button onClick={() => setScanOpen(true)} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-2">
              <ScanLine className="w-3.5 h-3.5" /> Scan
            </button>
            <button onClick={() => setPickerOpen(true)} data-testid="return-add-item" className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input data-testid="return-sr-input" value={sr} onChange={(e) => setSr(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), loadBySr())}
              placeholder="SCA-00001" className="aura-input pl-10 uppercase font-mono-receipt" />
          </div>
          <button onClick={loadBySr} className="btn-primary rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.2em]">Add</button>
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
              <SizeQuantityEditor preset={it.size_preset} value={it.sizes} onChange={(s) => setItemSizes(idx, s)} max={it.stock_by_size} />
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm">
          <span className="text-white/60">Item Total</span>
          <span className="font-display tabular-nums">{formatRupee(itemTotal)}</span>
        </div>
      </GlassCard>

      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="flex justify-end gap-2">
        <button onClick={() => navigate(-1)} className="rounded-full glass px-5 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-white/10">Cancel</button>
        <button data-testid="return-submit" disabled={busy} onClick={submit} className="btn-primary rounded-full px-7 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} <RotateCcw className="w-4 h-4" /> Generate Return Receipt
        </button>
      </div>

      <QRScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />
      {pickerOpen && <PickerModal products={filtered} query={picQ} onQuery={setPicQ} onPick={addProduct} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

function PickerModal({ products, query, onQuery, onPick, onClose }) {
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
