import {
  useEffect,
  useState,
} from "react";

import {
  Share2,
  MessageCircle,
  X,
  Smartphone,
} from "lucide-react";

import {
  prepareCatalogueShare,
  sharePreparedCatalogue,
  sharePreparedCatalogueDesktop,
  isMobileDevice,
} from "../lib/share";

import api from "../lib/api";

export default function ShareCatalogueButton({
  product,
  phone,
  variant = "default",
  className = "",
  onShared,
}) {
  const [prepared, setPrepared] =
    useState(null);

  const [status, setStatus] =
    useState("preparing");

  const [showMenu, setShowMenu] =
    useState(false);

  const [sharing, setSharing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =====================================================
     PREPARE IN BACKGROUND
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    setPrepared(null);
    setStatus("preparing");
    setError("");

    const prepare = async () => {
      try {
        const result =
          await prepareCatalogueShare({
            product,
          });

        if (
          cancelled
        ) {
          return;
        }

        setPrepared(
          result
        );

        setStatus(
          "ready"
        );
      } catch (err) {
        console.error(
          "Catalogue preparation failed:",
          err
        );

        if (
          cancelled
        ) {
          return;
        }

        setStatus(
          "error"
        );

        setError(
          err?.message ||
            "Unable to prepare catalogue."
        );
      }
    };

    if (product) {
      prepare();
    }

    return () => {
      cancelled = true;
    };
  }, [
    product?.id,
    product?.sr_number,
    product?.title,
  ]);

  /* =====================================================
     MARK SHARED
  ===================================================== */

  const markShared =
    async () => {
      try {
        await api.post(
          `/products/${product.id}/mark-shared`
        );

        onShared?.();
      } catch {
        // Sharing already succeeded.
      }
    };

  /* =====================================================
     RETRY
  ===================================================== */

  const retryPrepare =
    async (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (sharing) {
        return;
      }

      setStatus(
        "preparing"
      );

      setError("");

      try {
        const result =
          await prepareCatalogueShare({
            product,
          });

        setPrepared(
          result
        );

        setStatus(
          "ready"
        );
      } catch (err) {
        console.error(
          err
        );

        setStatus(
          "error"
        );

        setError(
          err?.message ||
            "Unable to prepare catalogue."
        );
      }
    };

  /* =====================================================
     SHARE
  ===================================================== */

  const onShare =
    async (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (sharing) {
        return;
      }

      /*
       * If preparation is still happening,
       * don't silently do nothing.
       */
      if (
        status ===
        "preparing"
      ) {
        setError(
          "Catalogue is still preparing. Please tap again in a moment."
        );

        return;
      }

      /*
       * If preparation failed.
       */
      if (
        status ===
        "error"
      ) {
        await retryPrepare(
          e
        );

        return;
      }

      if (
        !prepared
      ) {
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
          const shared =
            await sharePreparedCatalogue({
              prepared,
            });

          if (shared) {
            await markShared();
          }
        } finally {
          setSharing(false);
        }

        return;
      }

      /* =================================================
         DESKTOP
      ================================================= */

      setShowMenu(
        true
      );
    };

  /* =====================================================
     DESKTOP SHARE
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
        const result =
          await sharePreparedCatalogueDesktop({
            prepared,
            destination,
            phone:
              phone || "",
          });

        if (result) {
          await markShared();
        }

        setShowMenu(
          false
        );
      } catch (err) {
        console.error(
          "Share failed:",
          err
        );

        setError(
          "Unable to share catalogue."
        );
      } finally {
        setSharing(false);
      }
    };

  /* =====================================================
     BUTTON STATE
  ===================================================== */

  const disabled =
    sharing;

  let label =
    "Share Catalogue";

  if (
    sharing
  ) {
    label =
      "Sharing...";
  } else if (
    status ===
    "preparing"
  ) {
    label =
      "Preparing...";
  } else if (
    status ===
    "error"
  ) {
    label =
      "Retry Share";
  }

  /* =====================================================
     ICON VARIANT
  ===================================================== */

  if (
    variant ===
    "icon"
  ) {
    return (
      <>
        <button
          type="button"
          onClick={
            onShare
          }
          disabled={
            disabled
          }
          title={
            status ===
            "error"
              ? error
              : "Share Catalogue"
          }
          className={`w-9 h-9 rounded-full glass border border-white/10 hover:bg-white/10 grid place-items-center transition ${
            disabled
              ? "opacity-50"
              : ""
          } ${className}`}
        >
          <Share2
            size={16}
          />
        </button>

        {!isMobileDevice() &&
          showMenu && (
            <ShareMenu
              product={
                product
              }
              onClose={() =>
                !sharing &&
                setShowMenu(
                  false
                )
              }
              onWhatsApp={() =>
                desktopShare(
                  "whatsapp"
                )
              }
              onOther={() =>
                desktopShare(
                  "other"
                )
              }
              sharing={
                sharing
              }
            />
          )}
      </>
    );
  }

  /* =====================================================
     DEFAULT BUTTON
  ===================================================== */

  return (
    <>
      <button
        type="button"
        onClick={
          onShare
        }
        disabled={
          disabled
        }
        className={`group relative overflow-hidden rounded-full px-5 py-3 inline-flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.16em] transition-all duration-200 ${
          status ===
          "ready"
            ? "bg-[#d4af37] text-black hover:bg-[#ebd281] shadow-[0_8px_25px_rgba(212,175,55,0.18)]"
            : "glass text-white/70 border border-white/10"
        } ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : ""
        } ${className}`}
      >
        <Share2
          size={15}
          className={
            status ===
            "preparing"
              ? "animate-pulse"
              : ""
          }
        />

        <span>
          {label}
        </span>
      </button>

      {error &&
        status ===
          "error" && (
          <div className="mt-2 text-[10px] text-red-300 max-w-xs">
            {error}
          </div>
        )}

      {!isMobileDevice() &&
        showMenu && (
          <ShareMenu
            product={
              product
            }
            onClose={() =>
              !sharing &&
              setShowMenu(
                false
              )
            }
            onWhatsApp={() =>
              desktopShare(
                "whatsapp"
              )
            }
            onOther={() =>
              desktopShare(
                "other"
              )
            }
            sharing={
              sharing
            }
          />
        )}
    </>
  );
}

