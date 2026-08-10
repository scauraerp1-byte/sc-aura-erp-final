import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import axios from "axios";

import {
  API_BASE,
} from "../lib/api";

import {
  prepareCatalogueShare,
  sharePreparedCatalogue,
  sharePreparedCatalogueDesktop,
  isMobileDevice,
  formatRupee,
} from "../lib/share";

import {
  Share2,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Smartphone,
} from "lucide-react";

export default function PublicCatalogue() {
  const { sr } =
    useParams();

  const [data, setData] =
    useState(null);

  const [err, setErr] =
    useState("");

  const [imgIdx, setImgIdx] =
    useState(0);

  const [prepared, setPrepared] =
    useState(null);

  const [shareStatus, setShareStatus] =
    useState("preparing");

  const [shareError, setShareError] =
    useState("");

  const [showShareMenu, setShowShareMenu] =
    useState(false);

  const [sharing, setSharing] =
    useState(false);

  /* =====================================================
     LOAD PRODUCT
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    axios
      .get(
        `${API_BASE}/public/catalogue/${sr}`
      )
      .then((response) => {
        if (
          !cancelled
        ) {
          setData(
            response.data
          );
        }
      })
      .catch((error) => {
        if (
          !cancelled
        ) {
          setErr(
            error.response?.data?.detail ||
              "Product not found"
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sr]);

  /* =====================================================
     PREPARE SHARE FILES
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    const prepare =
      async () => {
        if (
          !data?.product
        ) {
          return;
        }

        setShareStatus(
          "preparing"
        );

        setPrepared(null);

        setShareError("");

        try {
          const result =
            await prepareCatalogueShare({
              product:
                data.product,
            });

          if (
            cancelled
          ) {
            return;
          }

          setPrepared(
            result
          );

          setShareStatus(
            "ready"
          );
        } catch (error) {
          console.error(
            "Public catalogue share preparation failed:",
            error
          );

          if (
            cancelled
          ) {
            return;
          }

          setShareStatus(
            "error"
          );

          setShareError(
            error?.message ||
              "Unable to prepare catalogue."
          );
        }
      };

    prepare();

    return () => {
      cancelled = true;
    };
  }, [
    data?.product?.id,
    data?.product?.sr_number,
    data?.product?.title,
  ]);

  /* =====================================================
     LOADING / ERROR
  ===================================================== */

  if (err) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">
            Product not available
          </div>

          <div className="text-sm text-white/40">
            {err}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-white flex items-center justify-center">
        <div className="text-sm text-white/40">
          Loading…
        </div>
      </div>
    );
  }

  const {
    product,
    branding,
  } = data;

  const wa = (
    branding?.whatsapp ||
    branding?.phone ||
    ""
  ).replace(
    /[^\d+]/g,
    ""
  );

  const images =
    product?.images?.length
      ? product.images
      : product?.image
        ? [product.image]
        : [null];

  /* =====================================================
     RETRY
  ===================================================== */

  const retryShare =
    async () => {
      setShareStatus(
        "preparing"
      );

      setShareError("");

      try {
        const result =
          await prepareCatalogueShare({
            product,
          });

        setPrepared(
          result
        );

        setShareStatus(
          "ready"
        );
      } catch (error) {
        console.error(
          error
        );

        setShareStatus(
          "error"
        );

        setShareError(
          error?.message ||
            "Unable to prepare catalogue."
        );
      }
    };

  /* =====================================================
     SHARE BUTTON
  ===================================================== */

  const handleShare =
    async (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (sharing) {
        return;
      }

      if (
        shareStatus ===
        "preparing"
      ) {
        setShareError(
          "Catalogue is still preparing. Please wait a moment and tap again."
        );

        return;
      }

      if (
        shareStatus ===
        "error"
      ) {
        await retryShare();

        return;
      }

      if (!prepared) {
        return;
      }

      /* =================================================
         MOBILE
      ================================================= */

      if (
        isMobileDevice() &&
        typeof navigator !==
          "undefined" &&
        typeof navigator.share ===
          "function"
      ) {
        setSharing(true);

        try {
          await sharePreparedCatalogue({
            prepared,
          });
        } finally {
          setSharing(false);
        }

        return;
      }

      /* =================================================
         DESKTOP
      ================================================= */

      setShowShareMenu(
        true
      );
    };

  /* =====================================================
     DESKTOP DESTINATION
  ===================================================== */

  const desktopShare =
    async (
      destination
    ) => {
      if (
        !prepared ||
        sharing
      ) {
        return;
      }

      setSharing(true);

      try {
        await sharePreparedCatalogueDesktop({
          prepared,
          destination,
          phone: wa,
        });

        setShowShareMenu(
          false
        );
      } catch (error) {
        console.error(
          "Public catalogue share failed:",
          error
        );

        setShareError(
          "Unable to share catalogue."
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
     SHARE LABEL
  ===================================================== */

  let shareLabel =
    "Share This Piece";

  if (
    sharing
  ) {
    shareLabel =
      "Sharing...";
  } else if (
    shareStatus ===
    "preparing"
  ) {
    shareLabel =
      "Preparing...";
  } else if (
    shareStatus ===
    "error"
  ) {
    shareLabel =
      "Retry Share";
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white">

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 min-w-0">

            {branding?.logo_url ? (
              <img
                src={
                  branding.logo_url
                }
                alt={
                  branding.company_name ||
                  "SC Aura Kurtis"
                }
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center font-semibold">
                SC
              </div>
            )}

            <div className="min-w-0">
              <div className="font-display text-lg truncate">
                {branding.company_name ||
                  "SC Aura Kurtis"}
              </div>

              <div className="text-[9px] uppercase tracking-[0.28em] text-white/40">
                Wholesale Catalogue
              </div>
            </div>

          </div>

          {/* TOP SHARE */}

          <button
            type="button"
            onClick={
              handleShare
            }
            disabled={
              sharing
            }
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.15em] inline-flex items-center gap-2 transition ${
              shareStatus ===
              "ready"
                ? "bg-[#d4af37] text-black hover:bg-[#ebd281]"
                : "glass text-white/60"
            }`}
          >
            <Share2
              size={15}
            />

            {shareLabel}
          </button>

        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* HERO */}

        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden glass">

          {images[imgIdx] ? (
            <img
              src={
                images[imgIdx]
              }
              alt={
                product.title
              }
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-white/40">
              No image
            </div>
          )}

          {images.length >
            1 && (
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
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center"
              >
                <ChevronLeft
                  size={17}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  setImgIdx(
                    (i) =>
                      (i + 1) %
                      images.length
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center"
              >
                <ChevronRight
                  size={17}
                />
              </button>

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

        {/* DETAILS */}

        <div className="space-y-3">

          <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">
            {product.sr_number} ·{" "}
            {product.category}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl">
            {product.title}
          </h1>

          <p className="text-sm text-white/65 leading-relaxed">
            {product.description ||
              "Premium handcrafted from SC Aura Kurtis."}
          </p>

          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl gold-text">
              {formatRupee(
                product.price
              )}
            </span>

            <span className="text-xs text-white/40">
              / piece · wholesale
            </span>
          </div>

          {/* SIZES */}

          <div className="glass rounded-2xl p-4">

            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
              Available sizes
              {product.size_preset
                ? ` (${product.size_preset})`
                : ""}
            </div>

            <div className="flex flex-wrap gap-2">

              {!product.available_sizes
                ?.length && (
                <span className="text-sm text-amber-300">
                  Currently out of stock
                </span>
              )}

              {(
                product.available_sizes ||
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

        {/* CTA */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sticky bottom-3 z-20">

          {wa && (
            <button
              type="button"
              onClick={
                openWhatsAppEnquiry
              }
              className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-medium py-3 inline-flex items-center justify-center gap-2 text-sm uppercase tracking-[0.18em]"
            >
              <MessageCircle
                size={16}
              />

              Enquire on WhatsApp
            </button>
          )}

          <button
            type="button"
            onClick={
              handleShare
            }
            disabled={
              sharing
            }
            className={`rounded-full py-3 text-sm uppercase tracking-[0.18em] inline-flex items-center justify-center gap-2 transition ${
              shareStatus ===
              "ready"
                ? "btn-gold"
                : "glass text-white/60 border border-white/10"
            }`}
          >
            <Share2
              size={16}
            />

            {shareLabel}
          </button>

        </div>

        {/* ERROR */}

        {shareError && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 text-red-200 text-xs p-4">
            {shareError}
          </div>
        )}

        {/* FOOTER */}

        <div className="glass rounded-2xl p-5 text-sm text-white/70">

          <div className="font-display text-lg text-white mb-1">
            {branding.company_name}
          </div>

          {branding.address && (
            <div className="text-xs text-white/60">
              {branding.address}
            </div>
          )}

          <div className="text-xs text-white/60 flex flex-wrap gap-3 mt-2">

            {branding.phone && (
              <span>
                {branding.phone}
              </span>
            )}

            {branding.whatsapp && (
              <span>
                WA:{" "}
                {branding.whatsapp}
              </span>
            )}

            {branding.gst && (
              <span>
                GST:{" "}
                {branding.gst}
              </span>
            )}

          </div>

        </div>

        <div className="text-center text-[10px] uppercase tracking-[0.3em] text-white/30 py-4">
          Powered by{" "}
          <span className="gold-text font-medium">
            SC Aura ERP
          </span>
        </div>

      </main>

      {/* =================================================
          DESKTOP SHARE MENU
      ================================================= */}

      {showShareMenu && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() =>
            !sharing &&
            setShowShareMenu(
              false
            )
          }
        >
          <div
            className="w-full max-w-sm rounded-[28px] bg-[#11151f] border border-white/10 shadow-2xl p-5"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="flex items-center justify-between mb-5">

              <div>
                <div className="text-white text-lg font-semibold">
                  Share Catalogue
                </div>

                <div className="text-white/40 text-xs mt-1">
                  Choose where to share
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowShareMenu(
                    false
                  )
                }
                className="w-9 h-9 rounded-full bg-white/5 grid place-items-center"
              >
                <X
                  size={17}
                />
              </button>

            </div>

            {/* WHATSAPP */}

            <button
              type="button"
              onClick={() =>
                desktopShare(
                  "whatsapp"
                )
              }
              disabled={
                sharing
              }
              className="w-full rounded-2xl bg-[#25D366] text-black p-4 flex items-center gap-3 disabled:opacity-50"
            >
              <MessageCircle
                size={21}
              />

              <div className="text-left">
                <div className="font-semibold">
                  WhatsApp
                </div>

                <div className="text-[11px] opacity-60">
                  Share product catalogue
                </div>
              </div>
            </button>

            {/* OTHER */}

            <button
              type="button"
              onClick={() =>
                desktopShare(
                  "other"
                )
              }
              disabled={
                sharing
              }
              className="w-full mt-3 rounded-2xl bg-white/5 border border-white/10 text-white p-4 flex items-center gap-3 disabled:opacity-50"
            >
              <Smartphone
                size={21}
              />

              <div className="text-left">
                <div className="font-semibold">
                  Other
                </div>

                <div className="text-[11px] text-white/40">
                  Device sharing options
                </div>
              </div>
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
