/**
 * SC AURA KURTIS
 * FINAL PROFESSIONAL ERP PDF
 *
 * A4 PORTRAIT
 *
 * Documents:
 * - Booking
 * - Dispatch
 * - Estimate
 * - Return
 *
 * FINAL LOCKS:
 * - A4 portrait
 * - Single clean receipt/invoice layout
 * - Large product image
 * - Separate SCA / Image / Description / Qty / Rate / Amount columns
 * - SCA code shows only trailing number e.g. 0017
 * - Rs. currency text
 * - Totals are ALWAYS below the table
 * - No totals overlay
 * - No QR
 * - No signature
 * - No thank-you note
 * - Footer only SC Aura Kurtis
 */

import jsPDF from "jspdf";

/* =========================================================
   PAGE
========================================================= */

const PAGE_W = 210;
const PAGE_H = 297;

const MARGIN = 9;

const CONTENT_W =
  PAGE_W - MARGIN * 2;

/* =========================================================
   COLORS
========================================================= */

const NAVY = [17, 27, 46];
const NAVY_LIGHT = [28, 41, 64];

const INK = [28, 35, 48];
const MUTED = [105, 114, 128];

const LINE = [220, 224, 230];
const SOFT = [247, 248, 250];

const WHITE = [255, 255, 255];

const GOLD = [190, 154, 65];

/* =========================================================
   BACKEND
========================================================= */

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.REACT_APP_BACKEND_URL ||
  "";

/* =========================================================
   BASIC HELPERS
========================================================= */

function setText(doc, color) {
  doc.setTextColor(
    color[0],
    color[1],
    color[2]
  );
}

function setFill(doc, color) {
  doc.setFillColor(
    color[0],
    color[1],
    color[2]
  );
}

function setLine(doc, color) {
  doc.setDrawColor(
    color[0],
    color[1],
    color[2]
  );
}

function numberValue(
  value,
  fallback = 0
) {
  if (
    typeof value ===
    "number"
  ) {
    return Number.isFinite(value)
      ? value
      : fallback;
  }

  const cleaned =
    String(value ?? "")
      .replace(/₹/g, "")
      .replace(/Rs\.?/gi, "")
      .replace(/,/g, "")
      .trim();

  if (!cleaned) {
    return fallback;
  }

  const parsed =
    Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

/* =========================================================
   MONEY
========================================================= */

function money(value) {
  return (
    "Rs. " +
    new Intl.NumberFormat(
      "en-IN",
      {
        maximumFractionDigits: 0,
      }
    ).format(
      numberValue(value, 0)
    )
  );
}

/* =========================================================
   DATE
========================================================= */

function formatDate(value) {
  if (!value) {
    return "—";
  }

  try {
    return new Date(
      value
    ).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  } catch {
    return String(value);
  }
}

/* =========================================================
   QUANTITY
========================================================= */

function getTotalQuantity(item) {
  if (
    item?.sizes &&
    typeof item.sizes ===
      "object"
  ) {
    return Object.values(
      item.sizes
    ).reduce(
      (
        total,
        quantity
      ) =>
        total +
        numberValue(
          quantity,
          0
        ),
      0
    );
  }

  return numberValue(
    item?.quantity ??
      item?.qty ??
      0,
    0
  );
}

/* =========================================================
   SIZE TEXT
========================================================= */

function getSizeText(item) {
  if (
    !item?.sizes ||
    typeof item.sizes !==
      "object"
  ) {
    return "";
  }

  return Object.entries(
    item.sizes
  )
    .filter(
      ([, quantity]) =>
        numberValue(
          quantity,
          0
        ) > 0
    )
    .map(
      ([size, quantity]) =>
        `${size}: ${quantity}`
    )
    .join("   ");
}

/* =========================================================
   DESCRIPTION
========================================================= */

function getDescription(item) {
  const title =
    String(
      item?.title ||
        item?.name ||
        item?.product_name ||
        item?.description ||
        ""
    ).trim();

  const sizes =
    getSizeText(item);

  if (
    title &&
    sizes
  ) {
    return (
      title +
      "\n" +
      sizes
    );
  }

  return (
    title ||
    sizes ||
    "—"
  );
}

/* =========================================================
   SCA CODE
========================================================= */

/*
 * Examples:
 *
 * SCA-00017 -> 0017
 * SCA-0017  -> 0017
 * 00017     -> 0017
 * 0017      -> 0017
 */

function getShortSCACode(item) {
  const raw =
    String(
      item?.sr_number ||
        item?.sca_code ||
        item?.sku ||
        item?.code ||
        item?.product_code ||
        ""
    ).trim();

  if (!raw) {
    return "—";
  }

  const match =
    raw.match(
      /(\d+)$/
    );

  if (match) {
    let digits =
      match[1];

    /*
     * Remove one leading zero
     * if number is like 00017.
     *
     * 00017 -> 0017
     * 0017  -> 0017
     */
    if (
      digits.length > 4
    ) {
      digits =
        digits.slice(
          -4
        );
    }

    return digits;
  }

  return raw;
}

/* =========================================================
   TOTAL ITEM VALUE
========================================================= */

function calculateItemsTotal(
  items
) {
  if (
    !Array.isArray(items)
  ) {
    return 0;
  }

  return items.reduce(
    (
      total,
      item
    ) => {
      const qty =
        getTotalQuantity(
          item
        );

      const rate =
        numberValue(
          item?.unit_price ??
            item?.rate ??
            item?.price ??
            0,
          0
        );

      return (
        total +
        qty * rate
      );
    },
    0
  );
}

/* =========================================================
   TOTAL PIECES
========================================================= */

function calculateTotalPieces(
  items
) {
  if (
    !Array.isArray(items)
  ) {
    return 0;
  }

  return items.reduce(
    (
      total,
      item
    ) =>
      total +
      getTotalQuantity(
        item
      ),
    0
  );
}

/* =========================================================
   IMAGE HELPERS
========================================================= */

function blobToDataUrl(blob) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const reader =
        new FileReader();

      reader.onload =
        () =>
          resolve(
            reader.result
          );

      reader.onerror =
        reject;

      reader.readAsDataURL(
        blob
      );
    }
  );
}

