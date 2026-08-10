import {
  useEffect,
  useState,
} from "react";

import { Share2 } from "lucide-react";

import {
  preloadCatalogueShare,
  getPreparedCatalogue,
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

  const [ready, setReady] =
    useState(false);

  /* =====================================================
     PREPARE IMAGE IN BACKGROUND
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    if (!product) {
      return;
    }

    const existing =
      getPreparedCatalogue(
        product
      );

    if (existing) {
      setReady(true);
      return;
    }

    preloadCatalogueShare(
      product
    )
      .then((prepared) => {
        if (cancelled) {
          return;
        }

        if (prepared) {
          setReady(true);
        }
      })
      .catch((error) => {
        console.error(
          "Catalogue preload failed:",
          error
        );
      });

    return () => {
      cancelled = true;
    };
  }, [
    product?.id,
    product?.sr_number,
    product?.image,
    product?.image_url,
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
      } catch (error) {
        /*
         * Sharing has already happened.
         * Don't break the UI.
         */
        console.error(
          "Mark shared failed:",
          error
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

      if (
        busy ||
        !product
      ) {
        return;
      }

      setBusy(true);

      try {
        /*
         * IMPORTANT:
         *
         * shareCatalogue uses the already
         * prepared File from cache.
         *
         * No catalogue URL.
         * No text-only fallback.
         */
        const shared =
          await shareCatalogue({
            product,
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
          "Catalogue sharing failed:",
          error
        );
      } finally {
        setBusy(false);
      }
    };

  /* =====================================================
     ICON
  ===================================================== */

  if (
    variant === "icon"
  ) {
    return (
      <button
        type="button"
        onClick={onShare}
        disabled={busy}
        data-testid={`share-catalogue-${
          product?.sr_number ||
          product?.id ||
          "product"
        }`}
        className={`
          w-9
          h-9
          rounded-full
          glass
          hover:bg-white/15
          grid
          place-items-center
          transition
          ${
            busy
              ? "opacity-50 cursor-not-allowed"
              : ""
          }
          ${className}
        `}
        title={
          busy
            ? "Sharing..."
            : "Share catalogue"
        }
      >
        <Share2
          className="w-4 h-4"
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
      data-testid={`share-catalogue-${
        product?.sr_number ||
        product?.id ||
        "product"
      }`}
      className={`
        rounded-full
        glass
        px-4
        py-2.5
        text-xs
        uppercase
        tracking-[0.18em]
        hover:bg-white/10
        inline-flex
        items-center
        justify-center
        gap-2
        transition
        ${
          busy
            ? "opacity-50 cursor-not-allowed"
            : ""
        }
        ${className}
      `}
    >
      <Share2
        className="w-4 h-4"
      />

      {busy
        ? "Sharing..."
        : "Share Catalogue"}
    </button>
  );
}
