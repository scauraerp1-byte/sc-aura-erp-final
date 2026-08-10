/**
 * WhatsApp / Catalogue Sharing Utility
 *
 * Catalogue sharing:
 * - Product images as actual files
 * - SCA code printed bottom-left on every image
 * - Product details as share text
 * - NO catalogue URL
 * - NO URL preview
 * - NO "View catalogue" link
 *
 * Normal page sharing:
 * - Can still share title/text/url
 */

const cleanPhone = (p) =>
  (p || "")
    .replace(/[^\d+]/g, "")
    .replace(/^\+/, "");

/* =========================================================
   WHATSAPP TEXT URL
========================================================= */

export function whatsappUrl(
  phone,
  text
) {
  const target =
    cleanPhone(phone);

  const base = target
    ? `https://wa.me/${target}`
    : "https://wa.me/";

  return `${base}?text=${encodeURIComponent(
    text
  )}`;
}

/* =========================================================
   NORMAL WHATSAPP TEXT SHARE
========================================================= */

export function shareWhatsApp({
  phone,
  text,
}) {
  const url =
    whatsappUrl(
      phone,
      text
    );

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}

/* =========================================================
   NORMAL PAGE SHARE
========================================================= */

export async function sharePage({
  title,
  text,
  url,
  phone,
}) {
  /*
   * Keep this function for normal
   * page sharing only.
   */

  if (
    navigator.share
  ) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });

      return true;
    } catch {
      // fallback
    }
  }

  const full =
    url
      ? `${text}\n${url}`
      : text;

  shareWhatsApp({
    phone,
    text: full,
  });

  return false;
}

/* =========================================================
   IMAGE LOADER
========================================================= */

async function loadImage(
  src
) {
  if (!src) {
    throw new Error(
      "Product image is missing."
    );
  }

  /*
   * Data URL
   */
  if (
    src.startsWith(
      "data:image/"
    )
  ) {
    return src;
  }

  const response =
    await fetch(src);

  if (!response.ok) {
    throw new Error(
      `Unable to load image: ${src}`
    );
  }

  const blob =
    await response.blob();

  return URL.createObjectURL(
    blob
  );
}

/* =========================================================
   CANVAS IMAGE
========================================================= */

function imageElement(
  src
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const img =
        new Image();

      img.onload = () =>
        resolve(img);

      img.onerror = () =>
        reject(
          new Error(
            "Unable to decode product image."
          )
        );

      img.src = src;
    }
  );
}

/* =========================================================
   CREATE SHARE IMAGE
========================================================= */

export async function createCatalogueImage(
  {
    image,
    scaCode,
  }
) {
  const src =
    await loadImage(
      image
    );

  try {
    const img =
      await imageElement(
        src
      );

    /*
     * Keep original aspect ratio.
     */
    const maxWidth =
      1200;

    const scale =
      Math.min(
        1,
        maxWidth /
          img.naturalWidth
      );

    const width =
      Math.round(
        img.naturalWidth *
          scale
      );

    const imageHeight =
      Math.round(
        img.naturalHeight *
          scale
      );

    /*
     * Code strip.
     */
    const stripHeight =
      Math.max(
        58,
        Math.round(
          width * 0.065
        )
      );

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      width;

    canvas.height =
      imageHeight +
      stripHeight;

    const ctx =
      canvas.getContext(
        "2d"
      );

    /*
     * White background.
     */
    ctx.fillStyle =
      "#ffffff";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    /*
     * Product image.
     */
    ctx.drawImage(
      img,
      0,
      0,
      width,
      imageHeight
    );

    /*
     * White code strip.
     */
    ctx.fillStyle =
      "#ffffff";

    ctx.fillRect(
      0,
      imageHeight,
      width,
      stripHeight
    );

    /*
     * SCA code - LEFT ALIGNED.
     */
    ctx.fillStyle =
      "#111111";

    ctx.font =
      `700 ${Math.max(
        28,
        Math.round(
          width * 0.035
        )
      )}px Arial`;

    ctx.textBaseline =
      "middle";

    ctx.textAlign =
      "left";

    ctx.fillText(
      String(
        scaCode || ""
      ),
      Math.round(
        width * 0.025
      ),
      imageHeight +
        stripHeight / 2
    );

    return new Promise(
      (
        resolve,
        reject
      ) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(
                new Error(
                  "Unable to create catalogue image."
                )
              );

              return;
            }

            resolve(blob);
          },
          "image/jpeg",
          0.94
        );
      }
    );
  } finally {
    if (
      src.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        src
      );
    }
  }
}

/* =========================================================
   PRODUCT IMAGE FIELD
========================================================= */

function getProductImage(
  product
) {
  return (
    product?.image ||
    product?.image_url ||
    product?.imageUrl ||
    product?.product_image ||
    product?.productImage ||
    product?.photo ||
    product?.photo_url ||
    product?.thumbnail ||
    product?.thumbnail_url ||
    null
  );
}

/* =========================================================
   SCA CODE
 *
 * Keeps FULL SCA format:
 *
 * 0017      -> SCA-0017
 * SCA-0017 -> SCA-0017
 * SCA-00017 -> SCA-00017
========================================================= */

