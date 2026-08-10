import { useEffect, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  /* =====================================================
     PREPARE CATALOGUE IN BACKGROUND
     
     This runs BEFORE the user presses Share.
     So mobile native share can open immediately.
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    if (!product) {
      return;
    }

    const existing =
      getPreparedCatalogue(product);

    if (existing) {
      setReady(true);
      return;
    }

    preloadCatalogueShare(product)
      .then((prepared) => {
        if (cancelled) return;

        if (prepared) {
          setReady(true);
        }
      })
      .catch((error) => {
        console.error(
          "Catalogue preload error:",
          error
        );
      });

    return () => {
      cancelled = true;
    };
  }, [
    product?.id,
    product?.sr_number,
  ]);

  /* =====================================================
     MARK PRODUCT AS SHARED
  ===================================================== */

  const markShared = async () => {
    try {
      await api.post(
        `/products/${product.id}/mark-shared`
      );

      onShared?.();
    } catch (error) {
      /*
       * Sharing already happened.
       * Do not break UI if API marking fails.
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

  const onShare = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (busy || !product) {
      return;
    }

    /*
     * IMPORTANT:
     *
     * Do NOT await anything before shareCatalogue().
     *
     * If preload is complete, shareCatalogue()
     * immediately calls navigator.share().
     */

    setBusy(true);

    try {
      const shared =
        await shareCatalogue({
          product,
          phone: phone || "",
          destination: "mobile",
        });

      if (shared) {
        await markShared();
      }

      /*
       * If sharing wasn't ready yet,
       * start preparing again in background
       * for the next attempt.
       */
      if (!shared) {
        preloadCatalogueShare(product)
          .then((prepared) => {
            if (prepared) {
              setReady(true);
            }
          })
          .catch(() => {});
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
     ICON BUTTON
  ===================================================== */

  if (variant === "icon") {
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
          w-9 h-9
          rounded-full
          glass
          hover:bg-white/15
          grid
          place-items-center
          transition
          ${busy ? "opacity-50 cursor-not-allowed" : ""}
          ${className}
        `}
        title={
          busy
            ? "Sharing..."
            : ready
            ? "Share catalogue"
            : "Preparing catalogue"
        }
      >
        <Share2 className="w-4 h-4" />
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
        ${busy ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      <Share2 className="w-4 h-4" />

      {busy
        ? "Sharing..."
        : "Share Catalogue"}
    </button>
  );
}
