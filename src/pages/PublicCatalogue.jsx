import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../lib/api";
import {
  shareCatalogue,
  formatRupee,
} from "../lib/share";
import {
  Share2,
  ShoppingBag,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  Smartphone,
} from "lucide-react";

export default function PublicCatalogue() {
  const { sr } = useParams();

  const [data, setData] =
    useState(null);

  const [err, setErr] =
    useState("");

  const [imgIdx, setImgIdx] =
    useState(0);

  const [showShareMenu, setShowShareMenu] =
    useState(false);

  const [sharing, setSharing] =
    useState(false);

  /* =====================================================
     LOAD PRODUCT
  ===================================================== */

  useEffect(() => {
    axios
      .get(
        `${API_BASE}/public/catalogue/${sr}`
      )
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {
        setErr(
          error.response?.data?.detail ||
            "Not found"
        );
      });
  }, [sr]);

  /* =====================================================
     STATES
  ===================================================== */

  if (err) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-white grid place-items-center px-6">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">
            Product not available
          </div>

          <div className="text-sm text-white/50">
            {err}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-white grid place-items-center">
        <div className="text-sm text-white/50">
          Loading…
        </div>
      </div>
    );
  }

  const {
    product,
    branding,
  } = data;

  /* =====================================================
     WHATSAPP NUMBER
  ===================================================== */

  const wa = (
    branding?.whatsapp ||
    branding?.phone ||
    ""
  ).replace(
    /[^\d+]/g,
    ""
  );

  /* =====================================================
     PRODUCT IMAGES
  ===================================================== */

  const images =
    product?.images?.length
      ? product.images
      : product?.image
        ? [product.image]
        : [null];

  /* =====================================================
     SHARE MENU OPEN
  ===================================================== */

  const handleShare = (
    e
  ) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (sharing) {
      return;
    }

    setShowShareMenu(true);
  };

  /* =====================================================
     ACTUAL SHARE
  ===================================================== */

  const handleShareDestination =
    async (
      destination
    ) => {
      if (sharing) {
        return;
      }

      setSharing(true);

      try {
        /*
         * Product details are passed
         * to share.js.
         *
         * IMPORTANT:
         * No public catalogue URL.
         */

        await shareCatalogue({
          product: {
            ...product,

            images,

            sr_number:
              product?.sr_number ||
              sr ||
              "",

            title:
              product?.title ||
              "",

            category:
              product?.category ||
              "",

            price:
              product?.price ||
              0,

            description:
              product?.description ||
              "",

            available_sizes:
              product?.available_sizes ||
              [],

            size_preset:
              product?.size_preset ||
              "",
          },

          phone: wa,

          destination,
        });

        setShowShareMenu(false);
      } catch (error) {
        console.error(
          "Catalogue sharing failed:",
          error
        );
      } finally {
        setSharing(false);
      }
    };

  /* =====================================================
     WHATSAPP ENQUIRY
  ===================================================== */

  const openWhatsAppEnquiry =
    () => {
      if (!wa) {
        return;
      }

      const text =
        `Hi, I am interested in *${product.title}* (${product.sr_number}). Please share more details.`;

      window.open(
        `https://wa.me/${wa}?text=${encodeURIComponent(
          text
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white">

      {/* =================================================
          TOP BRAND BAR
      ================================================= */}

      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 min-w-0">

            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={
                  branding?.company_name ||
                  "SC Aura Kurtis"
                }
                className="w-10 h-10 rounded-xl object-cover bg-white/5"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center font-semibold">
                SC
              </div>
            )}

            <div className="min-w-0">
              <div className="font-display text-lg truncate">
                {branding?.company_name ||
                  "SC Aura Kurtis"}
              </div>

              <div className="text-[9px] uppercase tracking-[0.28em] text-white/40">
                Wholesale Catalogue
              </div>
            </div>

          </div>

          {/* TOP SHARE BUTTON */}

          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="rounded-full glass px-4 py-2 text-xs uppercase tracking-[0.15em] inline-flex items-center gap-2 hover:bg-white/10 transition disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />

            {sharing
              ? "Preparing..."
              : "Share"}
          </button>

        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* =================================================
            HERO IMAGE CAROUSEL
        ================================================= */}

        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden glass">

          {images[imgIdx] ? (
            <img
              src={images[imgIdx]}
              alt={
                product?.title ||
                "Product"
              }
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-white/40">
              No image
            </div>
          )}

          {/* PREVIOUS */}

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setImgIdx(
                    (i) =>
                      (i -
                        1 +
                        images.length) %
                      images.length
                  )
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center hover:bg-black/80"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* NEXT */}

              <button
                type="button"
                onClick={() =>
                  setImgIdx(
                    (i) =>
                      (i +
                        1) %
                      images.length
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center hover:bg-black/80"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* DOTS */}

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map(
                  (_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        i === imgIdx
                          ? "bg-[#d4af37]"
                          : "bg-white/30"
                      }`}
                    />
                  )
                )}
              </div>
            </>
          )}
        </div>

        {/* =================================================
            DETAILS
        ================================================= */}

        <div className="space-y-3">

          <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">
            {product?.sr_number ||
              sr}{" "}
            ·{" "}
            {product?.category ||
              "Product"}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">
            {product?.title}
          </h1>

          <p className="text-sm text-white/65 leading-relaxed">
            {product?.description ||
              "Premium handcrafted from SC Aura Kurtis."}
          </p>

          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl gold-text">
              {formatRupee(
                product?.price
              )}
            </span>

            <span className="text-xs text-white/40">
              / piece · wholesale
            </span>
          </div>

          {/* SIZES */}

          <div className="glass rounded-2xl p-4">

            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
              Available sizes{" "}
              {product?.size_preset
                ? `(${product.size_preset})`
                : ""}
            </div>

            <div className="flex flex-wrap gap-2">

              {!product?.available_sizes
                ?.length && (
                <span className="text-sm text-amber-300">
                  Currently out of stock
                </span>
              )}

              {(
                product?.available_sizes ||
                []
              ).map(
                (size) => (
                  <span
                    key={size}
                    className="px-3 py-1.5 rounded-full bg-[#d4af37]/15 text-[#ebd281] border border-[#d4af37]/30 text-xs uppercase tracking-[0.15em]"
                  >
                    {size}
                  </span>
                )
              )}

            </div>
          </div>

        </div>

        {/* =================================================
            CTA BUTTONS
        ================================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sticky bottom-3 z-20">

          {wa && (
            <button
              type="button"
              onClick={
                openWhatsAppEnquiry
              }
              className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-medium py-3 inline-flex items-center justify-center gap-2 text-sm uppercase tracking-[0.18em] shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
            >
              <MessageCircle className="w-4 h-4" />

              Enquire on WhatsApp
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="btn-gold rounded-full py-3 text-sm uppercase tracking-[0.18em] inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />

            {sharing
              ? "Preparing..."
              : "Share This Piece"}
          </button>

        </div>

        {/* =================================================
            BRAND FOOTER
        ================================================= */}

        <div className="glass rounded-2xl p-5 text-sm text-white/70">

          <div className="font-display text-lg text-white mb-1">
            {branding?.company_name}
          </div>

          {branding?.address && (
            <div className="text-xs text-white/60">
              {branding.address}
            </div>
          )}

          <div className="text-xs text-white/60 flex flex-wrap gap-3 mt-2">

            {branding?.phone && (
              <span>
                {branding.phone}
              </span>
            )}

            {branding?.whatsapp && (
              <span>
                WA:{" "}
                {branding.whatsapp}
              </span>
            )}

            {branding?.gst && (
              <span>
                GST:{" "}
                {branding.gst}
              </span>
            )}

          </div>
        </div>

        {/* =================================================
            POWERED BY
        ================================================= */}

        <div className="text-center text-[10px] uppercase tracking-[0.3em] text-white/30 py-4">
          Powered by{" "}
          <span className="gold-text font-medium">
            SC Aura ERP
          </span>
        </div>

      </main>

      {/* ===================================================
          SHARE DESTINATION MODAL
      =================================================== */}

      {showShareMenu && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() =>
            !sharing &&
            setShowShareMenu(false)
          }
        >

          <div
            className="w-full max-w-sm glass rounded-3xl p-5 shadow-2xl border border-white/10"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="flex items-center justify-between mb-5">

              <div>
                <div className="font-display text-xl text-white">
                  Share Product
                </div>

                <div className="text-xs text-white/40 mt-1">
                  Where do you want to share it?
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowShareMenu(
                    false
                  )
                }
                disabled={sharing}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            {/* WHATSAPP */}

            <button
              type="button"
              onClick={() =>
                handleShareDestination(
                  "whatsapp"
                )
              }
              disabled={sharing}
              className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black py-4 px-4 flex items-center gap-4 transition disabled:opacity-50"
            >

              <div className="w-11 h-11 rounded-full bg-black/10 grid place-items-center">
                <MessageCircle className="w-5 h-5" />
              </div>

              <div className="text-left">
                <div className="font-medium">
                  WhatsApp
                </div>

                <div className="text-xs opacity-70 mt-0.5">
                  Share product images & details
                </div>
              </div>

            </button>

            {/* OTHER */}

            <button
              type="button"
              onClick={() =>
                handleShareDestination(
                  "other"
                )
              }
              disabled={sharing}
              className="w-full mt-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 px-4 flex items-center gap-4 transition disabled:opacity-50"
            >

              <div className="w-11 h-11 rounded-full bg-white/10 grid place-items-center">
                <Share2 className="w-5 h-5" />
              </div>

              <div className="text-left">
                <div className="font-medium">
                  Other
                </div>

                <div className="text-xs text-white/45 mt-0.5">
                  Use your device's share options
                </div>
              </div>

            </button>

            {/* PRODUCT PREVIEW */}

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">

              {images[0] ? (
                <img
                  src={images[0]}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/5" />
              )}

              <div className="min-w-0">

                <div className="text-sm text-white truncate">
                  {product?.title}
                </div>

                <div className="text-[10px] uppercase tracking-[0.15em] text-[#ebd281] mt-1">
                  {product?.sr_number ||
                    sr}
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
