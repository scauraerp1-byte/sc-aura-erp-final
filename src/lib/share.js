/**
 * SC AURA ERP
 * Catalogue / WhatsApp / Native Sharing
 *
 * MOBILE:
 *   Share Catalogue
 *        ↓
 *   Native Android / iPhone Share Sheet
 *        ↓
 *   WhatsApp / Instagram / Gmail / etc.
 *
 * DESKTOP:
 *   Share Catalogue
 *        ↓
 *   WhatsApp / Other chooser
 *
 * Shared files:
 *   - Actual product image
 *   - SCA code below image
 *   - SCA code left aligned
 *   - Product details
 *   - NO catalogue URL
 *   - NO View catalogue link
 */

/* =========================================================
   BASIC HELPERS
========================================================= */

const cleanPhone = (p) =>
  String(p || "")
    .replace(/[^\d+]/g, "")
    .replace(/^\+/, "");

/* =========================================================
   NORMAL WHATSAPP TEXT SHARE
========================================================= */

export function whatsappUrl(phone, text) {
  const target = cleanPhone(phone);

  const base = target
    ? `https://wa.me/${target}`
    : "https://wa.me/";

  return `${base}?text=${encodeURIComponent(text || "")}`;
}

export function shareWhatsApp({ phone, text }) {
  const url = whatsappUrl(phone, text);

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
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });

      return true;
    } catch {
      // cancelled / failed
    }
  }

  const fullText = url
    ? `${text || ""}\n${url}`
    : text || "";

  shareWhatsApp({
    phone,
    text: fullText,
  });

  return false;
}

/* =========================================================
   IMAGE SOURCE
========================================================= */

function getProductImages(product) {
  if (
    Array.isArray(product?.images) &&
    product.images.length
  ) {
    return product.images.filter(Boolean);
  }

  const single =
    product?.image ||
    product?.image_url ||
    product?.imageUrl ||
    product?.product_image ||
    product?.productImage ||
    product?.photo ||
    product?.photo_url ||
    product?.thumbnail ||
    product?.thumbnail_url;

  return single
    ? [single]
    : [];
}

/* =========================================================
   SCA CODE
========================================================= */