function getImageType(
  dataUrl
) {
  if (
    String(
      dataUrl || ""
    ).startsWith(
      "data:image/png"
    )
  ) {
    return "PNG";
  }

  if (
    String(
      dataUrl || ""
    ).startsWith(
      "data:image/webp"
    )
  ) {
    return "WEBP";
  }

  return "JPEG";
}

/* =========================================================
   LOAD IMAGE
========================================================= */

async function imageToDataUrl(
  src
) {
  if (!src) {
    return null;
  }

  if (
    typeof src !==
    "string"
  ) {
    return null;
  }

  /*
   * Already encoded.
   */
  if (
    src.startsWith(
      "data:image/"
    )
  ) {
    return src;
  }

  /*
   * Blob URL.
   */
  if (
    src.startsWith(
      "blob:"
    )
  ) {
    try {
      const response =
        await fetch(src);

      if (!response.ok) {
        return null;
      }

      const blob =
        await response.blob();

      return await blobToDataUrl(
        blob
      );
    } catch {
      return null;
    }
  }

  /*
   * External URL.
   *
   * Existing project uses backend
   * proxy for CORS-safe PDF images.
   */
  if (
    src.startsWith(
      "http://"
    ) ||
    src.startsWith(
      "https://"
    )
  ) {
    if (!BACKEND_URL) {
      return null;
    }

    try {
      const proxyUrl =
        `${BACKEND_URL}/api/images/proxy?url=${encodeURIComponent(src)}`;

      const response =
        await fetch(
          proxyUrl
        );

      if (!response.ok) {
        return null;
      }

      const blob =
        await response.blob();

      return await blobToDataUrl(
        blob
      );
    } catch {
      return null;
    }
  }

  /*
   * Relative URL.
   */
  try {
    const response =
      await fetch(src);

    if (!response.ok) {
      return null;
    }

    const blob =
      await response.blob();

    return await blobToDataUrl(
      blob
    );
  } catch {
    return null;
  }
}

/* =========================================================
   PRODUCT IMAGE SOURCE
========================================================= */

function getProductImage(
  item
) {
  /*
   * item.image is the existing
   * ERP field and is checked first.
   */

  return (
    item?.image ||
    item?.image_url ||
    item?.imageUrl ||
    item?.product_image ||
    item?.productImage ||
    item?.photo ||
    item?.photo_url ||
    item?.thumbnail ||
    item?.thumbnail_url ||
    null
  );
}

/* =========================================================
   CREATE PDF
========================================================= */

