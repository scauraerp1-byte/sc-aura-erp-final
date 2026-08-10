import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { SizeQuantityEditor } from "../components/SizeWidgets";
import { Plus, X, Search, Loader2, ScanLine } from "lucide-react";
import QRScanner from "../components/QRScanner";
import { useBodyLock } from "../hooks/useBodyLock";
import useEscapeClose from "../hooks/useEscapeClose";
import useDebounced from "../hooks/useDebounced";
import { cachedGet, bust } from "../lib/dataCache";
import { initSizes } from "../lib/sizeInit";

export default function BookingForm({ editMode = false }) {
  const navigate = useNavigate();
  const loc = useLocation();
  const { id: bookingId } = useParams();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState(loc.state?.preselectCustomer?.id || "");
  const [customerPicker, setCustomerPicker] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [productPicker, setProductPicker] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [advance, setAdvance] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dq = useDebounced(productQuery, 180);
  const customerDQ = useDebounced(customerQuery, 180);

  useEffect(() => {
    cachedGet("customers:list", "/customers", { ttl: 30000 }).then(setCustomers).catch(() => {});
    cachedGet("products:full", "/products", { ttl: 30000 }).then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editMode || !bookingId) return;
    setLoading(true);
    api.get(`/bookings/${bookingId}`).then((r) => {
      const b = r.data;
      setCustomerId(b.customer_id || "");
      setAdvance(b.advance_received || 0);
      setNotes(b.notes || "");
      Promise.all(
        (b.items || []).map((it) => api.get(`/products/${it.product_id}`)
          .then((rr) => ({ ...it, size_preset: rr.data.size_preset, image: it.image || rr.data.images?.[0] }))
          .catch(() => it))
      ).then((hydrated) => { setItems(hydrated); setLoading(false); })
        .catch(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, [editMode, bookingId]);

  useEffect(() => {
    if (!editMode && loc.state?.preselectProduct) addProduct(loc.state.preselectProduct);
    // eslint-disable-next-line
  }, []);

  const itemTotal = useMemo(
    () => items.reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0) * Number(it.unit_price || 0), 0),
    [items]
  );
  const remaining = Math.max(0, itemTotal - (Number(advance) || 0));
  const fullyPaid = (Number(advance) || 0) >= itemTotal && itemTotal > 0;

  const addProduct = (p) => {
    if (!p) return;
    if (items.find((i) => i.product_id === p.id)) { setProductPicker(false); return; }
    setItems((prev) => [
      ...prev,
      { product_id: p.id, sr_number: p.sr_number, title: p.title, size_preset: p.size_preset,
        sizes: initSizes(p.size_preset, p.stock_by_size),
        unit_price: p.price, image: p.images?.[0] || "" },
    ]);
    setProductPicker(false); setProductQuery("");
  };

  const onScan = async (text) => {
    setScanOpen(false);
    try { const { data } = await api.get(`/products/by-sr/${text}`); addProduct(data); }
    catch { setError(`No product found with SR ${text}`); }
  };

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const setItemSizes = (idx, sizes) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, sizes } : it)));
  const setUnitPrice = (idx, v) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, unit_price: Math.max(0, Number(v) || 0) } : it)));

  const submit = async () => {
    setError("");
    if (!customerId) return setError("Select a customer");
    if (items.length === 0) return setError("Add at least one product");
    const cleaned = items.map((it) => ({
      product_id: it.product_id, sr_number: it.sr_number, title: it.title,
      sizes: Object.fromEntries(Object.entries(it.sizes || {}).filter(([, v]) => v > 0)),
      unit_price: Number(it.unit_price) || 0, image: it.image || "",
    }));
    if (cleaned.some((it) => Object.keys(it.sizes).length === 0))
      return setError("Each item needs at least one size with quantity");
    setBusy(true);
    try {
      if (editMode && bookingId) {
        await api.patch(`/bookings/${bookingId}`, { customer_id: customerId, items: cleaned, advance_received: Number(advance) || 0, notes });
        bust("bookings"); navigate(`/bookings/${bookingId}`);
      } else {
        const { data } = await api.post("/bookings", { customer_id: customerId, items: cleaned, advance_received: Number(advance) || 0, notes });
        bust("bookings"); navigate(`/bookings/${data.id}`);
      }
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  const filtered = useMemo(() => {
    if (!dq) return products;
    const q = dq.toLowerCase();
    return products.filter((p) => (p.title || "").toLowerCase().includes(q) || (p.sr_number || "").toLowerCase().includes(q));
  }, [products, dq]);

  const filteredCustomers = useMemo(() => {
    const q = customerDQ.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.shop_name, c.phone, c.country_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [customers, customerDQ]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  if (loading) return <div className="h-64 rounded-2xl shimmer" />;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      <SectionTitle overline="Operations" title={editMode ? "Edit Booking" : "New Booking"} />

      <GlassCard>
        <label className="block">
          <span className="text-xs text-white/70 mb-1.5 inline-block">Customer</span>

          <div className="flex gap-2">
            <button
              type="button"
              data-testid="booking-customer"
              disabled={editMode}
              onClick={() => {
                if (editMode) return;
                setCustomerQuery("");
                setCustomerPicker(true);
              }}
              className="aura-input flex-1 text-left flex items-center justify-between gap-3 disabled:opacity-60"
            >
              <span className={selectedCustomer ? "" : "text-white/45"}>
                {selectedCustomer
                  ? `${selectedCustomer.name}${selectedCustomer.shop_name ? ` · ${selectedCustomer.shop_name}` : ""}`
                  : "— Select customer —"}
              </span>
              <Search className="w-4 h-4 flex-shrink-0 opacity-60" />
            </button>

            {customerId && !editMode && (
              <button
                type="button"
                onClick={() => setCustomerId("")}
                className="rounded-xl glass px-3 border border-white/10 hover:bg-white/10"
                aria-label="Clear customer"
                title="Clear customer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {selectedCustomer && (
            <div className="text-[11px] text-white/45 mt-1">
              {selectedCustomer.shop_name || "Customer"} · {selectedCustomer.phone || "No phone"}
            </div>
          )}

          {editMode && <div className="text-[11px] text-white/45 mt-1">Customer cannot be changed after booking is created.</div>}
        </label>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">Items</div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setScanOpen(true)} data-testid="booking-scan-qr"
              className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-2">
              <ScanLine className="w-3.5 h-3.5" /> Scan
            </button>
            <button type="button" onClick={() => setProductPicker(true)} data-testid="booking-add-item"
              className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Add product
            </button>
          </div>
        </div>
        {items.length === 0 && <div className="text-sm text-white/55 py-6 text-center">No items added.</div>}
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={it.product_id} className="rounded-xl border border-white/10 p-3.5" data-testid={`booking-item-${it.sr_number}`}>
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
                        className="w-20 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs tabular-nums"
                        data-testid={`booking-price-${it.sr_number}`} />
                      <Pill>{it.size_preset}</Pill>
                    </div>
                  </div>
                </div>
                <button onClick={() => removeItem(idx)} aria-label="Remove item" className="text-white/45 hover:text-red-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SizeQuantityEditor preset={it.size_preset} value={it.sizes} onChange={(s) => setItemSizes(idx, s)} />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle overline="Payment" title="Amount" />
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">Item Total</div>
            <div className="font-display text-2xl mt-1 tabular-nums">₹{itemTotal.toLocaleString("en-IN")}</div>
          </div>
          <label className="rounded-xl border border-white/10 p-4 block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">Advance Received</span>
            <input data-testid="booking-advance" type="number" min={0} step="0.01" value={advance} onChange={(e) => setAdvance(e.target.value)}
              className="w-full bg-transparent font-display text-2xl mt-1 outline-none tabular-nums" />
          </label>
          <div className="rounded-xl border border-white/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">Remaining</div>
            <div className={`font-display text-2xl mt-1 tabular-nums ${remaining > 0 ? "text-amber-300" : "text-emerald-400"}`}>
              ₹{remaining.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
        {fullyPaid && (
          <div className="mt-3 text-[11px] text-emerald-400 uppercase tracking-[0.2em]">Full payment received — you can dispatch directly.</div>
        )}
        <label className="block mt-3">
          <span className="text-xs text-white/70 mb-1.5 inline-block">Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="aura-input" placeholder="Optional" />
        </label>
      </GlassCard>

      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="flex justify-end gap-2">
        <button onClick={() => navigate(-1)} className="rounded-full glass px-5 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-white/10">Cancel</button>
        <button data-testid="booking-submit" disabled={busy} onClick={submit} className="btn-primary rounded-full px-7 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {editMode ? "Save Changes" : "Create Booking"}
        </button>
      </div>

      <QRScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />

      {customerPicker && (
        <CustomerPickerModal
          customers={filteredCustomers}
          query={customerQuery}
          onQuery={setCustomerQuery}
          onPick={(c) => {
            setCustomerId(c.id);
            setCustomerPicker(false);
            setCustomerQuery("");
          }}
          onClose={() => {
            setCustomerPicker(false);
            setCustomerQuery("");
          }}
        />
      )}

      {productPicker && (
        <ProductPickerModal
          products={filtered}
          query={productQuery}
          onQuery={setProductQuery}
          onPick={addProduct}
          onClose={() => setProductPicker(false)}
        />
      )}
    </div>
  );
}

function ProductPickerModal({ products, query, onQuery, onPick, onClose }) {
  useBodyLock(true);
  useEscapeClose(onClose, true);
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm grid place-items-center modal-viewport"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true"
    >
      <div className="modal-shell w-full max-w-xl rounded-2xl border shadow-2xl fade-up
        bg-white border-[var(--sca-border)] text-[var(--sca-text)]
        dark:bg-[#11151d] dark:border-white/12 dark:text-white"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--sca-border)] dark:border-white/10">
          <h3 className="font-display text-lg">Pick a product</h3>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-[var(--sca-border)] dark:border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" />
            <input autoFocus placeholder="Search SR or name…" value={query} onChange={(e) => onQuery(e.target.value)} className="aura-input pl-10" />
          </div>
        </div>
        <div className="modal-body p-3 space-y-2">
          {products.length === 0 && (
            <div className="text-center text-sm text-white/55 py-8">
              {query ? `No products match “${query}”` : "No products in inventory."}
            </div>
          )}
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              data-testid={`pick-product-${p.sr_number}`}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/5 hover:bg-black/[0.05] dark:hover:bg-white/10 text-left transition"
            >
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

function CustomerPickerModal({ customers, query, onQuery, onPick, onClose }) {
  useBodyLock(true);
  useEscapeClose(onClose, true);

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm grid place-items-center modal-viewport p-3"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-shell w-full max-w-xl rounded-2xl border shadow-2xl fade-up
        bg-white border-[var(--sca-border)] text-[var(--sca-text)]
        dark:bg-[#11151d] dark:border-white/12 dark:text-white"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--sca-border)] dark:border-white/10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--sca-text-muted)] dark:text-white/45">People</div>
            <h3 className="font-display text-lg">Select Customer</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[var(--sca-border)] dark:border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" />
            <input
              autoFocus
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search name, shop or phone…"
              className="aura-input pl-10"
            />
          </div>
        </div>

        <div className="modal-body p-3 space-y-2">
          {customers.length === 0 && (
            <div className="text-center text-sm text-[var(--sca-text-muted)] dark:text-white/55 py-8">
              {query ? `No customers match “${query}”` : "No customers found."}
            </div>
          )}

          {customers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              className="w-full text-left rounded-xl p-3 border border-[var(--sca-border)] dark:border-white/10 bg-black/[0.02] dark:bg-white/5 hover:bg-black/[0.05] dark:hover:bg-white/10 transition"
            >
              <div className="font-medium truncate">{c.name}</div>
              {c.shop_name && (
                <div className="text-xs text-[var(--sca-text-muted)] dark:text-white/50 truncate mt-0.5">
                  {c.shop_name}
                </div>
              )}
              <div className="text-xs text-[var(--sca-text-soft)] dark:text-white/65 mt-1">
                {c.country_code || ""} {c.phone || "No phone"}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
