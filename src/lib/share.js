/**
 * SC AURA ERP
 * FINAL CATALOGUE SHARING
 *
 * MOBILE:
 * - Product image
 * - SCA code below image
 * - Product details as share text
 * - Native Android / iPhone share sheet
 *
 * DESKTOP:
 * - WhatsApp
 * - Other
 * - Download generated catalogue image
 *
 * IMPORTANT:
 * - No catalogue URL in catalogue image sharing
 * - No "View Catalogue"
 * - No text-only fallback when image sharing fails
 */

const preparedCache = new Map();

/* =========================================================
   PHONE
========================================================= */

const cleanPhone = (p) =>
  String(p || "")
    .replace(/[^\d+]/g, "")
    .replace(/^\+/, "");

/* =========================================================
   WHATSAPP URL
========================================================= */

export function whatsappUrl(phone, text) {
  const target = cleanPhone(phone);

  const base = target
    ? `https://wa.me/${target}`
    : "https://wa.me/";

  return `${base}?text=${encodeURIComponent(
    text || ""
  )}`;
}

export function shareWhatsApp({ phone, text }) {
  if (typeof window === "undefined") {
    return;
  }

  const url = whatsappUrl(
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
   Used elsewhere in ERP.
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
        title: title || "",
        text: text || "",
        ...(url ? { url } : {}),
      });

      return true;
    } catch (error) {
      if (
        error?.name === "AbortError"
      ) {
        return false;
      }
    }
  }

  shareWhatsApp({
    phone,
    text: url
      ? `${text || ""}\n${url}`
      : text || "",
  });

  return false;
}

/* =========================================================
   DEVICE
========================================================= */

export function isMobileDevice() {
  if (
    typeof navigator === "undefined"
  ) {
    return false;
  }

  return /android|iphone|ipad|ipod|mobile/i.test(
    navigator.userAgent || ""
  );
}

/* =========================================================
   PRODUCT IMAGES
========================================================= */

export function getProductImages(product) {
  if (
    Array.isArray(product?.images) &&
    product.images.length > 0
  ) {
    return product.images.filter(Boolean);
  }

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

  return image
    ? [image]
    : [];
}

/* =========================================================
   SCA CODE
========================================================= */

export function getScaCode(product) {
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

  const match =
    raw.match(/(\d+)$/);

  if (match) {
    return `SCA-${match[1]}`;
  }

  return `SCA-${raw}`;
}

/* =========================================================
   IMAGE URL
========================================================= */

function normalizeImageUrl(source) {
  if (
    typeof source !== "string"
  ) {
    return source;
  }

  if (
    source.startsWith("data:") ||
    source.startsWith("blob:")
  ) {
    return source;
  }

  if (
    source.startsWith("http://") ||
    source.startsWith("https://")
  ) {
    return source;
  }

  try {
    return new URL(
      source,
      window.location.origin
    ).href;
  } catch {
    return source;
  }
}

/* =========================================================
   FETCH IMAGE
========================================================= */

async function fetchImageBlob(source) {
  const url =
    normalizeImageUrl(source);

  if (!url) {
    throw new Error(
      "Product image is missing."
    );
  }

  /*
   * DATA URL
   */
  if (
    url.startsWith(
      "data:image/"
    )
  ) {
    const response =
      await fetch(url);

    const blob =
      await response.blob();

    if (!blob.size) {
      throw new Error(
        "Image is empty."
      );
    }

    return blob;
  }

  /*
   * BLOB URL
   */
  if (
    url.startsWith("blob:")
  ) {
    const response =
      await fetch(url);

    const blob =
      await response.blob();

    if (!blob.size) {
      throw new Error(
        "Image is empty."
      );
    }

    return blob;
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, 15000);

  try {
    const response =
      await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        signal:
          controller.signal,
      });

    if (!response.ok) {
      throw new Error(
        `Image request failed: ${response.status}`
      );
    }

    const blob =
      await response.blob();

    if (!blob.size) {
      throw new Error(
        "Image returned empty data."
      );
    }

    /*
     * Make sure browser actually
     * received an image.
     */
    if (
      blob.type &&
      !blob.type.startsWith("image/")
    ) {
      throw new Error(
        `Invalid image type: ${blob.type}`
      );
    }

    return blob;
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        "Image loading timed out."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   LOAD IMAGE
========================================================= */

function loadImageFromBlob(blob) {
  return new Promise(
    (resolve, reject) => {
      const objectUrl =
        URL.createObjectURL(
          blob
        );

      const img =
        new Image();

      img.onload = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            "Unable to decode product image."
          )
        );
      };

      img.src =
        objectUrl;
    }
  );
}

/* =========================================================
   CREATE SHARE IMAGE
========================================================= */

