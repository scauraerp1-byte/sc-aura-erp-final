import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { SizeQuantityEditor, PRESETS } from "../components/SizeWidgets";
import { ScanLine, Search, X, Loader2, Plus, CheckCircle2 } from "lucide-react";
import QRScanner from "../components/QRScanner";
import { useBodyLock } from "../hooks/useBodyLock";
import useEscapeClose from "../hooks/useEscapeClose";
import { cachedGet, bust } from "../lib/dataCache";
import useDebounced from "../hooks/useDebounced";
import { initSizes } from "../lib/sizeInit";

export default function DispatchForm() {
  const navigate = useNavigate();
  const loc = useLocation();
  const [sr, setSr] = useState("");
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerPicker, setCustomerPicker] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [dispatchTo, setDispatchTo] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingId, setBookingId] = useState(loc.state?.booking?.id || null);
  const [estimateId, setEstimateId] = useState(loc.state?.estimate?.id || null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const dq = useDebounced(pickerQuery, 180);
  const customerDQ = useDebounced(customerQuery, 180);

  const [paymentMode, setPaymentMode] = useState("cash");
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [advanceReceived, setAdvanceReceived] = useState(0);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    cachedGet("products:full", "/products", { ttl: 30000 }).then(setProducts).catch(() => {});
    cachedGet("customers:list", "/customers", { ttl: 30000 }).then(setCustomers).catch(() => {});
    if (loc.state?.preselectProduct) addProductFull(loc.state.preselectProduct);
    if (loc.state?.booking) {
      const b = loc.state.booking;
      setCustomerId(b.customer_id || "");
      setDispatchTo(b.customer_snapshot?.shop_name || b.customer_snapshot?.name || "");
      setPhone(b.customer_snapshot?.phone || "");
      setBookingId(b.id);
      setAdvanceReceived(b.advance_received || 0);
      Promise.all((b.items || []).map((it) => api.get(`/products/${it.product_id}`).then((r) => r.data).catch(() => null)))
        .then((prods) => {
          setItems(prods.map((p, i) => p && ({
            product_id: p.id, sr_number: p.sr_number, title: p.title, size_preset: p.size_preset,
            sizes: { ...(b.items[i].sizes || {}) }, stock_by_size: p.stock_by_size,
            unit_price: b.items[i].unit_price || p.price, image: p.images?.[0] || "",
          })).filter(Boolean));
        });
    }
    if (loc.state?.estimate) {
      const e = loc.state.estimate;
      setDispatchTo(e.customer_name || "");
      setPhone(e.customer_phone || "");
      setCustomerId(e.customer_id || "");
      setEstimateId(e.id);
      setDeliveryCharges(e.delivery_charges || 0);
      setAdvanceReceived(e.advance_received || 0);
      Promise.all((e.items || []).map((it) => api.get(`/products/${it.product_id}`).then((r) => r.data).catch(() => null)))
        .then((prods) => {
          setItems(prods.map((p, i) => p && ({
            product_id: p.id, sr_number: p.sr_number, title: p.title, size_preset: p.size_preset,
            sizes: { ...(e.items[i].sizes || {}) }, stock_by_size: p.stock_by_size,
            unit_price: e.items[i].unit_price || p.price, image: p.images?.[0] || "",
          })).filter(Boolean));
        });
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const c = customers.find((x) => x.id === customerId);
    if (c && !loc.state?.booking && !loc.state?.estimate) {
      setDispatchTo(c.shop_name || c.name);
      setPhone(c.phone);
    }
    // eslint-disable-next-line
  }, [customerId, customers]);

  const itemTotal = useMemo(
    () => items.reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0) * Number(it.unit_price || 0), 0),
    [items]
  );
  const grandTotal = itemTotal + (Number(deliveryCharges) || 0);
  const finalPayable = Math.max(0, grandTotal - (Number(advanceReceived) || 0));

  const addProductFull = (p) => {
    if (!p) return;
    if (items.find((it) => it.product_id === p.id)) { setPickerOpen(false); return; }
    setItems((prev) => [
      ...prev,
      {
        product_id: p.id, sr_number: p.sr_number, title: p.title, size_preset: p.size_preset,
        sizes: initSizes(p.size_preset, p.stock_by_size),
        stock_by_size: p.stock_by_size, unit_price: p.price, image: p.images?.[0] || "",
      },
    ]);
    setPickerOpen(false); setPickerQuery("");
  };

  const loadBySr = async (val) => {
    const code = (val ?? sr).trim();
    if (!code) return;
    setError("");
    try { const { data } = await api.get(`/products/by-sr/${code}`); addProductFull(data); setSr(""); }
    catch { setError("No product found with SR " + code); }
  };

  const setItemSizes = (idx, sizes) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, sizes } : it)));
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const setUnitPrice = (idx, v) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, unit_price: Math.max(0, Number(v) || 0) } : it)));

  const validate = () => {
    if (!dispatchTo || !phone) return "Dispatch to & phone are required";
    if (items.length === 0) return "Add at least one product";
    if (items.some((it) => !Object.entries(it.sizes || {}).some(([, v]) => v > 0)))
      return "Each item needs at least one size with quantity";
    return null;
  };

  const submit = async () => {
    const err = validate(); if (err) { setError(err); return; }
    setBusy(true); setError("");
    try {
      const cleaned = items.map((it) => ({
        product_id: it.product_id, sr_number: it.sr_number, title: it.title,
        sizes: Object.fromEntries(Object.entries(it.sizes).filter(([, v]) => v > 0)),
        unit_price: Number(it.unit_price) || 0, image: it.image || "",
      }));
      await api.post("/dispatches", {
        customer_id: customerId || null, booking_id: bookingId || null,
        estimate_id: estimateId || null, dispatch_to: dispatchTo, phone, items: cleaned,
        payment_mode: paymentMode, advance_received: Number(advanceReceived) || 0,
        delivery_charges: Number(deliveryCharges) || 0, notes,
      });
      bust("dispatches"); bust("products");
      navigate("/dispatch");
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); setConfirming(false); }
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

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      <SectionTitle overline="Operations" title={estimateId ? "Confirm Estimate → Dispatch" : bookingId ? "Dispatch from Booking" : "New Dispatch"} />

      <GlassCard>
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/45 mb-2">Add product</div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              data-testid="dispatch-sr-input"
              value={sr}
              onChange={(e) => setSr(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), loadBySr())}
              placeholder="SCA-00001"
              className="aura-input pl-10 font-mono-receipt uppercase"
            />
          </div>
          <button type="button" onClick={() => setScanOpen(true)} data-testid="dispatch-scan-qr" className="rounded-full glass px-4 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-2">
            <ScanLine className="w-4 h-4" /> Scan
          </button>
          <button type="button" onClick={() => setPickerOpen(true)} className="rounded-full glass px-4 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-2">
            <Search className="w-4 h-4" /> Browse
          </button>
          <button type="button" onClick={() => loadBySr()} data-testid="dispatch-sr-add" className="btn-primary rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </GlassCard>

      {items.length > 0 && (
        <GlassCard>
          <SectionTitle overline="Items" title="Selected products" />
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
                          className="w-20 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs tabular-nums"
                          data-testid={`dispatch-price-${it.sr_number}`} />
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
        </GlassCard>
      )}

      <GlassCard>
        <SectionTitle overline="Customer" title="Dispatch to" />
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Linked customer (optional)</span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomerQuery("");
                  setCustomerPicker(true);
                }}
                className="aura-input flex-1 text-left flex items-center justify-between gap-3"
              >
                <span className={selectedCustomer ? "" : "text-white/45"}>
                  {selectedCustomer
                    ? `${selectedCustomer.name}${selectedCustomer.shop_name ? ` · ${selectedCustomer.shop_name}` : ""}`
                    : "— Direct sale —"}
                </span>
                <Search className="w-4 h-4 flex-shrink-0 opacity-60" />
              </button>

              {customerId && (
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
          </label>
          <label className="block">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Dispatch to *</span>
            <input data-testid="dispatch-to" required value={dispatchTo} onChange={(e) => setDispatchTo(e.target.value)} className="aura-input" placeholder="Shop / Person" />
          </label>
          <label className="block">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Phone *</span>
            <input data-testid="dispatch-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} className="aura-input" placeholder="+91 …" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="aura-input" />
          </label>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle overline="Payment" title="Amount & mode" />
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Payment mode</span>
            <select data-testid="dispatch-payment-mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="aura-input">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="credit">Credit (later)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Delivery charges (₹)</span>
            <input data-testid="dispatch-delivery" type="number" min={0} step="0.01" value={deliveryCharges} onChange={(e) => setDeliveryCharges(e.target.value)} className="aura-input" />
          </label>
          <label className="block">
            <span className="text-xs text-white/70 mb-1.5 inline-block">Advance received (₹)</span>
            <input data-testid="dispatch-advance" type="number" min={0} step="0.01" value={advanceReceived} onChange={(e) => setAdvanceReceived(e.target.value)} className="aura-input" />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <SummaryTile label="Item Total" value={`₹${itemTotal.toLocaleString("en-IN")}`} />
          <SummaryTile label="Delivery" value={`₹${Number(deliveryCharges || 0).toLocaleString("en-IN")}`} />
          <SummaryTile label="Grand Total" value={`₹${grandTotal.toLocaleString("en-IN")}`} />
          <SummaryTile label="Final Payable" value={`₹${finalPayable.toLocaleString("en-IN")}`} accent />
        </div>
      </GlassCard>

      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="flex justify-end gap-2 sticky bottom-24 lg:bottom-4 z-10">
        <button onClick={() => navigate(-1)} className="rounded-full glass px-5 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-white/10">Cancel</button>
        <button
          data-testid="dispatch-submit"
          disabled={busy}
          onClick={() => { const e = validate(); if (e) setError(e); else { setError(""); setConfirming(true); } }}
          className="btn-primary rounded-full px-7 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Confirm Dispatch
        </button>
      </div>

      <QRScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={(code) => { setScanOpen(false); loadBySr(code); }} />

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

      {pickerOpen && (
        <ProductPickerModal
          products={filtered} query={pickerQuery} onQuery={setPickerQuery}
          onPick={addProductFull} onClose={() => setPickerOpen(false)}
        />
      )}

      {confirming && <ConfirmDispatchModal
        items={items} paymentMode={paymentMode} deliveryCharges={deliveryCharges}
        advanceReceived={advanceReceived} finalPayable={finalPayable} busy={busy}
        onCancel={() => setConfirming(false)} onConfirm={submit}
      />}
    </div>
  );
}