export function newReceiptDoc() {
  return new jsPDF({
    unit: "mm",

    format: "a4",

    orientation:
      "portrait",

    compress: true,
  });
}

/* =========================================================
   HEADER
========================================================= */

async function drawHeader(
  doc,
  branding,
  title,
  documentNumber
) {
  const y =
    MARGIN;

  const headerHeight =
    34;

  /*
   * LOGO
   */

  const logoSize =
    24;

  const logo =
    await imageToDataUrl(
      branding?.logo_url ||
        branding?.logo
    );

  if (logo) {
    try {
      setFill(
        doc,
        SOFT
      );

      setLine(
        doc,
        LINE
      );

      doc.roundedRect(
        MARGIN,
        y,
        logoSize,
        logoSize,
        2.5,
        2.5,
        "FD"
      );

      doc.addImage(
        logo,
        getImageType(
          logo
        ),
        MARGIN + 1.5,
        y + 1.5,
        21,
        21,
        undefined,
        "FAST"
      );
    } catch {
      // ignore
    }
  }

  /*
   * COMPANY
   */

  const textX =
    MARGIN +
    30;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    18
  );

  setText(
    doc,
    NAVY
  );

  doc.text(
    branding?.company_name ||
      "SC Aura Kurtis",
    textX,
    y + 7
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(
    8
  );

  setText(
    doc,
    MUTED
  );

  const address =
    branding?.address ||
    "Shop No. 14, Ring Road, Surat, Gujarat 395002";

  const phone =
    branding?.phone ||
    "+91 98765 00000";

  const gst =
    branding?.gst ||
    branding?.gstin ||
    "";

  /*
   * Address
   */

  const addressLines =
    doc.splitTextToSize(
      String(address),
      100
    );

  doc.text(
    addressLines,
    textX,
    y + 13
  );

  /*
   * Phone + GST
   */

  doc.text(
    `${phone}${gst ? `   ·   GST: ${gst}` : ""}`,
    textX,
    y + 21
  );

  /*
   * DOCUMENT CARD
   */

  const cardW =
    46;

  const cardH =
    27;

  const cardX =
    PAGE_W -
    MARGIN -
    cardW;

  setFill(
    doc,
    NAVY
  );

  doc.roundedRect(
    cardX,
    y,
    cardW,
    cardH,
    3,
    3,
    "F"
  );

  /*
   * Gold strip
   */

  setFill(
    doc,
    GOLD
  );

  doc.roundedRect(
    cardX,
    y,
    3,
    cardH,
    1.5,
    1.5,
    "F"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    8
  );

  setText(
    doc,
    [215, 220, 230]
  );

  doc.text(
    title,
    cardX +
      cardW / 2,
    y + 9,
    {
      align:
        "center",
    }
  );

  doc.setFontSize(
    14
  );

  setText(
    doc,
    WHITE
  );

  doc.text(
    String(
      documentNumber ||
        ""
    ),
    cardX +
      cardW / 2,
    y + 19,
    {
      align:
        "center",
    }
  );

  /*
   * HEADER DIVIDER
   */

  setLine(
    doc,
    LINE
  );

  doc.line(
    MARGIN,
    y +
      headerHeight,
    PAGE_W -
      MARGIN,
    y +
      headerHeight
  );

  return (
    y +
    headerHeight +
    6
  );
}

/* =========================================================
   INFORMATION BLOCK
========================================================= */

