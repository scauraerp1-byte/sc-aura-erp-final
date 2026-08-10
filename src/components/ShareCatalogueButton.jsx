import { useState } from "react";
import { Share2 } from "lucide-react";
import {
  shareCatalogue,
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
    navigator.vendor ||
    window.opera ||
    "";

  return /android|iphone|ipad|ipod|mobile/i.test(
    ua
  );
}

/* =========================================================
   SHARE CATALOGUE BUTTON
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

  const [showMenu, setShowMenu] =
    useState(false);

  /* =====================================================
     MARK PRODUCT AS SHARED
  ===================================================== */

  const markShared =
    async () => {
      try {
        await api.post(
          `/products/${product.id}/mark-shared`
        );

        onShared?.();
      } catch {
        /*
         * Sharing already happened.
         * Don't break UI.
         */
      }
    };

  /* =====================================================
     PREPARE PRODUCT
  ===================================================== */

  const getCatalogueProduct =
    () => {
      const sizes =
        product?.size_preset ||
        (
          product?.available_sizes ||
          []
        ).join(", ");

      const image =
        product?.image ||
        product?.image_url ||
        product?.imageUrl ||
        product?.product_image ||
        product?.productImage ||
        product?.photo ||
        product?.photo_url ||
        product?.thumbnail ||
        product?.thumbnail_url ||
        null;

      return {
        ...product,

        image,

        sr_number:
          product?.sr_number ||
          "",

        title:
          product?.title ||
          "",

        category:
          product?.category ||
          "",

        size_preset:
          sizes,

        price:
          product?.price ||
          0,

        description:
          product?.description ||
          "",

        available_sizes:
          product?.available_sizes ||
          [],
      };
    };

  /* =====================================================
     MOBILE DIRECT SHARE
  ===================================================== */

  const shareMobile =
    async () => {
      if (busy) {
        return;
      }

      setBusy(true);

      try {
        const catalogueProduct =
          getCatalogueProduct();

        const shared =
          await shareCatalogue({
            product:
              catalogueProduct,

            phone:
              phone || "",

            destination:
              "mobile",
          });

        if (shared) {
          await markShared();
        }
      } catch (error) {
        console.error(
          "Mobile catalogue sharing failed:",
          error
        );
      } finally {
        setBusy(false);
      }
    };

  /* =====================================================
     DESKTOP MENU
  ===================================================== */

  const openMenu =
    (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (busy) {
        return;
      }

      setShowMenu(true);
    };

  /* =====================================================
     SHARE DESTINATION
  ===================================================== */

  const shareTo =
    async (
      destination
    ) => {
      if (busy) {
        return;
      }

      setBusy(true);

      try {
        const catalogueProduct =
          getCatalogueProduct();

        const shared =
          await shareCatalogue({
            product:
              catalogueProduct,

            phone:
              phone || "",

            destination,
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
     MAIN CLICK
  ===================================================== */

  const onShare =
    async (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (busy) {
        return;
      }

      /*
       * MOBILE:
       *
       * NO CUSTOM POPUP.
       *
       * Directly call native
       * Android / iPhone share.
       */
      if (
        isMobileDevice() &&
        typeof navigator !==
          "undefined" &&
        typeof navigator.share ===
          "function"
      ) {
        await shareMobile();
        return;
      }

      /*
       * DESKTOP:
       * show our chooser.
       */
      openMenu(e);
    };

  /* =====================================================
     ICON VARIANT
  ===================================================== */

  if (
    variant === "icon"
  ) {
    return (
      <>
        <button
          type="button"
          onClick={onShare}
          disabled={busy}
          data-testid={`share-catalogue-${product?.sr_number || product?.id}`}
          className={`w-8 h-8 rounded-full glass hover:bg-white/15 grid place-items-center transition ${
            busy
              ? "opacity-50 cursor-not-allowed"
              : ""
          } ${className}`}
          title={
            busy
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
            <ShareMenu
              busy={busy}
              product={product}
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
     DEFAULT BUTTON
  ===================================================== */

  return (
    <>
      <button
        type="button"
        onClick={onShare}
        disabled={busy}
        data-testid={`share-catalogue-${product?.sr_number || product?.id}`}
        className={`rounded-full glass px-4 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center justify-center gap-2 transition ${
          busy
            ? "opacity-50 cursor-not-allowed"
            : ""
        } ${className}`}
      >
        <Share2
          size={14}
        />

        {busy
          ? "Preparing..."
          : "Share Catalogue"}
      </button>

      {!isMobileDevice() &&
        showMenu && (
          <ShareMenu
            busy={busy}
            product={product}
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

function ShareMenu({
  busy,
  product,
  onClose,
  onSelect,
}) {
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
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center text-white"
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
          <div className="w-11 h-11 rounded-full bg-black/10 grid place-items-center">
            <span className="text-xl">
              💬
            </span>
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

        {/* PRODUCT */}

        <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-3">
          {(
            product?.image ||
            product?.image_url ||
            product?.imageUrl ||
            product?.product_image ||
            product?.productImage
          ) ? (
            <img
              src={
                product.image ||
                product.image_url ||
                product.imageUrl ||
                product.product_image ||
                product.productImage
              }
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