function getScaCode(product) {
  const raw = String(
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

  if (/^SCA-/i.test(raw)) {
    return raw.toUpperCase();
  }

  const match = raw.match(/(\d+)$/);

  if (match) {
    return `SCA-${match[1]}`;
  }

  return `SCA-${raw}`;
}

/* =========================================================
   IMAGE LOADER
========================================================= */

async function loadImageSource(source) {
  if (!source) {
    throw new Error(
      "Product image is missing."
    );
  }

  if (
    typeof source === "string" &&
    source.startsWith("data:image/")
  ) {
    return source;
  }

  if (
    typeof source === "string" &&
    source.startsWith("blob:")
  ) {
    return source;
  }

  const response = await fetch(source);

  if (!response.ok) {
    throw new Error(
      `Unable to load product image (${response.status}).`
    );
  }

  const blob = await response.blob();

  return URL.createObjectURL(blob);
}

/* =========================================================
   LOAD HTML IMAGE
========================================================= */

function loadHtmlImage(source) {
  return new Promise(
    (resolve, reject) => {
      const img = new Image();

      img.crossOrigin = "anonymous";

      img.onload = () => resolve(img);

      img.onerror = () =>
        reject(
          new Error(
            "Unable to decode product image."
          )
        );

      img.src = source;
    }
  );
}

/* =========================================================
   CREATE SHARE IMAGE
 *
 * Product image
 *       ↓
 * white code strip
 *       ↓
 * SCA-00017 LEFT
========================================================= */

async function createCatalogueImage(
  imageSource,
  scaCode
) {
  const source =
    await loadImageSource(
      imageSource
    );

  let objectUrl = null;

  if (
    typeof source === "string" &&
    source.startsWith("blob:")
  ) {
    objectUrl = source;
  }

  try {
    const img =
      await loadHtmlImage(
        source
      );

    const MAX_WIDTH = 1400;

    const originalWidth =
      img.naturalWidth ||
      img.width ||
      1000;

    const originalHeight =
      img.naturalHeight ||
      img.height ||
      1000;

    const scale = Math.min(
      1,
      MAX_WIDTH / originalWidth
    );

    const width =
      Math.max(
        1,
        Math.round(
          originalWidth * scale
        )
      );

    const imageHeight =
      Math.max(
        1,
        Math.round(
          originalHeight * scale
        )
      );

    /*
     * Small clean strip.
     */
    const stripHeight =
      Math.max(
        58,
        Math.round(
          width * 0.045
        )
      );

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = width;

    canvas.height =
      imageHeight +
      stripHeight;

    const ctx =
      canvas.getContext(
        "2d"
      );

    if (!ctx) {
      throw new Error(
        "Canvas is not supported."
      );
    }

    /*
     * White background
     */
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      0,
      width,
      canvas.height
    );

    /*
     * Product image
     */
    ctx.drawImage(
      img,
      0,
      0,
      width,
      imageHeight
    );

    /*
     * Code strip
     */
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      imageHeight,
      width,
      stripHeight
    );

    /*
     * SCA CODE
     * LEFT ALIGNED
     */
    ctx.fillStyle =
      "#111111";

    ctx.font =
      `700 ${Math.max(
        26,
        Math.round(
          width * 0.032
        )
      )}px Arial, sans-serif`;

    ctx.textAlign = "left";

    ctx.textBaseline = "middle";

    ctx.fillText(
      scaCode,
      Math.round(
        width * 0.025
      ),
      imageHeight +
        stripHeight / 2
    );

    /*
     * JPEG
     */
    const blob =
      await new Promise(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.94
          );
        }
      );

    if (!blob) {
      throw new Error(
        "Unable to create share image."
      );
    }

    return blob;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(
        objectUrl
      );
    }
  }
}

/* =========================================================
   PRODUCT DETAILS
========================================================= */

function getProductDetails(product) {
  const sca =
    getScaCode(product);

  const title =
    String(
      product?.title || ""
    ).trim();

  const category =
    String(
      product?.category || ""
    ).trim();

  const price =
    Number(
      product?.price || 0
    );

  const sizes =
    Array.isArray(
      product?.available_sizes
    )
      ? product.available_sizes.join(
          ", "
        )
      : String(
          product?.size_preset ||
            ""
        );

  const description =
    String(
      product?.description ||
        ""
    ).trim();

  const lines = [];

  if (sca) {
    lines.push(sca);
  }

  if (title) {
    lines.push(
      `*${title}*`
    );
  }

  if (category) {
    lines.push(
      `Category: ${category}`
    );
  }

  if (sizes) {
    lines.push(
      `Available sizes: ${sizes}`
    );
  }

  if (
    Number.isFinite(price) &&
    price > 0
  ) {
    lines.push(
      `Price: ${formatRupee(
        price
      )}`
    );
  }

  if (description) {
    lines.push(
      description
    );
  }

  return lines.join("\n");
}

/* =========================================================
   DOWNLOAD HELPER
========================================================= */

function downloadBlob(
  blob,
  filename
) {
  const url =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href = url;

  anchor.download = filename;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  setTimeout(
    () => {
      URL.revokeObjectURL(
        url
      );
    },
    1000
  );
}

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

  const userAgent =
    navigator.userAgent ||
    navigator.vendor ||
    window.opera ||
    "";

  return /android|iphone|ipad|ipod|mobile/i.test(
    userAgent
  );
}

/* =========================================================
   NATIVE FILE SHARE
 *
 * Opens the ACTUAL phone share sheet.
========================================================= */

