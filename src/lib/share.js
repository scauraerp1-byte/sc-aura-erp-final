/**
 * SC AURA ERP
 * Sharing utilities
 *
 * CATALOGUE SHARING:
 *
 * Mobile:
 *   Product images are prepared BEFORE the user taps share.
 *   On tap -> navigator.share() is called immediately.
 *
 * Desktop:
 *   Custom WhatsApp / Other chooser can be used.
 *
 * Shared catalogue image:
 *   PRODUCT IMAGE
 *   SCA-00017
 *
 * SCA code is LEFT aligned.
 *
 * Catalogue sharing NEVER adds:
 *   - catalogue URL
 *   - View catalogue
 *   - public catalogue link
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

  return `${base}?text=${encodeURIComponent(
    text || ""
  )}`;
}

export function shareWhatsApp({
  phone,
  text,
}) {
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
 *
 * Kept for other existing functionality.
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

  const finalText = url
    ? `${text || ""}\n${url}`
    : text || "";

  shareWhatsApp({
    phone,
    text: finalText,
  });

  return false;
}

/* =========================================================
   IMAGE FIELD HELPERS
========================================================= */

export function getProductImages(product) {
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
 *
 * 0017       -> SCA-0017
 * SCA-0017  -> SCA-0017
 * SCA-00017 -> SCA-00017
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

  const match = raw.match(/(\d+)$/);

  if (match) {
    return `SCA-${match[1]}`;
  }

  return `SCA-${raw}`;
}

/* =========================================================
   LOAD IMAGE SOURCE
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

  const blob =
    await response.blob();

  return URL.createObjectURL(
    blob
  );
}

/* =========================================================
   LOAD HTML IMAGE
========================================================= */

function loadHtmlImage(source) {
  return new Promise(
    (resolve, reject) => {
      const img =
        new Image();

      img.crossOrigin =
        "anonymous";

      img.onload = () =>
        resolve(img);

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
   CREATE CATALOGUE IMAGE
 *
 * Image
 *   ↓
 * White strip
 *   ↓
 * SCA-00017 LEFT
========================================================= */

export async function createCatalogueImage(
  imageSource,
  scaCode
) {
  const source =
    await loadImageSource(
      imageSource
    );

  let generatedObjectUrl =
    null;

  if (
    typeof source === "string" &&
    source.startsWith("blob:")
  ) {
    generatedObjectUrl =
      source;
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

    /* White background */

    ctx.fillStyle =
      "#ffffff";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    /* Product image */

    ctx.drawImage(
      img,
      0,
      0,
      width,
      imageHeight
    );

    /* Code strip */

    ctx.fillStyle =
      "#ffffff";

    ctx.fillRect(
      0,
      imageHeight,
      width,
      stripHeight
    );

    /* SCA CODE - LEFT */

    ctx.fillStyle =
      "#111111";

    ctx.font =
      `700 ${Math.max(
        26,
        Math.round(
          width * 0.032
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
    if (
      generatedObjectUrl
    ) {
      URL.revokeObjectURL(
        generatedObjectUrl
      );
    }
  }
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
   PREPARE CATALOGUE SHARE
 *
 * IMPORTANT:
 *
 * This function is called BEFORE
 * the user taps the share button.
 *
 * This solves mobile user-activation
 * problems.
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
          type:
            "image/jpeg",
        }
      );

    files.push(file);
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
   NATIVE FILE SHARE
 *
 * IMPORTANT:
 * No async preparation happens here.
 *
 * Files are already ready.
 *
 * This function should be called
 * DIRECTLY from the click event.
========================================================= */

export async function sharePreparedCatalogue({
  prepared,
}) {
  if (
    !prepared ||
    !prepared.files?.length
  ) {
    throw new Error(
      "Catalogue is still preparing."
    );
  }

  if (
    typeof navigator ===
      "undefined" ||
    typeof navigator.share !==
      "function"
  ) {
    return false;
  }

  try {
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
      "Native share failed:",
      error
    );

    /*
     * Some browsers may reject
     * file sharing but still support
     * normal native text sharing.
     */
    try {
      await navigator.share({
        title:
          prepared.title,

        text:
          prepared.details,
      });

      return true;
    } catch {
      return false;
    }
  }
}

/* =========================================================
   DOWNLOAD
========================================================= */

function downloadBlob(
  blob,
  filename
) {
  const url =
    URL.createObjectURL(
      blob
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
   DESKTOP CATALOGUE SHARE
========================================================= */

export async function sharePreparedCatalogueDesktop({
  prepared,
  destination,
  phone,
}) {
  if (
    !prepared ||
    !prepared.files?.length
  ) {
    throw new Error(
      "Catalogue is still preparing."
    );
  }

  /* Other */

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
      }
    }

    prepared.files.forEach(
      (
        file,
        index
      ) => {
        downloadBlob(
          file,
          `${prepared.sca}-${index + 1}.jpg`
        );
      }
    );

    return true;
  }

  /* WhatsApp */

  if (
    destination ===
    "whatsapp"
  ) {
    prepared.files.forEach(
      (
        file,
        index
      ) => {
        downloadBlob(
          file,
          `${prepared.sca}-${index + 1}.jpg`
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
      text:
        prepared.details,
    });

    return true;
  }

  return false;
}

/* =========================================================
   BACKWARD COMPATIBILITY
 *
 * Existing callers can still use
 * shareCatalogue().
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
    products?.[0] ||
    null;

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
    "whatsapp"
  ) {
    return sharePreparedCatalogueDesktop({
      prepared:
        finalPrepared,
      destination:
        "whatsapp",
      phone,
    });
  }

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
    destination:
      "other",
    phone,
  });
}

/* =========================================================
   PUBLIC URL HELPERS
 *
 * Kept for other ERP features.
 *
 * NOT USED FOR CATALOGUE SHARING.
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
