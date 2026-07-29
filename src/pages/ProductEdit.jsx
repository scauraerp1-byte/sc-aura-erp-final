import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { SizePresetSelector, PRESETS } from "../components/SizeWidgets";
import { Loader2, Image as ImageIcon, X, ArrowLeft, Save, Trash2, History as HistoryIcon, Truck } from "lucide-react";

const CATEGORIES = ["1 PC", "2 PC", "3 PC"];

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/products/${id}`).then(r => setForm(r.data));
    api.get(`/dispatches`).then(r => {
      const linked = r.data.filter(d => d.items.some(it => it.product_id === id));
      setDispatches(linked);
    });
  }, [id]);

  if (!form) return <div className="h-64 rounded-2xl shimmer" />;

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const removeImage = (i) => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  const onPickImages = async (files) => {
    const arr = await Promise.all(Array.from(files || []).slice(0, 4).map(file => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); })));
    setForm(f => ({ ...f, images: [...f.images, ...arr].slice(0, 6) }));
  };
  const updateSizeStock = (s, n) => setForm(f => ({ ...f, stock_by_size: { ...f.stock_by_size, [s]: Math.max(0, Number(n) || 0) } }));

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const cleanedStock = Object.fromEntries(
        Object.entries(form.stock_by_size || {}).map(([k, v]) => [k, Math.max(0, Number(v) || 0)])
      );
      const payload = {
        title: form.title, description: form.description,
        category: form.category, size_preset: form.size_preset,
        price: Number(form.price), notes: form.notes,
        factory_name: form.factory_name, images: form.images,
        stock_by_size: cleanedStock,
      };
      await api.patch(`/products/${id}`, payload);
      navigate(`/products/${id}`);
    } catch (err) { setError(formatApiError(err.response?.data?.detail) || err.message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm("Delete this product permanently? This cannot be undone.")) return;
    try { await api.delete(`/products/${id}`); navigate("/products"); }
    catch (err) { setError(formatApiError(err.response?.data?.detail) || err.message); }
  };

  const sizes = PRESETS[form.size_preset] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <SectionTitle overline={`SR ${form.sr_number}`} title="Edit Product" />

      <form onSubmit={save} className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <GlassCard>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2">
                <span className="text-xs text-white/60 mb-1.5 inline-block">Title</span>
                <input data-testid="edit-title" required value={form.title} onChange={(e) => update("title", e.target.value)} className="aura-input" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-white/60 mb-1.5 inline-block">Description</span>
                <textarea rows={2} value={form.description || ""} onChange={(e) => update("description", e.target.value)} className="aura-input" />
              </label>
              <div>
                <span className="text-xs text-white/60 mb-1.5 inline-block">Category</span>
                <div className="flex gap-2">
                  {CATEGORIES.map(c => <button type="button" key={c} onClick={() => update("category", c)} className={`flex-1 px-3 py-2.5 rounded-full text-xs uppercase tracking-[0.18em] border ${form.category === c ? "bg-[#d4af37] text-black border-[#d4af37]" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}>{c}</button>)}
                </div>
              </div>
              <label className="block">
                <span className="text-xs text-white/60 mb-1.5 inline-block">Price (₹)</span>
                <input data-testid="edit-price" type="number" min={0} value={form.price} onChange={(e) => update("price", e.target.value)} className="aura-input" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-white/60 mb-1.5 inline-block">Factory (internal only)</span>
                <input value={form.factory_name || ""} onChange={(e) => update("factory_name", e.target.value)} className="aura-input" />
              </label>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">Size preset</div>
            <SizePresetSelector value={form.size_preset} onChange={(v) => update("size_preset", v)} />
            <div className="mt-3 text-xs text-white/50">Includes: <span className="text-white/80">{sizes.join(" · ")}</span></div>
          </GlassCard>

          <GlassCard>
            <SectionTitle overline="Inventory" title="Stock per size" />
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {sizes.map(s => (
                <div key={s} className="rounded-xl border border-white/10 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">{s}</div>
                  <input data-testid={`edit-stock-${s}`} type="number" min={0} value={form.stock_by_size?.[s] ?? 0} onChange={(e) => updateSizeStock(s, e.target.value)} className="w-full bg-transparent text-center font-display text-lg gold-text outline-none" />
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-white/60">Total quantity will be set to <span className="gold-text font-display">{Object.values(form.stock_by_size || {}).reduce((a, b) => a + Number(b || 0), 0)}</span> pcs.</div>
          </GlassCard>

          <GlassCard>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">Images</div>
            <label className="block border border-dashed border-white/15 rounded-2xl p-5 text-center cursor-pointer hover:bg-white/5">
              <ImageIcon className="w-5 h-5 mx-auto text-white/40 mb-2" />
              <div className="text-sm text-white/70">Click to upload more images</div>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPickImages(e.target.files)} />
            </label>
            {form.images?.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                {form.images.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-black/70"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard>
            <SectionTitle overline="Actions" title="Save & manage" />
            {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs mb-3">{error}</div>}
            <div className="grid gap-2">
              <button data-testid="edit-save" disabled={busy} className="btn-gold rounded-full px-5 py-3 text-xs uppercase tracking-[0.25em] inline-flex items-center justify-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save changes</button>
              <button type="button" onClick={remove} className="rounded-full bg-red-500/10 border border-red-500/30 text-red-200 px-5 py-3 text-xs uppercase tracking-[0.2em] hover:bg-red-500/20 inline-flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
            </div>
          </GlassCard>

          <GlassCard>
            <SectionTitle overline="Movement" title="Dispatch history" />
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {dispatches.length === 0 && <div className="text-xs text-white/50 py-3 text-center">No dispatches yet.</div>}
              {dispatches.map(d => {
                const it = d.items.find(x => x.product_id === id);
                const q = it ? Object.values(it.sizes).reduce((a, b) => a + b, 0) : 0;
                return (
                  <div key={d.id} className="rounded-xl border border-white/10 p-3 flex items-center justify-between">
                    <div>
                      <div className="font-display text-sm">{d.dispatch_no}</div>
                      <div className="text-[10px] text-white/50">{new Date(d.created_at).toLocaleDateString()} · {d.dispatch_to}</div>
                    </div>
                    <div className="text-right">
                      <Pill tone={d.status === "delivered" ? "success" : "gold"}>{d.status}</Pill>
                      <div className="text-xs text-white/60 mt-1">-{q} pcs</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </form>
    </div>
  );
}