async function nativeFileShare({
  files,
  details,
  title,
}) {
  if (
    typeof navigator ===
      "undefined" ||
    typeof navigator.share !==
      "function"
  ) {
    return false;
  }

  /*
   * First try files.
   *
   * Do NOT require canShare().
   * Some mobile browsers implement
   * file sharing but return unreliable
   * canShare results.
   */
  try {
    await navigator.share({
      title:
        title ||
        "SC Aura Kurtis",
      text: details,
      files,
    });

    return true;
  } catch (error) {
    /*
     * User cancelled.
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

  /*
   * Second attempt:
   * native share sheet without files.
   *
   * This makes sure mobile still
   * gets the system share sheet if
   * the browser refuses file sharing.
   */
  try {
    await navigator.share({
      title:
        title ||
        "SC Aura Kurtis",
      text: details,
    });

    return true;
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      return false;
    }

    console.warn(
      "Native text share failed:",
      error
    );
  }

  return false;
}

/* =========================================================
   MAIN CATALOGUE SHARE
========================================================= */

export async function shareCatalogue({
  product,
  phone = "",
  destination = "other",
}) {
  if (!product) {
    throw new Error(
      "Product data is missing."
    );
  }

  const images =
    getProductImages(
      product
    );

  if (
    images.length === 0
  ) {
    throw new Error(
      "No product image found."
    );
  }

  const sca =
    getScaCode(product);

  if (!sca) {
    throw new Error(
      "SCA number is missing."
    );
  }

  /*
   * =======================================================
   * CREATE ALL SHARE IMAGES
   * =======================================================
   */

  const files = [];

  for (
    let i = 0;
    i < images.length;
    i++
  ) {
    const blob =
      await createCatalogueImage(
        images[i],
        sca
      );

    const file =
      new File(
        [blob],
        `${sca}-${i + 1}.jpg`,
        {
          type: "image/jpeg",
        }
      );

    files.push(file);
  }

  const details =
    getProductDetails(
      product
    );

  /* =======================================================
     MOBILE NATIVE SHARE
  ======================================================= */

  if (
    destination === "mobile"
  ) {
    return await nativeFileShare({
      files,
      details,
      title:
        product?.title ||
        "SC Aura Kurtis",
    });
  }

  /* =======================================================
     WHATSAPP
  ======================================================= */

  if (
    destination ===
    "whatsapp"
  ) {
    /*
     * On mobile:
     * open actual native share sheet.
     */
    if (
      isMobileDevice()
    ) {
      return await nativeFileShare({
        files,
        details,
        title:
          product?.title ||
          "SC Aura Kurtis",
      });
    }

    /*
     * Desktop:
     * download generated images,
     * then open WhatsApp with
     * product details only.
     */
    files.forEach(
      (
        file,
        index
      ) => {
        downloadBlob(
          file,
          `${sca}-${index + 1}.jpg`
        );
      }
    );

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          400
        )
    );

    shareWhatsApp({
      phone,
      text: details,
    });

    return true;
  }

  /* =======================================================
     OTHER
  ======================================================= */

  if (
    destination === "other"
  ) {
    /*
     * Desktop and mobile native
     * share when available.
     */
    if (
      typeof navigator !==
        "undefined" &&
      typeof navigator.share ===
        "function"
    ) {
      return await nativeFileShare({
        files,
        details,
        title:
          product?.title ||
          "SC Aura Kurtis",
      });
    }

    /*
     * No native share:
     * download files.
     */
    files.forEach(
      (
        file,
        index
      ) => {
        downloadBlob(
          file,
          `${sca}-${index + 1}.jpg`
        );
      }
    );

    return true;
  }

  return false;
}

/* =========================================================
   PUBLIC URL HELPERS
 *
 * Kept for existing ERP functionality.
 *
 * Catalogue sharing itself DOES NOT
 * use these URLs.
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
   RUPEE
========================================================= */

export function formatRupee(n) {
  return `Rs. ${Number(
    n || 0
  ).toLocaleString(
    "en-IN"
  )}`;
}