function drawInformation(
  doc,
  entries,
  startY
) {
  const boxH =
    31;

  const gap =
    5;

  const leftW =
    91;

  const rightW =
    CONTENT_W -
    leftW -
    gap;

  const leftX =
    MARGIN;

  const rightX =
    MARGIN +
    leftW +
    gap;

  /*
   * LEFT CARD
   */

  setFill(
    doc,
    SOFT
  );

  setLine(
    doc,
    LINE
  );

  doc.roundedRect(
    leftX,
    startY,
    leftW,
    boxH,
    3,
    3,
    "FD"
  );

  /*
   * RIGHT CARD
   */

  doc.roundedRect(
    rightX,
    startY,
    rightW,
    boxH,
    3,
    3,
    "FD"
  );

  /*
   * LEFT HEADING
   */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    7
  );

  setText(
    doc,
    MUTED
  );

  doc.text(
    "CUSTOMER",
    leftX + 5,
    startY + 7
  );

  /*
   * Customer
   */

  doc.setFontSize(
    11
  );

  setText(
    doc,
    NAVY
  );

  doc.text(
    String(
      entries.customer ||
        "Walk-in Customer"
    ),
    leftX + 5,
    startY + 15
  );

  /*
   * Phone
   */

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(
    7.5
  );

  setText(
    doc,
    MUTED
  );

  doc.text(
    `Phone: ${
      entries.phone || "—"
    }`,
    leftX + 5,
    startY + 23
  );

  /*
   * Shop
   */

  if (
    entries.shop
  ) {
    doc.text(
      `Shop: ${entries.shop}`,
      leftX + 50,
      startY + 23
    );
  }

  /*
   * RIGHT HEADING
   */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    7
  );

  setText(
    doc,
    MUTED
  );

  doc.text(
    "DOCUMENT DETAILS",
    rightX + 5,
    startY + 7
  );

  /*
   * DATE
   */

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(
    7.5
  );

  setText(
    doc,
    MUTED
  );

  doc.text(
    "Date",
    rightX + 5,
    startY + 15
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  setText(
    doc,
    INK
  );

  doc.text(
    String(
      entries.date || "—"
    ),
    rightX + 23,
    startY + 15
  );

  /*
   * STATUS
   */

  doc.setFont(
    "helvetica",
    "normal"
  );

  setText(
    doc,
    MUTED
  );

  doc.text(
    "Status",
    rightX + 5,
    startY + 23
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  setText(
    doc,
    NAVY
  );

  doc.text(
    String(
      entries.status || "—"
    ),
    rightX + 23,
    startY + 23
  );

  return (
    startY +
    boxH +
    7
  );
}

/* =========================================================
   PRODUCT TABLE
========================================================= */

async function drawProductTable(
  doc,
  items,
  startY
) {
  const source =
    Array.isArray(items)
      ? items
      : [];

  /*
   * Load images first.
   */

  const products =
    [];

  for (
    let index = 0;
    index < source.length;
    index++
  ) {
    const item =
      source[index];

    const imageSource =
      getProductImage(
        item
      );

    const image =
      await imageToDataUrl(
        imageSource
      );

    const qty =
      getTotalQuantity(
        item
      );

    const rate =
      numberValue(
        item?.unit_price ??
          item?.rate ??
          item?.price ??
          0,
        0
      );

    products.push({
      item,
      image,
      number:
        index + 1,
      code:
        getShortSCACode(
          item
        ),
      description:
        getDescription(
          item
        ),
      qty,
      rate,
      amount:
        qty * rate,
    });
  }

  /*
   * ========================================================
   * COLUMN WIDTHS
   *
   * A4 width = 210
   * Margins = 9 + 9
   * Available = 192
   *
   * #       8
   * SCA     22
   * IMAGE   38
   * DESC    63
   * QTY     14
   * RATE    22
   * AMOUNT  25
   *
   * TOTAL = 192
   * ========================================================
   */

  const widths = [
    8,
    22,
    38,
    63,
    14,
    22,
    25,
  ];

  const headers = [
    "#",
    "SCA",
    "IMAGE",
    "DESCRIPTION",
    "QTY",
    "RATE",
    "AMOUNT",
  ];

  const tableX =
    MARGIN;

  /*
   * Header height
   */

  const headerH =
    12;

  /*
   * Row height.
   *
   * For normal receipts this gives
   * the image plenty of room.
   */
  let rowH =
    46;

  /*
   * If many products exist,
   * reduce row height so the
   * receipt remains practical.
   */

  if (
    products.length >= 4
  ) {
    rowH = 39;
  }

  if (
    products.length >= 6
  ) {
    rowH = 33;
  }

  /*
   * TABLE HEADER
   */

  let x =
    tableX;

  setFill(
    doc,
    NAVY
  );

  doc.rect(
    tableX,
    startY,
    CONTENT_W,
    headerH,
    "F"
  );

  for (
    let i = 0;
    i < headers.length;
    i++
  ) {
    const width =
      widths[i];

    /*
     * Vertical separator
     */

    if (i > 0) {
      setLine(
        doc,
        [70, 80, 96]
      );

      doc.line(
        x,
        startY,
        x,
        startY +
          headerH
      );
    }

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(
      7
    );

    setText(
      doc,
      WHITE
    );

    let align =
      "left";

    if (
      i === 0 ||
      i === 4
    ) {
      align =
        "center";
    }

    if (
      i === 5 ||
      i === 6
    ) {
      align =
        "right";
    }

    let textX =
      x + 3;

    if (
      align === "center"
    ) {
      textX =
        x +
        width / 2;
    }

    if (
      align === "right"
    ) {
      textX =
        x +
        width -
        3;
    }

    doc.text(
      headers[i],
      textX,
      startY + 7.5,
      {
        align,
      }
    );

    x += width;
  }

  /*
   * BODY ROWS
   */

  let currentY =
    startY +
    headerH;

  products.forEach(
    (
      product,
      index
    ) => {
      const rowY =
        currentY;

      /*
       * Alternate row fill
       */

      if (
        index % 2 === 1
      ) {
        setFill(
          doc,
          [251, 251, 252]
        );

        doc.rect(
          tableX,
          rowY,
          CONTENT_W,
          rowH,
          "F"
        );
      }

      /*
       * Outer row lines
       */

      setLine(
        doc,
        LINE
      );

      doc.line(
        tableX,
        rowY,
        tableX +
          CONTENT_W,
        rowY
      );

      doc.line(
        tableX,
        rowY +
          rowH,
        tableX +
          CONTENT_W,
        rowY +
          rowH
      );

      /*
       * COLUMN VERTICALS
       */

      let columnX =
        tableX;

      for (
        let c = 0;
        c < widths.length;
        c++
      ) {
        if (
          c > 0
        ) {
          setLine(
            doc,
            LINE
          );

          doc.line(
            columnX,
            rowY,
            columnX,
            rowY +
              rowH
          );
        }

        columnX +=
          widths[c];
      }

      /*
       * # COLUMN
       */

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        8
      );

      setText(
        doc,
        INK
      );

      doc.text(
        String(
          product.number
        ),
        tableX +
          widths[0] /
            2,
        rowY +
          rowH / 2 +
          2.5,
        {
          align:
            "center",
        }
      );

      /*
       * SCA COLUMN
       */

      const scaX =
        tableX +
        widths[0];

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        8.5
      );

      setText(
        doc,
        NAVY
      );

      doc.text(
        product.code,
        scaX + 3,
        rowY +
          rowH / 2 +
          2.5
      );

      /*
       * IMAGE COLUMN
       */

      const imageX =
        scaX +
        widths[1];

      /*
       * Image box
       */

      const imageBox =
        Math.min(
          37,
          rowH - 6
        );

      const imageBoxX =
        imageX +
        (
          widths[2] -
          imageBox
        ) /
          2;

      const imageBoxY =
        rowY +
        (
          rowH -
          imageBox
        ) /
          2;

      setFill(
        doc,
        SOFT
      );

      setLine(
        doc,
        LINE
      );

      doc.roundedRect(
        imageBoxX,
        imageBoxY,
        imageBox,
        imageBox,
        2,
        2,
        "FD"
      );

      /*
       * Actual product image
       */

      if (
        product.image
      ) {
        try {
          const imageSize =
            Math.min(
              34,
              imageBox - 2
            );

          const drawX =
            imageX +
            (
              widths[2] -
              imageSize
            ) /
              2;

          const drawY =
            rowY +
            (
              rowH -
              imageSize
            ) /
              2;

          doc.addImage(
            product.image,
            getImageType(
              product.image
            ),
            drawX,
            drawY,
            imageSize,
            imageSize,
            undefined,
            "FAST"
          );
        } catch (
          error
        ) {
          console.warn(
            "Product image failed:",
            error
          );
        }
      } else {
        /*
         * Clean placeholder,
         * no broken icon.
         */

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(
          7
        );

        setText(
          doc,
          MUTED
        );

        doc.text(
          "IMAGE",
          imageX +
            widths[2] /
              2,
          rowY +
            rowH / 2 +
            2,
          {
            align:
              "center",
          }
        );
      }

      /*
       * DESCRIPTION
       */

      const descX =
        imageX +
        widths[2];

      const descWidth =
        widths[3];

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        9
      );

      setText(
        doc,
        NAVY
      );

      const descLines =
        doc.splitTextToSize(
          product.description,
          descWidth - 7
        );

      /*
       * Vertically centre description.
       */

      const lineHeight =
        4.2;

      const totalTextH =
        descLines.length *
        lineHeight;

      const descY =
        rowY +
        Math.max(
          8,
          (
            rowH -
            totalTextH
          ) /
            2 +
            3
        );

      doc.text(
        descLines,
        descX + 3.5,
        descY,
        {
          maxWidth:
            descWidth - 7,
        }
      );

      /*
       * QTY
       */

      const qtyX =
        descX +
        descWidth;

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        9
      );

      setText(
        doc,
        INK
      );

      doc.text(
        String(
          product.qty
        ),
        qtyX +
          widths[4] /
            2,
        rowY +
          rowH / 2 +
          3,
        {
          align:
            "center",
        }
      );

      /*
       * RATE
       */

      const rateX =
        qtyX +
        widths[4];

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        8.5
      );

      setText(
        doc,
        INK
      );

      doc.text(
        money(
          product.rate
        ),
        rateX +
          widths[5] -
          3,
        rowY +
          rowH / 2 +
          3,
        {
          align:
            "right",
        }
      );

      /*
       * AMOUNT
       */

      const amountX =
        rateX +
        widths[5];

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        8.5
      );

      setText(
        doc,
        NAVY
      );

      doc.text(
        money(
          product.amount
        ),
        amountX +
          widths[6] -
          3,
        rowY +
          rowH / 2 +
          3,
        {
          align:
            "right",
        }
      );

      currentY +=
        rowH;
    }
  );

  /*
   * Bottom table border
   */

  setLine(
    doc,
    LINE
  );

  doc.line(
    tableX,
    currentY,
    tableX +
      CONTENT_W,
    currentY
  );

  return currentY;
}

