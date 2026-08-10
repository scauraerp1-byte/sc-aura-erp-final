/**
 * SC AURA KURTIS
 * Professional A5 ERP Receipts
 *
 * Documents:
 * - Booking
 * - Dispatch
 * - Estimate
 * - Return
 *
 * Locked receipt format:
 * - Company header
 * - Document number
 * - Customer/meta information
 * - Product image + description in the same dedicated cell
 * - Clean totals box
 * - Footer: SC Aura Kurtis only
 *
 * No QR
 * No signature
 * No thank-you note
 * No extra footer text
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_W = 148;
const PAGE_H = 210;
const MARGIN = 10;

const INK = [17, 24, 39];
const MUTE = [107, 114, 128];
const LINE = [229, 231, 235];
const SOFT = [248, 250, 252];
const WHITE = [255, 255, 255];

/* =========================================================
   MONEY / NUMBER HELPERS
========================================================= */

function toFiniteNumber(value, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  const cleaned = String(value ?? "")
    .replace(/\u20B9/g, "")
    .replace(/Rs\.?/gi, "")
    .replace(/,/g, "")
    .trim();

  if (!cleaned) {
    return fallback;
  }

  const numeric = Number(cleaned);

  return Number.isFinite(numeric)
    ? numeric
    : fallback;
}

function getMoneyNumber(value) {
  const numeric = toFiniteNumber(value, 0);

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(numeric);
}

/*
 * jsPDF's built-in Helvetica does not reliably contain the ₹ glyph.
 * Draw a small vector rupee mark so PDF text never becomes NaN or
 * loses the currency symbol.
 */
function drawRupeeMark(doc, x, y, size = 3.2) {
  const top = y - size * 0.72;
  const right = x + size * 0.82;
  const mid = y - size * 0.16;
  const bottom = y + size * 0.58;

  doc.setLineWidth(0.35);

  doc.setDrawColor(
    INK[0],
    INK[1],
    INK[2]
  );

  doc.line(
    x,
    top,
    right,
    top
  );

  doc.line(
    x,
    top + size * 0.18,
    right,
    top + size * 0.18
  );

  doc.line(
    x,
    mid,
    right - size * 0.08,
    mid
  );

  doc.line(
    x + size * 0.05,
    mid,
    right - size * 0.18,
    bottom
  );

  doc.setLineWidth(0.2);
}

function drawMoneyRight(
  doc,
  value,
  rightX,
  y,
  {
    fontSize = 8.5,
    bold = false,
  } = {}
) {
  const numberText =
    getMoneyNumber(value);

  doc.setFont(
    "helvetica",
    bold ? "bold" : "normal"
  );

  doc.setFontSize(fontSize);

  doc.setTextColor(
    INK[0],
    INK[1],
    INK[2]
  );

  const numberWidth =
    doc.getTextWidth(numberText);

  const symbolWidth = 3.2;
  const symbolGap = 1.2;

  const startX =
    rightX -
    symbolWidth -
    symbolGap -
    numberWidth;

  drawRupeeMark(
    doc,
    startX,
    y - 0.25,
    Math.min(
      3.6,
      Math.max(
        2.8,
        fontSize * 0.38
      )
    )
  );

  doc.text(
    numberText,
    rightX,
    y,
    {
      align: "right",
    }
  );
}

/* =========================================================
   BACKEND URL
========================================================= */

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.REACT_APP_BACKEND_URL ||
  "";

/* =========================================================
   IMAGE HELPERS
========================================================= */

/**
 * Convert an image source into a data URL.
 *
 * IMPORTANT:
 * External URLs are NOT fetched directly from the browser.
 * They are routed through the backend proxy to avoid CORS.
 */
