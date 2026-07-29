import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../lib/api";
import { sharePage, publicCatalogueUrl, formatRupee } from "../lib/share";
import { Share2, ShoppingBag, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";

export default function PublicCatalogue() {
  const { sr } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    axios.get(`${API_BASE}/public/catalogue/${sr}`)
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.detail || "Not found"));
  }, [sr]);

  if (err) return <div className="min-h-screen bg-black text-white grid place-items-center"><div className="glass rounded-3xl p-8 text-center"><div className="font-display text-2xl mb-2">Product not available</div><div className="text-sm text-white/60">{err}</div></div></div>;
  if (!data) return <div className="min-h-screen bg-black grid place-items-center"><div className="font-display text-sm text-white/50 uppercase tracking-[0.3em]">Loading…</div></div>;

  const { product, branding } = data;
  const wa = (branding.whatsapp || branding.phone || "").replace(/[^\d+]/g, "");
  const images = product.images?.length ? product.images : [null];

  const handleShare = () => {
    const text = `*${product.title}*\nSR: ${product.sr_number}\nCategory: ${product.category}\nPrice: ${formatRupee(product.price)}\nAvailable sizes: ${product.available_sizes.join(", ")}\n\nView catalogue → ${publicCatalogueUrl(product.sr_number)}`;
    sharePage({
      title: product.title, text, url: publicCatalogueUrl(product.sr_number),
      phone: wa,
    });
  };

  const openWhatsAppEnquiry = () => {
    const text = `Hi, I am interested in *${product.title}* (${product.sr_number}). Please share more details.`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top brand bar */}
      <header className="sticky top-0 z-30 bg-black/70 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {branding.logo_url ? <img src={branding.logo_url} alt="" className="w-9 h-9 rounded-full ring-1 ring-[#d4af37]/40" /> : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ebd281] to-[#997a15] grid place-items-center text-black font-display text-xs">SC</div>}
          <div>
            <div className="font-display text-sm">{branding.company_name}</div>
            <div className="text-[9px] uppercase tracking-[0.25em] text-white/40">Wholesale Catalogue</div>
          </div>
        </div>
        <button onClick={handleShare} className="rounded-full glass px-4 py-2 text-[11px] uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2"><Share2 className="w-3.5 h-3.5" />Share</button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Hero image carousel */}
        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden glass">
          {images[imgIdx] ? (
            <img src={images[imgIdx]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-white/40">No image</div>
          )}
          {images.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center hover:bg-black/80"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setImgIdx(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center hover:bg-black/80"><ChevronRight className="w-4 h-4" /></button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIdx ? "bg-[#d4af37]" : "bg-white/30"}`} />)}
              </div>
            </>
          )}
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">{product.sr_number} · {product.category}</div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">{product.title}</h1>
          <p className="text-sm text-white/65 leading-relaxed">{product.description || "Premium handcrafted from SC Aura Kurtis."}</p>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl gold-text">{formatRupee(product.price)}</span>
            <span className="text-xs text-white/40">/ piece · wholesale</span>
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Available sizes ({product.size_preset})</div>
            <div className="flex flex-wrap gap-2">
              {product.available_sizes.length === 0 && <span className="text-sm text-amber-300">Currently out of stock</span>}
              {product.available_sizes.map(s => (
                <span key={s} className="px-3 py-1.5 rounded-full bg-[#d4af37]/15 text-[#ebd281] border border-[#d4af37]/30 text-xs uppercase tracking-[0.15em]">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sticky bottom-3 z-20">
          {wa && (
            <button onClick={openWhatsAppEnquiry} className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-medium py-3 inline-flex items-center justify-center gap-2 text-sm uppercase tracking-[0.18em] shadow-[0_10px_30px_rgba(16,185,129,0.3)]">
              <MessageCircle className="w-4 h-4" /> Enquire on WhatsApp
            </button>
          )}
          <button onClick={handleShare} className="btn-gold rounded-full py-3 text-sm uppercase tracking-[0.18em] inline-flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" /> Share This Piece
          </button>
        </div>

        {/* Brand footer card */}
        <div className="glass rounded-2xl p-5 text-sm text-white/70">
          <div className="font-display text-lg text-white mb-1">{branding.company_name}</div>
          {branding.address && <div className="text-xs text-white/60">{branding.address}</div>}
          <div className="text-xs text-white/60 flex flex-wrap gap-3 mt-2">
            {branding.phone && <span>{branding.phone}</span>}
            {branding.whatsapp && <span>WA: {branding.whatsapp}</span>}
            {branding.gst && <span>GST: {branding.gst}</span>}
          </div>
        </div>

        <div className="text-center text-[10px] uppercase tracking-[0.3em] text-white/30 py-4">
          Powered by <span className="gold-text font-medium">SC Aura ERP</span>
        </div>
      </main>
    </div>
  );
}