/* =========================================================
   TOTALS BOX
========================================================= */

function drawTotalsBox(
  doc,
  lines,
  startY
) {
  const boxW =
    82;

  const rowH =
    7;

  const boxH =
    10 +
    lines.length *
      rowH;

  const boxX =
    PAGE_W -
    MARGIN -
    boxW;

  /*
   * IMPORTANT:
   * This box is drawn only AFTER
   * the complete table has ended.
   */

  setFill(
    doc,
    SOFT
  );

  setLine(
    doc,
    LINE
  );

  doc.roundedRect(
    boxX,
    startY,
    boxW,
    boxH,
    3,
    3,
    "FD"
  );

  let y =
    startY + 7;

  lines.forEach(
    (
      line,
      index
    ) => {
      const [
        label,
        value,
        bold,
      ] = line;

      /*
       * Divider before highlighted
       * final line.
       */

      if (
        bold &&
        index > 0
      ) {
        setLine(
          doc,
          LINE
        );

        doc.line(
          boxX + 4,
          y - 4.5,
          boxX +
            boxW -
            4,
          y - 4.5
        );
      }

      doc.setFont(
        "helvetica",
        bold
          ? "bold"
          : "normal"
      );

      doc.setFontSize(
        bold
          ? 9
          : 8.2
      );

      setText(
        doc,
        bold
          ? NAVY
          : MUTED
      );

      doc.text(
        String(label),
        boxX + 5,
        y
      );

      doc.setFont(
        "helvetica",
        bold
          ? "bold"
          : "normal"
      );

      setText(
        doc,
        INK
      );

      doc.text(
        String(value),
        boxX +
          boxW -
          5,
        y,
        {
          align:
            "right",
        }
      );

      y +=
        rowH;
    }
  );

  return (
    startY +
    boxH
  );
}

