import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";
import {
  Truck,
  ClipboardList,
  ArrowLeft,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Share2,
} from "lucide-react";
import ShareCatalogueButton from "../components/ShareCatalogueButton";
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

    api
      .get(`/products/${id}`)
      .then(async (r) => {
        if (!mounted) return;

        setP(r.data);

        // QR encodes ONLY the SCA product ID.
        const qr = await resolveProductQr(r.data);

        if (mounted) {
          setQrDataUrl(qr);
        }
      })
      .catch(() => {
        if (mounted) setP(null);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const images = useMemo(
    () => (p?.images?.length ? p.images : [null]),
    [p]
  );

  if (!p) {
    return (
      <div className="h-64 rounded-2xl shimmer" />
    );
  }

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto space-y-5 overflow-x-hidden">

      {/* BACK */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* MAIN PRODUCT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 min-w-0">

        {/* LEFT — IMAGES */}
        <div className="lg:col-span-3 space-y-4 min-w-0">

          <GlassCard className="p-3 sm:p-4 min-w-0 overflow-hidden">
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white/5 min-w-0">

              {images[imgIdx] ? (
                <img
                  src={images[imgIdx]}
                  alt={p.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-white/30">
                  No image
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setImgIdx(
                        (i) =>
                          (i - 1 + images.length) %
                          images.length
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center hover:bg-black/80"
                    data-testid="prod-img-prev"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setImgIdx(
                        (i) =>
                          (i + 1) % images.length
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center hover:bg-black/80"
                    data-testid="prod-img-next"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto scroll-hide max-w-full">
                {images.map((src, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border transition ${
                      imgIdx === i
                        ? "border-[var(--sca-primary)] ring-2 ring-[var(--sca-primary)]/25"
                        : "border-white/10"
                    }`}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 grid place-items-center text-white/30 text-xs">
                        —
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          {/* STOCK */}
          <GlassCard className="min-w-0 overflow-hidden">
            <SectionTitle
              overline="Stock by size"
              title="Inventory map"
            />

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 min-w-0">
              {Object.entries(
                p.stock_by_size || {}
              ).map(([s, q]) => (
                <div
                  key={s}
                  className="rounded-lg border border-white/10 p-3 text-center min-w-0"
                >
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    {s}
                  </div>

                  <div className="font-display text-xl mt-0.5 tabular-nums">
                    {q}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* RIGHT — DETAILS */}
        <div className="lg:col-span-2 space-y-4 min-w-0">

          <GlassCard className="min-w-0 overflow-hidden">

            {/* TITLE */}
            <div className="flex items-start justify-between gap-2 min-w-0">

              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono-receipt text-white/60 truncate">
                  {p.sr_number}
                </div>

                <h1 className="font-display text-2xl tracking-tight mt-1 truncate">
                  {p.title}
                </h1>
              </div>

              {p.last_shared_at && (
                <div className="shrink-0">
                  <Pill
                    tone="success"
                    data-testid="prod-shared-badge"
                  >
                    <Share2 className="w-2.5 h-2.5" />
                    Shared
                  </Pill>
                </div>
              )}
            </div>

            {/* DESCRIPTION */}
            {p.description && (
              <p className="text-sm text-white/65 mt-2 break-words">
                {p.description}
              </p>
            )}

            {/* PRODUCT TAGS */}
            <div className="flex flex-wrap gap-2 mt-3 min-w-0">
              <Pill tone="neutral">
                {p.category}
              </Pill>

              <Pill>
                {p.size_preset}
              </Pill>

              <Pill
                tone={
                  p.quantity <= 10
                    ? "danger"
                    : p.quantity <= 25
                    ? "warning"
                    : "success"
                }
              >
                {p.quantity} pcs
              </Pill>
            </div>

            {/* PRICE */}
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                Price
              </span>

              <span className="font-display text-2xl tabular-nums">
                ₹
                {Number(
                  p.price
                ).toLocaleString("en-IN")}
              </span>
            </div>

            {/* VENDOR */}
            {(user.role === "admin" ||
              user.role === "manager") &&
              (p.factory_name ||
                p.vendor_name) && (
                <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 min-w-0 overflow-hidden">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Vendor / Factory (internal)
                  </div>

                  <div className="text-sm mt-0.5 truncate">
                    {p.vendor_name ||
                      p.factory_name}
                  </div>
                </div>
              )}

            {/* BOOK + DISPATCH */}
            <div className="grid grid-cols-2 gap-2 mt-4 min-w-0">

              <Link
                to="/bookings/new"
                state={{
                  preselectProduct: p,
                }}
                data-testid="prod-book"
                className="min-w-0 overflow-hidden rounded-full glass px-2 sm:px-4 py-2.5 text-[10px] sm:text-xs uppercase tracking-[0.10em] sm:tracking-[0.18em] inline-flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-white/10 whitespace-nowrap"
              >
                <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Book
                </span>
              </Link>

              <Link
                to="/dispatch/new"
                state={{
                  preselectProduct: p,
                }}
                data-testid="prod-dispatch"
                className="min-w-0 overflow-hidden btn-primary rounded-full px-2 sm:px-4 py-2.5 text-[10px] sm:text-xs uppercase tracking-[0.10em] sm:tracking-[0.20em] inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
              >
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Dispatch
                </span>
              </Link>

            </div>

            {/* SHARE + EDIT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 min-w-0">

              <ShareCatalogueButton
                product={p}
                className="w-full min-w-0 justify-center"
                onShared={() =>
                  api
                    .get(`/products/${id}`)
                    .then((r) =>
                      setP(r.data)
                    )
                }
              />

              {(user.role === "admin" ||
                user.role === "manager") && (
                <Link
                  to={`/products/${p.id}/edit`}
                  data-testid="prod-edit"
                  className="min-w-0 overflow-hidden rounded-full glass px-2 sm:px-4 py-2.5 text-[10px] sm:text-xs uppercase tracking-[0.10em] sm:tracking-[0.18em] inline-flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-white/10 whitespace-nowrap"
                >
                  <Pencil className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Edit
                  </span>
                </Link>
              )}

            </div>
          </GlassCard>

          {/* QR CODE — PRINT BUTTON REMOVED */}
          {qrDataUrl && (
            <GlassCard className="min-w-0 overflow-hidden">

              <SectionTitle
                overline="Label"
                title="QR Code"
              />

              <div className="bg-white rounded-xl p-4 mx-auto max-w-[220px] shadow-inner">
                <img
                  src={qrDataUrl}
                  alt={`QR for ${p.sr_number}`}
                  className="w-full"
                />

                <div className="text-center mt-2 font-mono-receipt text-black">
                  <div className="text-xs font-semibold tracking-wider">
                    {p.sr_number}
                  </div>

                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/60 truncate">
                    {p.title}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-center text-white/45 mt-2">
                Encodes SCA product ID only
              </div>

            </GlassCard>
          )}

        </div>
      </div>
    </div>
  );
}