function SummaryTile({ label, value, accent }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${accent ? "border-[var(--sca-primary)]/40 bg-[var(--sca-primary)]/5" : "border-white/10"}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="font-display text-base tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function ConfirmDispatchModal({ items, paymentMode, deliveryCharges, advanceReceived, finalPayable, busy, onCancel, onConfirm }) {
  useBodyLock(true);
  useEscapeClose(onCancel, true);
  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm grid place-items-center modal-viewport" role="dialog" aria-modal="true">
      <div className="modal-shell w-full max-w-md rounded-2xl border shadow-2xl fade-up
        bg-white border-[var(--sca-border)] text-[var(--sca-text)]
        dark:bg-[#11151d] dark:border-white/12 dark:text-white">
        <div className="px-6 py-4 border-b border-[var(--sca-border)] dark:border-white/10 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <h3 className="font-display text-lg">Confirm dispatch?</h3>
        </div>
        <div className="modal-body px-6 py-4 text-sm space-y-2">
          <div className="flex justify-between"><span className="text-white/60 dark:text-white/60">Items</span><span className="tabular-nums">{items.length}</span></div>
          <div className="flex justify-between"><span className="text-white/60 dark:text-white/60">Pieces</span><span className="tabular-nums">{items.reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + b, 0), 0)}</span></div>
          <div className="flex justify-between"><span className="text-white/60 dark:text-white/60">Payment mode</span><span className="uppercase">{paymentMode}</span></div>
          <div className="flex justify-between"><span className="text-white/60 dark:text-white/60">Delivery</span><span className="tabular-nums">₹{Number(deliveryCharges || 0).toLocaleString("en-IN")}</span></div>
          <div className="flex justify-between"><span className="text-white/60 dark:text-white/60">Advance</span><span className="tabular-nums">₹{Number(advanceReceived || 0).toLocaleString("en-IN")}</span></div>
          <div className="flex justify-between pt-2 border-t border-[var(--sca-border)] dark:border-white/10 font-display">
            <span>Final Payable</span><span className="tabular-nums">₹{finalPayable.toLocaleString("en-IN")}</span>
          </div>
          <div className="text-[11px] text-amber-500 dark:text-amber-300 pt-2">Stock will be reduced automatically.</div>
        </div>
        <div className="px-6 py-4 border-t border-[var(--sca-border)] dark:border-white/10 flex gap-2 justify-end">
          <button onClick={onCancel} className="rounded-full glass px-5 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-white/10">Back</button>
          <button data-testid="dispatch-confirm-yes" onClick={onConfirm} disabled={busy} className="btn-primary rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
          </button>
        </div>
      </div>
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
        dark:bg-[#11151d] dark:border-white/12 dark:text-white"
      >
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
                <div className="text-[10px] text-[var(--sca-text-muted)] dark:text-white/45">Stock: {p.quantity}</div>
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
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10">
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