/* =========================================================
   FOOTER
========================================================= */

function drawFooter(
  doc,
  branding
) {
  const footerY =
    PAGE_H -
    10;

  setLine(
    doc,
    LINE
  );

  doc.line(
    MARGIN,
    footerY - 5,
    PAGE_W -
      MARGIN,
    footerY - 5
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    8.5
  );

  setText(
    doc,
    INK
  );

  doc.text(
    branding?.company_name ||
      "SC Aura Kurtis",
    PAGE_W / 2,
    footerY,
    {
      align:
        "center",
    }
  );
}

/* =========================================================
   CUSTOMER HELPER
========================================================= */

function customerData(
  snapshot
) {
  return {
    customer:
      snapshot?.name ||
      snapshot?.customer_name ||
      "Walk-in Customer",

    phone:
      snapshot?.phone ||
      snapshot?.mobile ||
      "",

    shop:
      snapshot?.shop_name ||
      snapshot?.shop ||
      "",
  };
}

/* =========================================================
   BOOKING
========================================================= */

export async function buildBookingPDF(
  booking,
  branding
) {
  const doc =
    newReceiptDoc();

  let y =
    await drawHeader(
      doc,
      branding,
      "BOOKING",
      booking?.booking_no
    );

  const customer =
    customerData(
      booking?.customer_snapshot
    );

  y =
    drawInformation(
      doc,
      {
        ...customer,

        date:
          formatDate(
            booking?.created_at
          ),

        status:
          String(
            booking?.status ||
              "CONFIRMED"
          ).toUpperCase(),
      },
      y
    );

  const tableEnd =
    await drawProductTable(
      doc,
      booking?.items ||
        [],
      y
    );

  const itemTotal =
    numberValue(
      booking?.item_total,
      calculateItemsTotal(
        booking?.items ||
          []
      )
    );

  const advance =
    numberValue(
      booking?.advance_received,
      0
    );

  const remaining =
    numberValue(
      booking?.remaining,
      Math.max(
        0,
        itemTotal -
          advance
      )
    );

  const pieces =
    calculateTotalPieces(
      booking?.items ||
        []
    );

  /*
   * Totals start AFTER table.
   */

  drawTotalsBox(
    doc,
    [
      [
        "Item Total",
        money(itemTotal),
        false,
      ],

      [
        "Advance Received",
        money(advance),
        false,
      ],

      [
        "Remaining",
        money(remaining),
        true,
      ],

      [
        "Total Pieces",
        String(pieces),
        false,
      ],
    ],
    tableEnd + 7
  );

  drawFooter(
    doc,
    branding
  );

  return doc;
}

