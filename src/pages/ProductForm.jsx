import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { API_BASE, formatApiError } from "../lib/api";
import { GlassCard, SectionTitle } from "../components/Primitives";
import { SizePresetSelector, PRESETS } from "../components/SizeWidgets";
import { Loader2, Image as ImageIcon, X } from "lucide-react";

const CATEGORIES = ["1 PC", "2 PC", "3 PC"];

export default function ProductForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", category: "1 PC", size_preset: "M-XXL",
    quantity: 12, price: 0, notes: "", factory_name: "", images: [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const removeImage = (idx) => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const onPickImages = async (files) => {
  const uploaded = [];

  for (const file of Array.from(files || [])) {
    const body = new FormData();
    body.append("file", file);

    const { data } = await api.post("/uploads", body, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    uploaded.push(`${API_BASE}${data.url.replace("/api", "")}`);
  }

  setForm((f) => ({
    ...f,
    images: [...f.images, ...uploaded],
  }));
};

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const payload = { ...form, quantity: Number(form.quantity), price: Number(form.price) };
      const { data } = await api.post("/products", payload);
      navigate(`/products/${data.id}`);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  const sizes = PRESETS[form.size_preset];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <SectionTitle overline="Inventory" title="Add Product" />

      <form onSubmit={submit} className="space-y-4">
        <GlassCard>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Product title</span>
              <input data-testid="product-title" required value={form.title} onChange={(e) => update("title", e.target.value)} className="aura-input" placeholder="e.g. Royal Bandhani 3PC Set" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Description</span>
              <textarea data-testid="product-description" rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} className="aura-input" placeholder="Short product description…" />
            </label>
            <div>
              <span className="text-xs text-white/60 mb-1.5 inline-block">Category</span>
              <div className="flex gap-2">
                {CATEGORIES.map(c => (
                  <button type="button" key={c} data-testid={`cat-${c}`} onClick={() => update("category", c)} className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-full text-xs uppercase tracking-[0.2em] border transition-colors ${form.category === c ? "bg-[var(--sca-primary)] text-white border-[var(--sca-primary)]" : "bg-white/5 border-white/10 text-white/75 hover:bg-white/10"}`}>{c}</button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Price (₹)</span>
              <input data-testid="product-price" required type="number" min={0} step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} className="aura-input" />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Total quantity</span>
              <input data-testid="product-quantity" required type="number" min={0} value={form.quantity} onChange={(e) => update("quantity", e.target.value)} className="aura-input" />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Factory name (internal only)</span>
              <input data-testid="product-factory" value={form.factory_name} onChange={(e) => update("factory_name", e.target.value)} className="aura-input" placeholder="Surat Mills" />
            </label>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">Size range preset</div>
          <SizePresetSelector value={form.size_preset} onChange={(v) => update("size_preset", v)} />
          <div className="mt-3 text-xs text-white/50">
            Includes: <span className="text-white/80">{sizes.join(" · ")}</span>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">Images</div>
          <label className="block border border-dashed border-white/15 rounded-2xl p-6 text-center cursor-pointer hover:bg-white/5 transition">
            <ImageIcon className="w-5 h-5 mx-auto text-white/40 mb-2" />
            <div className="text-sm text-white/70">Click to upload images (no limit)</div>
            <div className="text-[10px] text-white/40 mt-1">JPEG · PNG · WebP</div>
            <input data-testid="product-images" type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPickImages(e.target.files)} />
          </label>
          {form.images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-3">
              {form.images.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-black/70 text-white/80 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Internal notes</span>
            <textarea data-testid="product-notes" rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} className="aura-input" placeholder="Optional notes for inventory team…" />
          </label>
        </GlassCard>

        {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-full glass px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-white/10">Cancel</button>
          <button data-testid="product-submit" disabled={busy} className="btn-primary rounded-full px-8 py-3 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Product
          </button>
        </div>
      </form>
    </div>
  );
}