/* =========================================================
   DESKTOP SHARE MENU
========================================================= */

function ShareMenu({
  product,
  onClose,
  onWhatsApp,
  onOther,
  sharing,
}) {
  const image =
    product?.images?.[0] ||
    product?.image ||
    product?.image_url ||
    product?.imageUrl ||
    null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() =>
        !sharing &&
        onClose()
      }
    >
      <div
        className="w-full max-w-sm rounded-[28px] bg-[#11151f] border border-white/10 shadow-2xl p-5"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {/* Header */}

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
            onClick={
              onClose
            }
            disabled={
              sharing
            }
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center"
          >
            <X
              size={17}
            />
          </button>
        </div>

        {/* Product preview */}

        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/5 p-3 mb-4">
          {image ? (
            <img
              src={image}
              alt=""
              className="w-14 h-14 rounded-xl object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white/5" />
          )}

          <div className="min-w-0">
            <div className="text-sm text-white truncate">
              {product?.title ||
                "Product"}
            </div>

            <div className="text-[10px] text-[#ebd281] uppercase tracking-[0.18em] mt-1">
              {product?.sr_number ||
                ""}
            </div>
          </div>
        </div>

        {/* WhatsApp */}

        <button
          type="button"
          onClick={
            onWhatsApp
          }
          disabled={
            sharing
          }
          className="w-full rounded-2xl bg-[#25D366] text-black p-4 flex items-center gap-3 hover:brightness-105 transition disabled:opacity-50"
        >
          <MessageCircle
            size={21}
          />

          <div className="text-left">
            <div className="font-semibold">
              WhatsApp
            </div>

            <div className="text-[11px] opacity-60 mt-0.5">
              Share product catalogue
            </div>
          </div>
        </button>

        {/* Other */}

        <button
          type="button"
          onClick={
            onOther
          }
          disabled={
            sharing
          }
          className="w-full mt-3 rounded-2xl bg-white/5 border border-white/10 text-white p-4 flex items-center gap-3 hover:bg-white/10 transition disabled:opacity-50"
        >
          <Smartphone
            size={21}
          />

          <div className="text-left">
            <div className="font-semibold">
              Other
            </div>

            <div className="text-[11px] text-white/40 mt-0.5">
              Device sharing options
            </div>
          </div>
        </button>

        <div className="text-center text-[9px] text-white/25 uppercase tracking-[0.18em] mt-5">
          Image + SCA code + product details
        </div>
      </div>
    </div>
  );
}