/* =========================================================
   DISPATCH
========================================================= */

export async function buildDispatchPDF(
  dispatch,
  branding
) {
  const doc =
    newReceiptDoc();

  let y =
    await drawHeader(
      doc,
      branding,
      "DISPATCH",
      dispatch?.dispatch_no
    );

  y =
    drawInformation(
      doc,
      {
        customer:
          dispatch?.dispatch_to ||
          dispatch?.customer_name ||
          "—",

        phone:
          dispatch?.phone ||
          dispatch?.customer_phone ||
          "",

        shop:
          dispatch?.shop_name ||
          "",

        date:
          formatDate(
            dispatch?.created_at
          ),

        status:
          String(
            dispatch?.payment_status ||
              (
                numberValue(
                  dispatch?.final_payable,
                  0
                ) <= 0
                  ? "PAID"
                  : "PENDING"
              )
          ).toUpperCase(),
      },
      y
    );

  const tableEnd =
    await drawProductTable(
      doc,
      dispatch?.items ||
        [],
      y
    );

  const itemTotal =
    numberValue(
      dispatch?.item_total,
      calculateItemsTotal(
        dispatch?.items ||
          []
      )
    );

  const delivery =
    numberValue(
      dispatch?.delivery_charges,
      0
    );

  const grandTotal =
    numberValue(
      dispatch?.grand_total,
      itemTotal +
        delivery
    );

  const advance =
    numberValue(
      dispatch?.advance_received,
      0
    );

  const finalPayable =
    numberValue(
      dispatch?.final_payable,
      Math.max(
        0,
        grandTotal -
          advance
      )
    );

  const pieces =
    calculateTotalPieces(
      dispatch?.items ||
        []
    );

  drawTotalsBox(
    doc,
    [
      [
        "Item Total",
        money(itemTotal),
        false,
      ],

      [
        "Delivery Charges",
        money(delivery),
        false,
      ],

      [
        "Grand Total",
        money(grandTotal),
        false,
      ],

      [
        "Advance Received",
        money(advance),
        false,
      ],

      [
        "Final Payable",
        money(finalPayable),
        true,
      ],

      [
        "Total Pieces",
        String(pieces),
        false,
      ],
    ],
    tableEnd + 7
  );

  drawFooter(
    doc,
    branding
  );

  return doc;
}

/* =========================================================
   ESTIMATE
========================================================= */

