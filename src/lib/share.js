/**
 * SC AURA ERP
 * FINAL CATALOGUE SHARING
 *
 * Mobile:
 * - Product image + SCA code prepared before share
 * - Native Android / iPhone share sheet
 *
 * Desktop:
 * - WhatsApp / Other chooser
 *
 * Catalogue share:
 * - Actual product image
 * - SCA code below image
 * - SCA code left aligned
 * - Product details
 * - NO catalogue URL
 * - NO "View Catalogue"
 */

const cleanPhone = (p) =>
  String(p || "")
    .replace(/[^\d+]/g, "")
    .replace(/^\+/, "");

/* =========================================================
   WHATSAPP TEXT
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
      // cancelled
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

  const ua =
    navigator.userAgent || "";

  return /android|iphone|ipad|ipod|mobile/i.test(
    ua
  );
}

/* =========================================================
   PRODUCT IMAGES
========================================================= */

export function getProductImages(product) {
  if (
    Array.isArray(product?.images) &&
    product.images.length
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
   IMAGE URL NORMALIZER
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

  /*
   * Already absolute URL.
   */
  if (
    source.startsWith("http://") ||
    source.startsWith("https://")
  ) {
    return source;
  }

  /*
   * Relative URL.
   */
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
   FETCH IMAGE WITH HARD TIMEOUT
========================================================= */

async function fetchImageBlob(source) {
  const url =
    normalizeImageUrl(
      source
    );

  if (!url) {
    throw new Error(
      "Product image is missing."
    );
  }

  /*
   * Data URL
   */
  if (
    typeof url === "string" &&
    url.startsWith("data:image/")
  ) {
    const response =
      await fetch(url);

    return response.blob();
  }

  /*
   * Existing blob URL
   */
  if (
    typeof url === "string" &&
    url.startsWith("blob:")
  ) {
    const response =
      await fetch(url);

    return response.blob();
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, 8000);

  try {
    const response =
      await fetch(url, {
        signal:
          controller.signal,
        mode: "cors",
        credentials: "omit",
        cache: "force-cache",
      });

    if (!response.ok) {
      throw new Error(
        `Image request failed (${response.status}).`
      );
    }

    const blob =
      await response.blob();

    if (!blob.size) {
      throw new Error(
        "Image returned empty data."
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
   IMAGE ELEMENT
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
            "Unable to read product image."
          )
        );
      };

      img.src =
        objectUrl;
    }
  );
}

/* =========================================================
   CREATE FINAL SHARE IMAGE
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

  const MAX_WIDTH =
    1400;

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
   * Small clean code strip.
   */
  const stripHeight =
    Math.max(
      60,
      Math.round(
        width * 0.055
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
   * Code strip.
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
   * SCA code.
   */
  ctx.fillStyle =
    "#111111";

  ctx.font =
    `700 ${Math.max(
      26,
      Math.round(
        width * 0.035
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

  const output =
    await new Promise(
      (resolve) => {
        canvas.toBlob(
          resolve,
          "image/jpeg",
          0.94
        );
      }
    );

  if (!output) {
    throw new Error(
      "Unable to create share image."
    );
  }

  return output;
}

/* =========================================================
   PRODUCT TEXT
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
        );

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

  return lines.join(
    "\n"
  );
}

/* =========================================================
   PREPARE CATALOGUE
 *
 * Called while page/card is idle.
 *
 * NEVER called after the share
 * button's native share activation.
========================================================= */

export async function prepareCatalogueShare({
  product,
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

    files.push(
      new File(
        [blob],
        `${sca}-${i + 1}.jpg`,
        {
          type:
            "image/jpeg",
        }
      )
    );
  }

  return {
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
}

/* =========================================================
   NATIVE SHARE
========================================================= */

export async function sharePreparedCatalogue({
  prepared,
}) {
  if (
    !prepared?.files?.length
  ) {
    return false;
  }

  if (
    typeof navigator ===
      "undefined" ||
    typeof navigator.share !==
      "function"
  ) {
    return false;
  }

  /*
   * File support check.
   */
  if (
    typeof navigator.canShare ===
      "function"
  ) {
    const supported =
      navigator.canShare({
        files:
          prepared.files,
      });

    if (!supported) {
      return false;
    }
  }

  try {
    /*
     * IMPORTANT:
     * This is the first async operation
     * after the user's tap.
     */
    await navigator.share({
      title:
        prepared.title,
      text:
        prepared.details,
      files:
        prepared.files,
    });

    return true;
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      return false;
    }

    console.error(
      "Native catalogue share failed:",
      error
    );

    return false;
  }
}

/* =========================================================
   DOWNLOAD
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
  }, 1000);
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
    destination ===
    "other"
  ) {
    if (
      typeof navigator !==
        "undefined" &&
      typeof navigator.share ===
        "function"
    ) {
      try {
        if (
          typeof navigator.canShare !==
            "function" ||
          navigator.canShare({
            files:
              prepared.files,
          })
        ) {
          await navigator.share({
            title:
              prepared.title,
            text:
              prepared.details,
            files:
              prepared.files,
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
   * WHATSAPP DESKTOP
   */
  if (
    destination ===
    "whatsapp"
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
    }, 500);

    return true;
  }

  return false;
}

/* =========================================================
   BACKWARD COMPATIBILITY
========================================================= */

export async function shareCatalogue({
  product,
  products = [],
  phone = "",
  destination = "other",
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

  const finalPrepared =
    prepared ||
    (await prepareCatalogueShare({
      product:
        actualProduct,
    }));

  if (
    destination ===
    "mobile"
  ) {
    return sharePreparedCatalogue({
      prepared:
        finalPrepared,
    });
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
 *
 * Kept for other ERP functionality.
 * NOT USED in catalogue image sharing.
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
