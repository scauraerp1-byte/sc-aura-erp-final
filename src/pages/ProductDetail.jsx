import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";
import { Printer, Truck, ClipboardList, ArrowLeft, Pencil, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import ShareCatalogueButton from "../components/ShareCatalogueButton";
import { formatRupee } from "../lib/share";
import { resolveProductQr } from "../lib/qrGen";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    let mounted = true;
    api.get(`/products/${id}`).then(async (r) => {
      if (!mounted) return;
      setP(r.data);
      // Per project brief: QR encodes ONLY the SCA product ID.
      // We generate it client-side directly – no extra backend round-trip,
      // no CORS noise, still permanent + unique + one-QR-per-product.
      const qr = await resolveProductQr(r.data);
      if (mounted) setQrDataUrl(qr);
    }).catch(() => { if (mounted) setP(null); });
    return () => { mounted = false; };
  }, [id]);

  const images = useMemo(() => (p?.images?.length ? p.images : [null]), [p]);

  if (!p) return <div className="h-64 rounded-2xl shimmer" />;

  const openPrint = () => {
    if (!qrDataUrl) return;
    const win = window.open("", "_blank", "width=460,height=680");
    if (!win) { window.alert("Please allow pop-ups to print the QR label."); return; }
    win.document.write(`<!doctype html>
<html><head><title>${p.sr_number} — SC Aura Kurtis QR Label</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:16px;background:#fff;color:#111827}
  .label{width:280px;margin:0 auto;text-align:center;border:1.5px dashed #6b7280;border-radius:14px;padding:20px 18px}
  .brand{font-size:9.5px;letter-spacing:3.5px;text-transform:uppercase;color:#6b7280;margin-bottom:8px;font-weight:600}
  .qr img{width:200px;height:200px;display:block;margin:6px auto}
  .sr{font-family:"JetBrains Mono","Courier New",monospace;font-size:16px;font-weight:700;letter-spacing:1.5px;margin-top:8px}
  .title{font-size:13px;font-weight:600;margin-top:6px}
  .meta{font-size:11px;color:#6b7280;margin-top:4px}
  .price{font-size:20px;font-weight:800;color:#111827;margin-top:10px}
  @media print{body{padding:0}.label{border:none;padding:8px}button{display:none}}
  .actions{text-align:center;margin-top:16px}
  button{padding:9px 22px;border-radius:999px;background:#111827;color:#fff;border:0;cursor:pointer;letter-spacing:1.5px;font-size:11px;text-transform:uppercase;font-weight:600}
</style></head><body>
  <div class="label">
    <div class="brand">SC Aura Kurtis</div>
    <div class="qr"><img src="${qrDataUrl}" alt="qr" /></div>
    <div class="sr">${p.sr_number}</div>
    <div class="title">${(p.title||"").replace(/</g,"&lt;")}</div>
    <div class="meta">${p.category||""}${p.size_preset?" · "+p.size_preset:""}</div>
    <div class="price">${formatRupee(p.price||0)}</div>
  </div>
  <div class="actions"><button onclick="window.print()">Print</button></div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-4">
          <GlassCard className="p-3 sm:p-4">
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white/5">
              {images[imgIdx]
                ? <img src={images[imgIdx]} alt={p.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full grid place-items-center text-white/30">No image</div>}
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center hover:bg-black/80"
                    data-testid="prod-img-prev" aria-label="Previous image">
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <button onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center hover:bg-black/80"
                    data-testid="prod-img-next" aria-label="Next image">
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto scroll-hide">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border transition ${imgIdx === i ? "border-[var(--sca-primary)] ring-2 ring-[var(--sca-primary)]/25" : "border-white/10"}`}>
                    {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/5 grid place-items-center text-white/30 text-xs">—</div>}
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <SectionTitle overline="Stock by size" title="Inventory map" />
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Object.entries(p.stock_by_size || {}).map(([s, q]) => (
                <div key={s} className="rounded-lg border border-white/10 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{s}</div>
                  <div className="font-display text-xl mt-0.5 tabular-nums">{q}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <GlassCard>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-mono-receipt text-white/60">{p.sr_number}</div>
                <h1 className="font-display text-2xl tracking-tight mt-1 truncate">{p.title}</h1>
              </div>
              {p.last_shared_at && <Pill tone="success" data-testid="prod-shared-badge"><Share2 className="w-2.5 h-2.5" /> Shared</Pill>}
            </div>
            {p.description && <p className="text-sm text-white/65 mt-2">{p.description}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              <Pill tone="neutral">{p.category}</Pill>
              <Pill>{p.size_preset}</Pill>
              <Pill tone={p.quantity <= 10 ? "danger" : p.quantity <= 25 ? "warning" : "success"}>{p.quantity} pcs</Pill>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">Price</span>
              <span className="font-display text-2xl tabular-nums">₹{Number(p.price).toLocaleString("en-IN")}</span>
            </div>
            {(user.role === "admin" || user.role === "manager") && (p.factory_name || p.vendor_name) && (
              <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Vendor / Factory (internal)</div>
                <div className="text-sm mt-0.5">{p.vendor_name || p.factory_name}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link to="/bookings/new" state={{ preselectProduct: p }} data-testid="prod-book"
                className="rounded-full glass px-4 py-2.5 text-xs uppercase tracking-[0.18em] inline-flex items-center justify-center gap-2 hover:bg-white/10">
                <ClipboardList className="w-3.5 h-3.5" /> Book
              </Link>
              <Link to="/dispatch/new" state={{ preselectProduct: p }} data-testid="prod-dispatch"
                className="btn-primary rounded-full px-4 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2">
                <Truck className="w-3.5 h-3.5" /> Dispatch
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ShareCatalogueButton product={p} className="w-full justify-center" onShared={() => api.get(`/products/${id}`).then((r) => setP(r.data))} />
              {(user.role === "admin" || user.role === "manager") && (
                <Link to={`/products/${p.id}/edit`} data-testid="prod-edit"
                  className="rounded-full glass px-4 py-2.5 text-xs uppercase tracking-[0.18em] inline-flex items-center justify-center gap-2 hover:bg-white/10">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Link>
              )}
            </div>
          </GlassCard>

          {qrDataUrl && (
            <GlassCard>
              <SectionTitle
                overline="Label"
                title="QR Code"
                action={
                  <button onClick={openPrint} data-testid="prod-qr-print" className="text-xs inline-flex items-center gap-1 hover:opacity-80">
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                }
              />
              <div className="bg-white rounded-xl p-4 mx-auto max-w-[220px] shadow-inner">
                <img src={qrDataUrl} alt={`QR for ${p.sr_number}`} className="w-full" />
                <div className="text-center mt-2 font-mono-receipt text-black">
                  <div className="text-xs font-semibold tracking-wider">{p.sr_number}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/60 truncate">{p.title}</div>
                </div>
              </div>
              <div className="text-[10px] text-center text-white/45 mt-2">Encodes SCA product ID only</div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