export async function buildEstimatePDF(
  estimate,
  branding
) {
  const doc =
    newReceiptDoc();

  let y =
    await drawHeader(
      doc,
      branding,
      "ESTIMATE",
      estimate?.estimate_no
    );

  y =
    drawInformation(
      doc,
      {
        customer:
          estimate?.customer_name ||
          "Walk-in Customer",

        phone:
          estimate?.customer_phone ||
          "",

        shop:
          estimate?.shop_name ||
          "",

        date:
          formatDate(
            estimate?.created_at
          ),

        status:
          String(
            estimate?.status ||
              "ACTIVE"
          ).toUpperCase(),
      },
      y
    );

  const tableEnd =
    await drawProductTable(
      doc,
      estimate?.items ||
        [],
      y
    );

  const itemTotal =
    numberValue(
      estimate?.item_total,
      calculateItemsTotal(
        estimate?.items ||
          []
      )
    );

  const delivery =
    numberValue(
      estimate?.delivery_charges,
      0
    );

  const grandTotal =
    numberValue(
      estimate?.grand_total,
      itemTotal +
        delivery
    );

  const advance =
    numberValue(
      estimate?.advance_received,
      0
    );

  const remaining =
    numberValue(
      estimate?.remaining,
      Math.max(
        0,
        grandTotal -
          advance
      )
    );

  drawTotalsBox(
    doc,
    [
      [
        "Item Total",
        money(itemTotal),
        false,
      ],

      [
        "Delivery Charges",
        money(delivery),
        false,
      ],

      [
        "Grand Total",
        money(grandTotal),
        false,
      ],

      [
        "Advance Received",
        money(advance),
        false,
      ],

      [
        "Remaining",
        money(remaining),
        true,
      ],
    ],
    tableEnd + 7
  );

  drawFooter(
    doc,
    branding
  );

  return doc;
}

/* =========================================================
   RETURN
========================================================= */

export async function buildReturnPDF(
  returnData,
  branding
) {
  const doc =
    newReceiptDoc();

  let y =
    await drawHeader(
      doc,
      branding,
      "RETURN",
      returnData?.return_no
    );

  y =
    drawInformation(
      doc,
      {
        customer:
          returnData?.vendor_name ||
          "—",

        phone:
          "",

        shop:
          "",

        date:
          formatDate(
            returnData?.created_at
          ),

        status:
          "VENDOR RETURN",
      },
      y
    );

  const tableEnd =
    await drawProductTable(
      doc,
      returnData?.items ||
        [],
      y
    );

  const itemTotal =
    numberValue(
      returnData?.item_total,
      calculateItemsTotal(
        returnData?.items ||
          []
      )
    );

  const pieces =
    calculateTotalPieces(
      returnData?.items ||
        []
    );

  drawTotalsBox(
    doc,
    [
      [
        "Item Total",
        money(itemTotal),
        true,
      ],

      [
        "Pieces Returned",
        String(pieces),
        false,
      ],
    ],
    tableEnd + 7
  );

  drawFooter(
    doc,
    branding
  );

  return doc;
}

/* =========================================================
   DOWNLOAD
========================================================= */

export async function downloadPDF(
  doc,
  filename
) {
  if (!doc) {
    throw new Error(
      "PDF document is missing."
    );
  }

  doc.save(
    filename ||
      "SC-Aura-Receipt.pdf"
  );
}

/* =========================================================
   SHARE
========================================================= */

export async function sharePDF(
  doc,
  filename,
  phone
) {
  if (!doc) {
    throw new Error(
      "PDF document is missing."
    );
  }

  const finalFilename =
    filename ||
    "SC-Aura-Receipt.pdf";

  const blob =
    doc.output("blob");

  const file =
    new File(
      [blob],
      finalFilename,
      {
        type:
          "application/pdf",
      }
    );

  /*
   * Native file sharing
   */

  if (
    navigator.canShare &&
    navigator.canShare({
      files: [file],
    })
  ) {
    try {
      await navigator.share({
        files: [file],
        title:
          finalFilename,
      });

      return true;
    } catch {
      // fallback
    }
  }

  /*
   * Download fallback
   */

  doc.save(
    finalFilename
  );

  /*
   * WhatsApp fallback
   */

  const cleanPhone =
    String(
      phone || ""
    )
      .replace(
        /[^\d]/g,
        ""
      );

  const text =
    encodeURIComponent(
      `${finalFilename} - SC Aura Kurtis`
    );

  const whatsappUrl =
    cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;

  window.open(
    whatsappUrl,
    "_blank",
    "noopener"
  );

  return false;
}