async function createCatalogueImage(
  imageSource,
  scaCode
) {
  const imageBlob =
    await fetchImageBlob(
      imageSource
    );

  const img =
    await loadImageFromBlob(
      imageBlob
    );

  /*
   * Keep image large enough for
   * WhatsApp but not unnecessarily huge.
   */
  const MAX_WIDTH = 1400;

  const originalWidth =
    img.naturalWidth ||
    img.width ||
    1000;

  const originalHeight =
    img.naturalHeight ||
    img.height ||
    1000;

  const scale =
    Math.min(
      1,
      MAX_WIDTH /
        originalWidth
    );

  const width =
    Math.max(
      1,
      Math.round(
        originalWidth *
          scale
      )
    );

  const imageHeight =
    Math.max(
      1,
      Math.round(
        originalHeight *
          scale
      )
    );

  /*
   * SCA strip.
   */
  const stripHeight =
    Math.max(
      56,
      Math.round(
        width * 0.045
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

  if (!ctx) {
    throw new Error(
      "Canvas is not supported."
    );
  }

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
   * White SCA strip.
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
   * SCA code left aligned.
   */
  ctx.fillStyle =
    "#111111";

  ctx.font =
    `700 ${Math.max(
      24,
      Math.round(
        width * 0.028
      )
    )}px Arial, sans-serif`;

  ctx.textAlign =
    "left";

  ctx.textBaseline =
    "middle";

  ctx.fillText(
    scaCode,
    Math.round(
      width * 0.025
    ),
    imageHeight +
      stripHeight / 2
  );

  /*
   * Convert canvas to real JPEG Blob.
   */
  const output =
    await new Promise(
      (resolve) => {
        canvas.toBlob(
          resolve,
          "image/jpeg",
          0.92
        );
      }
    );

  if (!output) {
    throw new Error(
      "Unable to create JPG."
    );
  }

  return output;
}

/* =========================================================
   PRODUCT DETAILS
========================================================= */

export function getProductDetails(product) {
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
        ).trim();

  const price =
    Number(
      product?.price || 0
    );

  const description =
    String(
      product?.description ||
        ""
    ).trim();

  const lines = [];

  if (title) {
    lines.push(
      `*${title}*`
    );
  }

  if (sca) {
    lines.push(
      `SR: ${sca}`
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

  return lines.join(
    "\n"
  );
}

/* =========================================================
   CACHE KEY
========================================================= */

function getCacheKey(product) {
  return String(
    product?.id ||
      product?.sr_number ||
      product?.sca_code ||
      product?.sku ||
      ""
  );
}

/* =========================================================
   PREPARE CATALOGUE
========================================================= */

export async function prepareCatalogueShare({
  product,
}) {
  if (!product) {
    throw new Error(
      "Product data is missing."
    );
  }

  const cacheKey =
    getCacheKey(product);

  /*
   * Use already prepared files.
   */
  if (
    cacheKey &&
    preparedCache.has(cacheKey)
  ) {
    return preparedCache.get(
      cacheKey
    );
  }

  const images =
    getProductImages(
      product
    );

  if (!images.length) {
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

  const files = [];

  /*
   * Prepare every product image.
   */
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

    /*
     * IMPORTANT:
     * Real File object, not Blob.
     */
    const file =
      new File(
        [blob],
        `${sca}-${i + 1}.jpg`,
        {
          type: "image/jpeg",
          lastModified:
            Date.now(),
        }
      );

    files.push(file);
  }

  const prepared = {
    files,
    details:
      getProductDetails(
        product
      ),
    title:
      product?.title ||
      "SC Aura Kurtis",
    sca,
  };

  if (cacheKey) {
    preparedCache.set(
      cacheKey,
      prepared
    );
  }

  return prepared;
}

/* =========================================================
   PRELOAD
========================================================= */

export function preloadCatalogueShare(
  product
) {
  if (!product) {
    return Promise.reject(
      new Error(
        "Product data is missing."
      )
    );
  }

  const existing =
    getPreparedCatalogue(
      product
    );

  if (existing) {
    return Promise.resolve(
      existing
    );
  }

  return prepareCatalogueShare({
    product,
  }).catch((error) => {
    console.error(
      "Catalogue preload failed:",
      error
    );

    return null;
  });
}

/* =========================================================
   GET CACHE
========================================================= */

export function getPreparedCatalogue(
  product
) {
  const cacheKey =
    getCacheKey(product);

  if (!cacheKey) {
    return null;
  }

  return (
    preparedCache.get(
      cacheKey
    ) || null
  );
}

/* =========================================================
   CLEAR CACHE
========================================================= */

export function clearPreparedCatalogue(
  product
) {
  const cacheKey =
    getCacheKey(product);

  if (cacheKey) {
    preparedCache.delete(
      cacheKey
    );
  }
}

/* =========================================================
   NATIVE FILE SHARE
========================================================= */

export async function sharePreparedCatalogue({
  prepared,
}) {
  if (
    !prepared ||
    !Array.isArray(
      prepared.files
    ) ||
    prepared.files.length === 0
  ) {
    console.error(
      "No catalogue files available."
    );

    return false;
  }

  if (
    typeof navigator ===
      "undefined" ||
    typeof navigator.share !==
      "function"
  ) {
    console.error(
      "Native sharing is not supported."
    );

    return false;
  }

  /*
   * Check whether browser supports
   * sharing actual files.
   */
  if (
    typeof navigator.canShare ===
    "function"
  ) {
    try {
      const canShareFiles =
        navigator.canShare({
          files:
            prepared.files,
        });

      if (!canShareFiles) {
        console.error(
          "This browser cannot share image files."
        );

        return false;
      }
    } catch (error) {
      console.error(
        "File share capability check failed:",
        error
      );

      return false;
    }
  }

  try {
    /*
     * ACTUAL FILE SHARE.
     *
     * Do NOT replace this with a
     * text-only navigator.share().
     */
    await navigator.share({
      files:
        prepared.files,

      title:
        prepared.title,

      text:
        prepared.details,
    });

    return true;
  } catch (error) {
    /*
     * User closed/cancelled share sheet.
     */
    if (
      error?.name ===
      "AbortError"
    ) {
      return false;
    }

    console.error(
      "Native IMAGE share failed:",
      error
    );

    return false;
  }
}

/* =========================================================
   DESKTOP DOWNLOAD
========================================================= */

function downloadFile(
  file,
  filename
) {
  const url =
    URL.createObjectURL(
      file
    );

  const a =
    document.createElement(
      "a"
    );

  a.href =
    url;

  a.download =
    filename;

  document.body.appendChild(
    a
  );

  a.click();

  a.remove();

  setTimeout(() => {
    URL.revokeObjectURL(
      url
    );
  }, 1500);
}

/* =========================================================
   DESKTOP SHARE
========================================================= */

export async function sharePreparedCatalogueDesktop({
  prepared,
  destination,
  phone,
}) {
  if (
    !prepared?.files?.length
  ) {
    return false;
  }

  /*
   * OTHER
   */
  if (
    destination === "other"
  ) {
    if (
      typeof navigator !==
        "undefined" &&
      typeof navigator.share ===
        "function"
    ) {
      try {
        const supported =
          typeof navigator.canShare !==
            "function" ||
          navigator.canShare({
            files:
              prepared.files,
          });

        if (supported) {
          await navigator.share({
            files:
              prepared.files,

            title:
              prepared.title,

            text:
              prepared.details,
          });

          return true;
        }
      } catch (error) {
        if (
          error?.name ===
          "AbortError"
        ) {
          return false;
        }

        console.error(
          "Desktop native share failed:",
          error
        );
      }
    }

    prepared.files.forEach(
      (file, index) => {
        downloadFile(
          file,
          `${prepared.sca}-${index + 1}.jpg`
        );
      }
    );

    return true;
  }

  /*
   * WHATSAPP
   */
  if (
    destination === "whatsapp"
  ) {
    prepared.files.forEach(
      (file, index) => {
        downloadFile(
          file,
          `${prepared.sca}-${index + 1}.jpg`
        );
      }
    );

    setTimeout(() => {
      shareWhatsApp({
        phone,
        text:
          prepared.details,
      });
    }, 600);

    return true;
  }

  return false;
}

/* =========================================================
   MAIN CATALOGUE SHARE
========================================================= */

export async function shareCatalogue({
  product,
  products = [],
  phone = "",
  destination = "mobile",
  prepared = null,
}) {
  const actualProduct =
    product ||
    products?.[0];

  if (!actualProduct) {
    throw new Error(
      "Product data is missing."
    );
  }

  /*
   * ALWAYS prefer already prepared
   * catalogue files.
   */
  let finalPrepared =
    prepared ||
    getPreparedCatalogue(
      actualProduct
    );

  /*
   * MOBILE / NATIVE
   */
  if (
    destination === "mobile"
  ) {
    /*
     * If files are ready,
     * share them immediately.
     */
    if (finalPrepared) {
      return sharePreparedCatalogue({
        prepared:
          finalPrepared,
      });
    }

    /*
     * This should normally not happen
     * because ShareCatalogueButton
     * preloads the files.
     */
    try {
      finalPrepared =
        await prepareCatalogueShare({
          product:
            actualProduct,
        });
    } catch (error) {
      console.error(
        "Catalogue image preparation failed:",
        error
      );

      return false;
    }

    /*
     * NEVER fall back to text-only share.
     */
    return sharePreparedCatalogue({
      prepared:
        finalPrepared,
    });
  }

  /*
   * DESKTOP
   */
  if (!finalPrepared) {
    try {
      finalPrepared =
        await prepareCatalogueShare({
          product:
            actualProduct,
        });
    } catch (error) {
      console.error(
        "Desktop catalogue preparation failed:",
        error
      );

      return false;
    }
  }

  return sharePreparedCatalogueDesktop({
    prepared:
      finalPrepared,
    destination,
    phone,
  });
}

/* =========================================================
   PUBLIC URL HELPERS
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