function getScaCode(
  product
) {
  const raw =
    String(
      product?.sr_number ||
        product?.sca_code ||
        product?.sku ||
        product?.code ||
        product?.product_code ||
        ""
    ).trim();

  if (!raw) {
    return "";
  }

  if (
    /^SCA-/i.test(raw)
  ) {
    return raw.toUpperCase();
  }

  const match =
    raw.match(
      /(\d+)$/
    );

  if (match) {
    return `SCA-${match[1]}`;
  }

  return `SCA-${raw}`;
}

/* =========================================================
   PRODUCT DETAILS TEXT
========================================================= */

function getProductDetails(
  product
) {
  const name =
    String(
      product?.title ||
        product?.name ||
        product?.product_name ||
        product?.description ||
        ""
    ).trim();

  const sizes =
    product?.sizes &&
    typeof product.sizes ===
      "object"
      ? Object.entries(
          product.sizes
        )
          .filter(
            ([, qty]) =>
              Number(qty || 0) >
              0
          )
          .map(
            ([size, qty]) =>
              `${size}: ${qty}`
          )
          .join(" | ")
      : "";

  const qty =
    Number(
      product?.quantity ||
        product?.qty ||
        0
    );

  const rate =
    Number(
      product?.unit_price ||
        product?.rate ||
        product?.price ||
        0
    );

  const parts =
    [];

  if (name) {
    parts.push(name);
  }

  if (sizes) {
    parts.push(
      `Sizes: ${sizes}`
    );
  }

  if (qty) {
    parts.push(
      `Qty: ${qty}`
    );
  }

  if (rate) {
    parts.push(
      `Rs. ${rate.toLocaleString(
        "en-IN"
      )}`
    );
  }

  return parts.join(
    "\n"
  );
}

/* =========================================================
   FINAL CATALOGUE SHARE
 *
 * THIS is what the catalogue
 * button should call.
========================================================= */

export async function shareCatalogue({
  products = [],
  phone = "",
  title = "SC Aura Kurtis Catalogue",
}) {
  if (
    !Array.isArray(products) ||
    products.length === 0
  ) {
    throw new Error(
      "No catalogue products found."
    );
  }

  const files = [];

  const details = [];

  /*
   * Generate actual image files.
   */
  for (
    let i = 0;
    i < products.length;
    i++
  ) {
    const product =
      products[i];

    const image =
      getProductImage(
        product
      );

    if (!image) {
      console.warn(
        "Skipping product without image:",
        product
      );

      continue;
    }

    const sca =
      getScaCode(
        product
      );

    const blob =
      await createCatalogueImage(
        {
          image,
          scaCode: sca,
        }
      );

    const file =
      new File(
        [blob],
        `${sca || `product-${i + 1}`}.jpg`,
        {
          type:
            "image/jpeg",
        }
      );

    files.push(
      file
    );

    const productText =
      getProductDetails(
        product
      );

    if (productText) {
      details.push(
        `${sca}\n${productText}`
      );
    }
  }

  if (
    files.length === 0
  ) {
    throw new Error(
      "No product images could be prepared for sharing."
    );
  }

  /*
   * ========================================================
   * IMPORTANT
   *
   * NO URL HERE.
   * NO publicCatalogueUrl().
   * NO catalogue link.
   * ========================================================
   */

  const shareText =
    details.join(
      "\n\n"
    );

  /*
   * Native file sharing.
   *
   * This is what sends the actual
   * images instead of a website card.
   */
  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({
      files,
    })
  ) {
    try {
      await navigator.share({
        title,
        text:
          shareText,
        files,
      });

      return true;
    } catch (
      error
    ) {
      /*
       * User cancellation should
       * not open a random URL.
       */
      if (
        error?.name ===
        "AbortError"
      ) {
        return false;
      }

      console.warn(
        "Native file share failed:",
        error
      );
    }
  }

  /*
   * ========================================================
   * FALLBACK
   *
   * Browser cannot attach files to
   * wa.me URLs.
   *
   * Therefore DO NOT send the
   * catalogue URL.
   *
   * Open WhatsApp with only text.
   * ========================================================
   */

  shareWhatsApp({
    phone,
    text:
      shareText ||
      "SC Aura Kurtis Catalogue",
  });

  return false;
}

/* =========================================================
   PUBLIC URL HELPERS
 *
 * Keep these for BOOKING / DISPATCH
 * links. Catalogue sharing does NOT
 * use publicCatalogueUrl().
========================================================= */

export function publicCatalogueUrl(
  sr_number
) {
  return `${window.location.origin}/catalogue/${sr_number}`;
}

export function publicBookingUrl(
  id
) {
  return `${window.location.origin}/r/booking/${id}`;
}

export function publicDispatchUrl(
  id
) {
  return `${window.location.origin}/r/dispatch/${id}`;
}

/* =========================================================
   CURRENCY
========================================================= */

export function formatRupee(
  n
) {
  return `Rs. ${Number(
    n || 0
  ).toLocaleString(
    "en-IN"
  )}`;
}