async function imageToDataUrl(src) {
  if (!src) {
    return null;
  }

  if (typeof src !== "string") {
    return null;
  }

  /* Already a data URL */
  if (src.startsWith("data:image/")) {
    return src;
  }

  /* Blob URL */
  if (src.startsWith("blob:")) {
    try {
      const response = await fetch(src);

      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();

      return await blobToDataUrl(blob);
    } catch {
      return null;
    }
  }

  /* Absolute external URL */
  if (
    src.startsWith("http://") ||
    src.startsWith("https://")
  ) {
    try {
      if (!BACKEND_URL) {
        console.warn(
          "PDF image skipped: backend URL is not configured.",
          src
        );

        return null;
      }

      const proxyUrl =
        `${BACKEND_URL}/api/images/proxy?url=${encodeURIComponent(src)}`;

      const response = await fetch(proxyUrl);

      if (!response.ok) {
        console.warn(
          "PDF image proxy failed:",
          response.status,
          src
        );

        return null;
      }

      const blob = await response.blob();

      return await blobToDataUrl(blob);
    } catch (error) {
      console.warn(
        "PDF image loading failed:",
        src,
        error
      );

      return null;
    }
  }

  /* Relative URL */
  try {
    const response = await fetch(src);

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
}

/**
 * Detect correct image type for jsPDF.
 */
function getImageType(dataUrl) {
  if (
    !dataUrl ||
    typeof dataUrl !== "string"
  ) {
    return "JPEG";
  }

  if (
    dataUrl.startsWith(
      "data:image/png"
    )
  ) {
    return "PNG";
  }

  if (
    dataUrl.startsWith(
      "data:image/webp"
    )
  ) {
    return "WEBP";
  }

  return "JPEG";
}

/* =========================================================
   PDF BASE
========================================================= */

export function newReceiptDoc() {
  return new jsPDF({
    unit: "mm",
    format: "a5",
    orientation: "portrait",
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
  const y = MARGIN;

  const logoSize = 20;
  const headerHeight = 30;

  let textX = MARGIN;

  /*
   * Logo
   */
  if (branding?.logo_url) {
    const logo =
      await imageToDataUrl(
        branding.logo_url
      );

    if (logo) {
      try {
        const type =
          getImageType(logo);

        doc.addImage(
          logo,
          type,
          MARGIN,
          y,
          logoSize,
          logoSize
        );

        textX =
          MARGIN + 24;
      } catch {
        textX = MARGIN;
      }
    }
  }

  /*
   * Company name
   */
  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(15);

  doc.setTextColor(
    INK[0],
    INK[1],
    INK[2]
  );

  doc.text(
    branding?.company_name ||
      "SC Aura Kurtis",
    textX,
    y + 5.5
  );

  /*
   * Company information
   */
  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8.2);

  doc.setTextColor(
    MUTE[0],
    MUTE[1],
    MUTE[2]
  );

  const information = [];

  if (branding?.address) {
    information.push(
      branding.address
    );
  }

  const secondLine = [
    branding?.phone || null,
    branding?.gst
      ? `GST: ${branding.gst}`
      : null,
  ].filter(Boolean);

  if (secondLine.length) {
    information.push(
      secondLine.join("  ·  ")
    );
  }

  let infoY =
    y + 10.5;

  for (const line of information) {
    const wrapped =
      doc.splitTextToSize(
        String(line),
        PAGE_W -
          textX -
          MARGIN -
          44
      );

    doc.text(
      wrapped,
      textX,
      infoY
    );

    infoY +=
      wrapped.length * 3.5;
  }

  /*
   * Document number box
   */
  const boxW = 44;
  const boxH = 20;

  const boxX =
    PAGE_W -
    MARGIN -
    boxW;

  doc.setDrawColor(
    LINE[0],
    LINE[1],
    LINE[2]
  );

  doc.setFillColor(
    SOFT[0],
    SOFT[1],
    SOFT[2]
  );

  doc.roundedRect(
    boxX,
    y,
    boxW,
    boxH,
    2.5,
    2.5,
    "FD"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);

  doc.setTextColor(
    INK[0],
    INK[1],
    INK[2]
  );

  doc.text(
    title,
    boxX +
      boxW / 2,
    y + 7,
    {
      align: "center",
    }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(10.5);

  doc.text(
    documentNumber || "",
    boxX +
      boxW / 2,
    y + 14,
    {
      align: "center",
    }
  );

  /*
   * Divider
   */
  const dividerY =
    y +
    headerHeight +
    1;

  doc.setDrawColor(
    LINE[0],
    LINE[1],
    LINE[2]
  );

  doc.line(
    MARGIN,
    dividerY,
    PAGE_W - MARGIN,
    dividerY
  );

  return dividerY + 5;
}

/* =========================================================
   META BLOCK
========================================================= */

function drawMetaBlock(
  doc,
  entries,
  startY
) {
  const contentWidth =
    PAGE_W -
    MARGIN * 2;

  const colWidth =
    contentWidth / 2;

  const rowHeight = 6.5;

  const rows =
    Math.ceil(
      entries.length / 2
    );

  doc.setFontSize(8.5);

  for (
    let index = 0;
    index < entries.length;
    index++
  ) {
    const [
      label,
      value,
    ] = entries[index];

    const column =
      index % 2;

    const row =
      Math.floor(
        index / 2
      );

    const x =
      MARGIN +
      column * colWidth;

    const y =
      startY +
      row * rowHeight;

    /*
     * Label
     */
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setTextColor(
      MUTE[0],
      MUTE[1],
      MUTE[2]
    );

    doc.text(
      String(label),
      x,
      y
    );

    /*
     * Value
     */
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setTextColor(
      INK[0],
      INK[1],
      INK[2]
    );

    const valueText =
      value === null ||
      value === undefined ||
      value === ""
        ? "—"
        : String(value);

    const wrapped =
      doc.splitTextToSize(
        valueText,
        colWidth - 28
      );

    doc.text(
      wrapped,
      x + 23,
      y
    );
  }

  return (
    startY +
    rows * rowHeight +
    3
  );
}

/* =========================================================
   PRODUCT HELPERS
========================================================= */

function getSizeText(item) {
  if (
    !item ||
    !item.sizes ||
    typeof item.sizes !== "object"
  ) {
    return "";
  }

  return Object.entries(
    item.sizes
  )
    .filter(
      ([, quantity]) =>
        Number(quantity || 0) > 0
    )
    .map(
      ([size, quantity]) =>
        `${size}:${quantity}`
    )
    .join("  ");
}

function getTotalQuantity(item) {
  if (
    !item ||
    !item.sizes ||
    typeof item.sizes !== "object"
  ) {
    return Number(
      item?.quantity || 0
    );
  }

  return Object.values(
    item.sizes
  ).reduce(
    (
      total,
      quantity
    ) =>
      total +
      Number(
        quantity || 0
      ),
    0
  );
}

/* =========================================================
   PRODUCT TABLE
========================================================= */

async function drawItemsTable(
  doc,
  items,
  startY,
  {
    showPrice = true,
    showImages = true,
  } = {}
) {
  const sourceItems =
    Array.isArray(items)
      ? items
      : [];

  /*
   * Prepare all images before
   * AutoTable starts.
   */
  const preparedItems = [];

  for (
    let index = 0;
    index < sourceItems.length;
    index++
  ) {
    const item =
      sourceItems[index];

    const totalQty =
      getTotalQuantity(item);

    const sizeText =
      getSizeText(item);

    let image = null;

    if (
      showImages &&
      item?.image
    ) {
      image =
        await imageToDataUrl(
          item.image
        );
    }

    const description =
      `${item?.title || ""}` +
      `${
        sizeText
          ? `\n${sizeText}`
          : ""
      }`;

    const unitPrice =
      Number(
        item?.unit_price || 0
      );

    const amount =
      totalQty *
      unitPrice;

    preparedItems.push({
      item,
      image,
      description,
      totalQty,
      unitPrice,
      amount,
    });
  }

  const head =
    showPrice
      ? [
          [
            "#",
            "SCA",
            "Item / Description",
            "Qty",
            "Rate",
            "Amount",
          ],
        ]
      : [
          [
            "#",
            "SCA",
            "Item / Description",
            "Qty",
          ],
        ];

  /*
   * When an image exists, Item / Description is intentionally
   * blank in AutoTable. The cell is rendered manually so the
   * description can never overlap the image.
   */
  const body =
    preparedItems.map(
      (
        entry,
        index
      ) => {
        if (showPrice) {
          return [
            String(index + 1),

            entry.item?.sr_number ||
              "",

            entry.image
              ? ""
              : entry.description,

            String(
              entry.totalQty
            ),

            "",

            "",
          ];
        }

        return [
          String(index + 1),

          entry.item?.sr_number ||
            "",

          entry.image
            ? ""
            : entry.description,

          String(
            entry.totalQty
          ),
        ];
      }
    );

  autoTable(doc, {
    startY,

    head,
    body,

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 8.1,
      cellPadding: 2.2,

      lineColor: LINE,
      lineWidth: 0.15,

      textColor: INK,

      valign: "middle",

      overflow: "linebreak",
    },

    headStyles: {
      fillColor: INK,
      textColor: WHITE,

      fontStyle: "bold",

      fontSize: 8,

      halign: "left",

      valign: "middle",
    },

    alternateRowStyles: {
      fillColor: SOFT,
    },

    /*
     * Total width = 128mm
     *
     * #       8
     * SCA    24
     * Item   43
     * Qty    11
     * Rate   19
     * Amount 23
     *
     * This keeps SCA-00017 on one line while keeping the
     * overall table width unchanged.
     */
    columnStyles:
      showPrice
        ? {
            0: {
              cellWidth: 8,
              halign: "center",
            },

            1: {
              cellWidth: 24,
              fontStyle: "bold",
              overflow: "ellipsize",
            },

            2: {
              cellWidth: 43,
            },

            3: {
              cellWidth: 11,
              halign: "right",
            },

            4: {
              cellWidth: 19,
              halign: "right",
            },

            5: {
              cellWidth: 23,
              halign: "right",
              fontStyle: "bold",
            },
          }
        : {
            0: {
              cellWidth: 8,
              halign: "center",
            },

            1: {
              cellWidth: 24,
              fontStyle: "bold",
              overflow: "ellipsize",
            },

            2: {
              cellWidth: 82,
            },

            3: {
              cellWidth: 14,
              halign: "right",
            },
          },

    margin: {
      left: MARGIN,
      right: MARGIN,
    },

    /*
     * Reserve enough height for product image +
     * description.
     */
    didParseCell(data) {
      if (
        data.section !==
          "body" ||
        data.column.index !== 2
      ) {
        return;
      }

      const entry =
        preparedItems[
          data.row.index
        ];

      if (!entry?.image) {
        return;
      }

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8.1);

      const textWidth =
        Math.max(
          12,
          data.cell.width -
            24
        );

      const lines =
        doc.splitTextToSize(
          entry.description ||
            "",
          textWidth
        );

      const textHeight =
        lines.length *
          3.8 +
        5;

      /*
       * Critical:
       * Remove AutoTable's original text completely.
       */
      data.cell.text = [];

      data.cell.minCellHeight =
        Math.max(
          data.cell.minCellHeight ||
            0,
          25,
          textHeight
        );
    },

    /*
     * Draw image + description inside
     * Item / Description cell.
     */
    didDrawCell(data) {
      if (
        data.section !==
        "body"
      ) {
        return;
      }

      const entry =
        preparedItems[
          data.row.index
        ];

      if (!entry) {
        return;
      }

      /*
       * ITEM / DESCRIPTION
       */
      if (
        data.column.index === 2 &&
        entry.image
      ) {
        const cell =
          data.cell;

        try {
          const padding = 2;

          const imageSize =
            Math.min(
              17,
              cell.height -
                padding * 2
            );

          const imageX =
            cell.x + padding;

          const imageY =
            cell.y +
            (
              cell.height -
              imageSize
            ) /
              2;

          /*
           * Clear the dedicated image area.
           */
          doc.setFillColor(
            cell.fillColor?.[0] ??
              SOFT[0],

            cell.fillColor?.[1] ??
              SOFT[1],

            cell.fillColor?.[2] ??
              SOFT[2]
          );

          doc.rect(
            cell.x + 0.7,
            cell.y + 0.7,
            19,
            Math.max(
              1,
              cell.height -
                1.4
            ),
            "F"
          );

          /*
           * Product image.
           */
          doc.addImage(
            entry.image,
            getImageType(
              entry.image
            ),
            imageX,
            imageY,
            imageSize,
            imageSize
          );

          /*
           * Description to the right of image.
           */
          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.setFontSize(
            8.1
          );

          doc.setTextColor(
            INK[0],
            INK[1],
            INK[2]
          );

          const textX =
            cell.x + 21.5;

          const availableWidth =
            Math.max(
              12,
              cell.width -
                23.5
            );

          const text =
            doc.splitTextToSize(
              entry.description ||
                "",
              availableWidth
            );

          const lineHeight = 3.8;

          const totalTextHeight =
            text.length *
            lineHeight;

          const textY =
            cell.y +
            Math.max(
              4.2,
              (
                cell.height -
                totalTextHeight
              ) /
                2 +
                2.8
            );

          doc.text(
            text,
            textX,
            textY
          );
        } catch (error) {
          console.warn(
            "Unable to draw product image:",
            error
          );
        }

        return;
      }

      /*
       * RATE / AMOUNT
       *
       * These are drawn manually because Helvetica does not
       * reliably render the ₹ Unicode character.
       */
      if (
        showPrice &&
        (
          data.column.index ===
            4 ||
          data.column.index ===
            5
        )
      ) {
        const cell =
          data.cell;

        drawMoneyRight(
          doc,

          data.column.index ===
            4
            ? entry.unitPrice
            : entry.amount,

          cell.x +
            cell.width -
            2.2,

          cell.y +
            cell.height /
              2 +
            2.7,

          {
            fontSize: 8.1,

            bold:
              data.column.index ===
              5,
          }
        );
      }
    },
  });

  return (
    doc.lastAutoTable.finalY +
    5
  );
}

/* =========================================================
   TOTALS BOX
========================================================= */

function drawTotalsBlock(
  doc,
  lines,
  startY
) {
  const boxW = 70;
  const rowH = 6.5;

  const boxX =
    PAGE_W -
    MARGIN -
    boxW;

  const boxH =
    lines.length *
      rowH +
    8;

  /*
   * Box
   */
  doc.setDrawColor(
    LINE[0],
    LINE[1],
    LINE[2]
  );

  doc.setFillColor(
    SOFT[0],
    SOFT[1],
    SOFT[2]
  );

  doc.roundedRect(
    boxX,
    startY,
    boxW,
    boxH,
    2.5,
    2.5,
    "FD"
  );

  let currentY =
    startY + 5.5;

  for (
    let index = 0;
    index < lines.length;
    index++
  ) {
    const [
      label,
      value,
      bold,
    ] = lines[index];

    /*
     * Divider before highlighted final value.
     */
    if (
      bold &&
      index > 0
    ) {
      doc.setDrawColor(
        LINE[0],
        LINE[1],
        LINE[2]
      );

      doc.line(
        boxX + 3,
        currentY - 4.2,
        boxX +
          boxW -
          3,
        currentY - 4.2
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
        : 8.5
    );

    doc.setTextColor(
      bold
        ? INK[0]
        : MUTE[0],

      bold
        ? INK[1]
        : MUTE[1],

      bold
        ? INK[2]
        : MUTE[2]
    );

    doc.text(
      String(label),
      boxX + 3,
      currentY
    );

    /*
     * Numeric values = money.
     *
     * String values = pieces/counts.
     */
    if (
      typeof value ===
      "number"
    ) {
      drawMoneyRight(
        doc,
        value,
        boxX +
          boxW -
          3,
        currentY,
        {
          fontSize:
            bold
              ? 9
              : 8.5,

          bold,
        }
      );
    } else {
      doc.setTextColor(
        INK[0],
        INK[1],
        INK[2]
      );

      doc.setFont(
        "helvetica",
        bold
          ? "bold"
          : "normal"
      );

      doc.setFontSize(
        bold
          ? 9
          : 8.5
      );

      doc.text(
        String(value),
        boxX +
          boxW -
          3,
        currentY,
        {
          align: "right",
        }
      );
    }

    currentY += rowH;
  }

  return (
    startY +
    boxH +
    5
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
    PAGE_H - 13;

  doc.setDrawColor(
    LINE[0],
    LINE[1],
    LINE[2]
  );

  doc.line(
    MARGIN,
    footerY - 5,
    PAGE_W - MARGIN,
    footerY - 5
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);

  doc.setTextColor(
    INK[0],
    INK[1],
    INK[2]
  );

  /*
   * LOCKED:
   * Footer only company name.
   */
  doc.text(
    branding?.company_name ||
      "SC Aura Kurtis",

    PAGE_W / 2,

    footerY,

    {
      align: "center",
    }
  );
}

/* =========================================================
   TOTAL PIECES
========================================================= */

function calculateTotalPieces(
  items
) {
  return (
    Array.isArray(items)
      ? items
      : []
  ).reduce(
    (
      total,
      item
    ) =>
      total +
      getTotalQuantity(item),
    0
  );
}

function calculateItemsTotal(
  items
) {
  return (
    Array.isArray(items)
      ? items
      : []
  ).reduce(
    (
      total,
      item
    ) => {
      const quantity =
        getTotalQuantity(item);

      const rate =
        toFiniteNumber(
          item?.unit_price,
          0
        );

      return (
        total +
        quantity * rate
      );
    },
    0
  );
}

function firstValidNumber(
  ...values
) {
  for (
    const value of values
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    const numeric =
      toFiniteNumber(
        value,
        NaN
      );

    if (
      Number.isFinite(
        numeric
      )
    ) {
      return numeric;
    }
  }

  return 0;
}

/* =========================================================
   BOOKING PDF
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

  y =
    drawMetaBlock(
      doc,
      [
        [
          "Date",
          booking?.created_at
            ? new Date(
                booking.created_at
              ).toLocaleString()
            : "—",
        ],

        [
          "Booking No",
          booking?.booking_no ||
            "—",
        ],

        [
          "Customer",
          booking
            ?.customer_snapshot
            ?.name ||
            "—",
        ],

        [
          "Shop",
          booking
            ?.customer_snapshot
            ?.shop_name ||
            "—",
        ],

        [
          "Phone",
          booking
            ?.customer_snapshot
            ?.phone ||
            "—",
        ],

        [
          "Status",
          (
            booking?.status ||
            ""
          ).toUpperCase() ||
            "—",
        ],
      ],
      y
    );

  const bookingItems =
    booking?.items || [];

  y =
    await drawItemsTable(
      doc,
      bookingItems,
      y,
      {
        showPrice: true,
        showImages: true,
      }
    );

  const itemTotal =
    firstValidNumber(
      booking?.item_total,
      calculateItemsTotal(
        bookingItems
      )
    );

  const advanceReceived =
    firstValidNumber(
      booking?.advance_received,
      0
    );

  const remaining =
    firstValidNumber(
      booking?.remaining,
      Math.max(
        0,
        itemTotal -
          advanceReceived
      )
    );

  const totalPieces =
    calculateTotalPieces(
      bookingItems
    );

  y =
    drawTotalsBlock(
      doc,
      [
        [
          "Item Total",
          itemTotal,
          false,
        ],

        [
          "Advance Received",
          advanceReceived,
          false,
        ],

        [
          "Remaining",
          remaining,
          true,
        ],

        [
          "Total Pieces",
          String(
            totalPieces
          ),
          false,
        ],
      ],
      y
    );

  drawFooter(
    doc,
    branding
  );

  return doc;
}

/* =========================================================
   DISPATCH PDF
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
    drawMetaBlock(
      doc,
      [
        [
          "Date",
          dispatch?.created_at
            ? new Date(
                dispatch.created_at
              ).toLocaleString()
            : "—",
        ],

        [
          "Dispatch No",
          dispatch?.dispatch_no ||
            "—",
        ],

        [
          "Dispatch To",
          dispatch?.dispatch_to ||
            "—",
        ],

        [
          "Phone",
          dispatch?.phone ||
            "—",
        ],

        [
          "Payment Mode",
          (
            dispatch?.payment_mode ||
            "cash"
          ).toUpperCase(),
        ],

        [
          "Payment Status",
          (
            Number(
              dispatch?.final_payable
            ) || 0
          ) <= 0
            ? "PAID"
            : "PENDING",
        ],
      ],
      y
    );

  const dispatchItems =
    dispatch?.items || [];

  y =
    await drawItemsTable(
      doc,
      dispatchItems,
      y,
      {
        showPrice: true,
        showImages: true,
      }
    );

  const itemTotal =
    firstValidNumber(
      dispatch?.item_total,
      calculateItemsTotal(
        dispatchItems
      )
    );

  const deliveryCharges =
    firstValidNumber(
      dispatch?.delivery_charges,
      0
    );

  const grandTotal =
    firstValidNumber(
      dispatch?.grand_total,
      itemTotal +
        deliveryCharges
    );

  const advanceReceived =
    firstValidNumber(
      dispatch?.advance_received,
      0
    );

  const finalPayable =
    firstValidNumber(
      dispatch?.final_payable,
      Math.max(
        0,
        grandTotal -
          advanceReceived
      )
    );

  const totalPieces =
    calculateTotalPieces(
      dispatchItems
    );

  y =
    drawTotalsBlock(
      doc,
      [
        [
          "Item Total",
          itemTotal,
          false,
        ],

        [
          "Delivery Charges",
          deliveryCharges,
          false,
        ],

        [
          "Grand Total",
          grandTotal,
          false,
        ],

        [
          "Advance Received",
          advanceReceived,
          false,
        ],

        [
          "Final Payable",
          finalPayable,
          true,
        ],

        [
          "Total Pieces",
          String(
            totalPieces
          ),
          false,
        ],
      ],
      y
    );

  drawFooter(
    doc,
    branding
  );

  return doc;
}

/* =========================================================
   ESTIMATE PDF
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
    drawMetaBlock(
      doc,
      [
        [
          "Date",
          estimate?.created_at
            ? new Date(
                estimate.created_at
              ).toLocaleString()
            : "—",
        ],

        [
          "Estimate No",
          estimate?.estimate_no ||
            "—",
        ],

        [
          "Customer",
          estimate?.customer_name ||
            "Walk-in",
        ],

        [
          "Phone",
          estimate?.customer_phone ||
            "—",
        ],

        [
          "Status",
          (
            estimate?.status ||
            ""
          ).toUpperCase() ||
            "—",
        ],

        [
          "Validity",
          "72 hours",
        ],
      ],
      y
    );

  const estimateItems =
    estimate?.items || [];

  y =
    await drawItemsTable(
      doc,
      estimateItems,
      y,
      {
        showPrice: true,
        showImages: true,
      }
    );

  const itemTotal =
    firstValidNumber(
      estimate?.item_total,
      calculateItemsTotal(
        estimateItems
      )
    );

  const deliveryCharges =
    firstValidNumber(
      estimate?.delivery_charges,
      0
    );

  const grandTotal =
    firstValidNumber(
      estimate?.grand_total,
      itemTotal +
        deliveryCharges
    );

  const advanceReceived =
    firstValidNumber(
      estimate?.advance_received,
      0
    );

  const remaining =
    firstValidNumber(
      estimate?.remaining,
      Math.max(
        0,
        grandTotal -
          advanceReceived
      )
    );

  y =
    drawTotalsBlock(
      doc,
      [
        [
          "Item Total",
          itemTotal,
          false,
        ],

        [
          "Delivery Charges",
          deliveryCharges,
          false,
        ],

        [
          "Grand Total",
          grandTotal,
          false,
        ],

        [
          "Advance Received",
          advanceReceived,
          false,
        ],

        [
          "Remaining",
          remaining,
          true,
        ],
      ],
      y
    );

  drawFooter(
    doc,
    branding
  );

  return doc;
}

/* =========================================================
   RETURN PDF
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
    drawMetaBlock(
      doc,
      [
        [
          "Date",
          returnData?.created_at
            ? new Date(
                returnData.created_at
              ).toLocaleString()
            : "—",
        ],

        [
          "Return No",
          returnData?.return_no ||
            "—",
        ],

        [
          "Vendor",
          returnData?.vendor_name ||
            "—",
        ],

        [
          "Reason",
          returnData?.reason ||
            "—",
        ],

        [
          "Created By",
          returnData?.created_by ||
            "—",
        ],

        [
          "Type",
          "Vendor Return",
        ],
      ],
      y
    );

  const returnItems =
    returnData?.items || [];

  y =
    await drawItemsTable(
      doc,
      returnItems,
      y,
      {
        showPrice: true,
        showImages: true,
      }
    );

  const itemTotal =
    firstValidNumber(
      returnData?.item_total,
      calculateItemsTotal(
        returnItems
      )
    );

  const totalPieces =
    calculateTotalPieces(
      returnItems
    );

  y =
    drawTotalsBlock(
      doc,
      [
        [
          "Item Total",
          itemTotal,
          true,
        ],

        [
          "Pieces Returned",
          String(
            totalPieces
          ),
          false,
        ],
      ],
      y
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
        type: "application/pdf",
      }
    );

  /*
   * Native share
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
        title: finalFilename,
      });

      return true;
    } catch {
      /*
       * Continue to download / WhatsApp fallback.
       */
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
    (phone || "")
      .replace(
        /[^\d+]/g,
        ""
      )
      .replace(
        /^\+/,
        ""
      );

  const text =
    encodeURIComponent(
      `${finalFilename} — Please find the receipt attached.`
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
