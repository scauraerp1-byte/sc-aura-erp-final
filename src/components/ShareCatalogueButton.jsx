import {
  useEffect,
  useState,
} from "react";

import {
  Share2,
} from "lucide-react";

import {
  prepareCatalogueShare,
  sharePreparedCatalogue,
  sharePreparedCatalogueDesktop,
} from "../lib/share";

import api from "../lib/api";

/* =========================================================
   MOBILE DETECTION
========================================================= */

function isMobileDevice() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return false;
  }

  const ua =
    navigator.userAgent ||
    "";

  return /android|iphone|ipad|ipod|mobile/i.test(
    ua
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ShareCatalogueButton({
  product,
  phone,
  variant = "default",
  className = "",
  onShared,
}) {
  const [busy, setBusy] =
    useState(false);

  const [prepared, setPrepared] =
    useState(null);

  const [prepareError, setPrepareError] =
    useState("");

  const [showMenu, setShowMenu] =
    useState(false);

  /* =====================================================
     PREPARE IMAGE BEFORE USER CLICKS
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      setPrepareError("");

      try {
        const result =
          await prepareCatalogueShare({
            product,
          });

        if (!cancelled) {
          setPrepared(
            result
          );
        }
      } catch (error) {
        console.error(
          "Catalogue preparation failed:",
          error
        );

        if (!cancelled) {
          setPrepareError(
            error?.message ||
              "Unable to prepare catalogue."
          );
        }
      }
    }

    if (product) {
      prepare();
    }

    return () => {
      cancelled = true;
    };
  }, [
    product?.id,
    product?.sr_number,
    product?.image,
    product?.image_url,
    product?.imageUrl,
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
        // Don't break share flow.
      }
    };

  /* =====================================================
     MOBILE DIRECT SHARE
  ===================================================== */

  const handleMobileShare =
    async () => {
      if (
        !prepared ||
        !prepared.files?.length
      ) {
        return;
      }

      /*
       * IMPORTANT:
       *
       * NO await before this call.
       *
       * Native share is invoked
       * directly from the click event.
       */
      const shared =
        await sharePreparedCatalogue({
          prepared,
        });

      if (shared) {
        await markShared();
      }
    };

  /* =====================================================
     DESKTOP SHARE MENU
  ===================================================== */

  const openDesktopMenu =
    (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (
        busy ||
        !prepared
      ) {
        return;
      }

      setShowMenu(true);
    };

  /* =====================================================
     MAIN BUTTON
  ===================================================== */

  const onShare =
    async (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (
        busy ||
        !prepared
      ) {
        return;
      }

      /*
       * MOBILE:
       *
       * Direct native share.
       */
      if (
        isMobileDevice() &&
        typeof navigator !==
          "undefined" &&
        typeof navigator.share ===
          "function"
      ) {
        setBusy(true);

        try {
          await handleMobileShare();
        } finally {
          setBusy(false);
        }

        return;
      }

      /*
       * DESKTOP:
       * Custom chooser.
       */
      openDesktopMenu(e);
    };

  /* =====================================================
     DESKTOP DESTINATION
  ===================================================== */

  const shareTo =
    async (
      destination
    ) => {
      if (
        busy ||
        !prepared
      ) {
        return;
      }

      setBusy(true);

      try {
        const shared =
          await sharePreparedCatalogueDesktop({
            prepared,
            destination,
            phone:
              phone || "",
          });

        setShowMenu(false);

        if (shared) {
          await markShared();
        }
      } catch (error) {
        console.error(
          "Catalogue sharing failed:",
          error
        );
      } finally {
        setBusy(false);
      }
    };

  /* =====================================================
     BUTTON TEXT
  ===================================================== */

  const buttonText =
    busy
      ? "Sharing..."
      : !prepared
        ? "Preparing..."
        : "Share Catalogue";

  /* =====================================================
     ICON
  ===================================================== */

  if (
    variant === "icon"
  ) {
    return (
      <>
        <button
          type="button"
          onClick={onShare}
          disabled={
            busy ||
            !prepared
          }
          data-testid={`share-catalogue-${product?.sr_number || product?.id}`}
          className={`w-8 h-8 rounded-full glass hover:bg-white/15 grid place-items-center transition ${
            busy ||
            !prepared
              ? "opacity-50 cursor-not-allowed"
              : ""
          } ${className}`}
          title={
            !prepared
              ? "Preparing catalogue..."
              : "Share catalogue"
          }
        >
          <Share2
            size={15}
          />
        </button>

        {!isMobileDevice() &&
          showMenu && (
            <DesktopShareMenu
              product={product}
              busy={busy}
              onClose={() =>
                !busy &&
                setShowMenu(false)
              }
              onSelect={
                shareTo
              }
            />
          )}
      </>
    );
  }

  /* =====================================================
     DEFAULT
  ===================================================== */

  return (
    <>
      <button
        type="button"
        onClick={onShare}
        disabled={
          busy ||
          !prepared
        }
        data-testid={`share-catalogue-${product?.sr_number || product?.id}`}
        className={`rounded-full glass px-4 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center justify-center gap-2 transition ${
          busy ||
          !prepared
            ? "opacity-50 cursor-not-allowed"
            : ""
        } ${className}`}
        title={
          prepareError ||
          ""
        }
      >
        <Share2
          size={14}
        />

        {buttonText}
      </button>

      {!isMobileDevice() &&
        showMenu && (
          <DesktopShareMenu
            product={product}
            busy={busy}
            onClose={() =>
              !busy &&
              setShowMenu(false)
            }
            onSelect={
              shareTo
            }
          />
        )}
    </>
  );
}

/* =========================================================
   DESKTOP SHARE MENU
========================================================= */

function DesktopShareMenu({
  product,
  busy,
  onClose,
  onSelect,
}) {
  const image =
    product?.image ||
    product?.image_url ||
    product?.imageUrl ||
    product?.product_image ||
    product?.productImage ||
    product?.photo ||
    product?.photo_url ||
    product?.thumbnail ||
    product?.thumbnail_url;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={() =>
        !busy &&
        onClose()
      }
    >
      <div
        className="w-full max-w-sm rounded-3xl glass border border-white/10 p-5 shadow-2xl"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-display text-xl text-white">
              Share Catalogue
            </div>

            <div className="text-xs text-white/40 mt-1">
              Where do you want to share it?
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center text-white text-lg"
          >
            ×
          </button>
        </div>

        {/* WHATSAPP */}

        <button
          type="button"
          onClick={() =>
            onSelect(
              "whatsapp"
            )
          }
          disabled={busy}
          className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black p-4 flex items-center gap-4 transition disabled:opacity-50"
        >
          <div className="w-11 h-11 rounded-full bg-black/10 grid place-items-center text-xl">
            💬
          </div>

          <div className="text-left">
            <div className="font-semibold">
              WhatsApp
            </div>

            <div className="text-xs opacity-70 mt-1">
              Share product image & details
            </div>
          </div>
        </button>

        {/* OTHER */}

        <button
          type="button"
          onClick={() =>
            onSelect(
              "other"
            )
          }
          disabled={busy}
          className="w-full mt-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white p-4 flex items-center gap-4 transition disabled:opacity-50"
        >
          <div className="w-11 h-11 rounded-full bg-white/10 grid place-items-center">
            <Share2
              size={20}
            />
          </div>

          <div className="text-left">
            <div className="font-semibold">
              Other
            </div>

            <div className="text-xs text-white/40 mt-1">
              Use device share options
            </div>
          </div>
        </button>

        {/* PRODUCT PREVIEW */}

        <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-3">
          {image ? (
            <img
              src={image}
              alt=""
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/5" />
          )}

          <div className="min-w-0">
            <div className="text-sm text-white truncate">
              {product?.title ||
                "Product"}
            </div>

            <div className="text-[10px] uppercase tracking-[0.15em] text-[#ebd281] mt-1">
              {product?.sr_number ||
                ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
