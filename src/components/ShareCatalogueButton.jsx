import { useState } from "react";
import { Share2 } from "lucide-react";
import {
  shareCatalogue,
} from "../lib/share";
import api from "../lib/api";

export default function ShareCatalogueButton({
  product,
  phone,
  variant = "default",
  className = "",
  onShared,
}) {
  const [busy, setBusy] =
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
         * Sharing has already happened.
         * Don't break the UI if marking fails.
         */
      }
    };

  /* =====================================================
     SHARE
  ===================================================== */

  const onShare =
    async (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (busy) {
        return;
      }

      setBusy(true);

      try {
        /*
         * PRODUCT SIZES
         */
        const sizes =
          product?.size_preset ||
          (
            product?.available_sizes ||
            []
          ).join(", ");

        /*
         * PRODUCT IMAGE
         *
         * Keep all possible existing
         * image fields so the sharing
         * utility can find the image.
         */
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

        /*
         * PRODUCT OBJECT FOR CATALOGUE
         */
        const catalogueProduct = {
          ...product,

          image,

          sr_number:
            product?.sr_number || "",

          title:
            product?.title || "",

          category:
            product?.category || "",

          size_preset:
            sizes,

          price:
            product?.price || 0,

          description:
            product?.description || "",
        };

        /*
         * =================================================
         * ACTUAL CATALOGUE SHARE
         *
         * IMPORTANT:
         * No publicCatalogueUrl()
         * No URL
         * No View Catalogue
         *
         * shareCatalogue() creates the
         * image with SCA code below it.
         * =================================================
         */

        const shared =
          await shareCatalogue({
            products: [
              catalogueProduct,
            ],

            phone:
              phone || "",

            title:
              product?.title ||
              "SC Aura Kurtis Catalogue",
          });

        /*
         * Mark as shared only when
         * native file sharing succeeds.
         */
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
     ICON VARIANT
  ===================================================== */

  if (
    variant === "icon"
  ) {
    return (
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
    );
  }

  /* =====================================================
     DEFAULT BUTTON
  ===================================================== */

  return (
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
  );
}
