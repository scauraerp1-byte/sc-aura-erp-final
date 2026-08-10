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
import { formatRupee } from "./share";

const PAGE_W = 148;
const PAGE_H = 210;
const MARGIN = 10;

const INK = [17, 24, 39];
const MUTE = [107, 114, 128];
const LINE = [229, 231, 235];
const SOFT = [248, 250, 252];
const WHITE = [255, 255, 255];

const FOOTER_Y = PAGE_H - 13;
const CONTENT_BOTTOM = FOOTER_Y - 8;

/* =========================================================
   BACKEND URL
========================================================= */

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.REACT_APP_BACKEND_URL ||
  "";

/* =========================================================
   BASIC HELPERS
========================================================= */

function setTextColor(doc, color) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setDrawColor(doc, color) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function setFillColor(doc, color) {
  doc.setFillColor(color[0], color[1], color[2]);
}

/*
 * jsPDF's built-in Helvetica is not a Unicode font. The ₹ glyph can
 * disappear when passed directly to doc.text(). Keep the existing
 * formatRupee() contract, but remove the glyph before drawing and
 * draw a small vector rupee mark next to the number.
 */
function getMoneyNumber(value) {
  const formatted = formatRupee(value);
  const text = String(formatted ?? "0")
    .replace(/\u20B9/g, "")
    .replace(/Rs\.?/gi, "")
    .trim();

  return text || "0";
}

function drawRupeeMark(doc, x, y, size = 3.2) {
  const top = y - size * 0.72;
  const left = x;
  const right = x + size * 0.82;
  const mid = y - size * 0.16;
  const bottom = y + size * 0.58;

  doc.setLineWidth(0.35);
  setDrawColor(doc, INK);

  doc.line(left, top, right, top);
  doc.line(left, top + size * 0.18, right, top + size * 0.18);
  doc.line(left, mid, right - size * 0.08, mid);
  doc.line(left + size * 0.05, mid, right - size * 0.18, bottom);

  doc.setLineWidth(0.2);
}

function drawMoneyRight(doc, value, rightX, y, options = {}) {
  const fontSize = options.fontSize || 8.5;
  const bold = options.bold ?? false;

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  setTextColor(doc, INK);

  const numberText = getMoneyNumber(value);
  const numberWidth = doc.getTextWidth(numberText);
  const symbolGap = 1.2;
  const symbolWidth = 3.2;
  const totalWidth = symbolWidth + symbolGap + numberWidth;

  const startX = rightX - totalWidth;

  drawRupeeMark(
    doc,
    startX,
    y - 0.25,
    Math.min(3.6, Math.max(2.8, fontSize * 0.38))
  );

  doc.text(
    numberText,
    rightX,
    y,
    { align: "right" }
  );
}

/* =========================================================
   IMAGE HELPERS
========================================================= */

async function imageToDataUrl(src) {
  if (!src || typeof src !== "string") return null;

  if (src.startsWith("data:image/")) {
    return src;
  }

  if (src.startsWith("blob:")) {
    try {
      const response = await fetch(src);
      if (!response.ok) return null;

      const blob = await response.blob();
      return await blobToDataUrl(blob);
    } catch {
      return null;
    }
  }

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

  try {
    const response = await fetch(src);
    if (!response.ok) return null;

    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
}

function getImageType(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") {
    return "JPEG";
  }

  if (dataUrl.startsWith("data:image/png")) {
    return "PNG";
  }

  if (dataUrl.startsWith("data:image/webp")) {
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

  if (branding?.logo_url) {
    const logo = await imageToDataUrl(
      branding.logo_url
    );

    if (logo) {
      try {
        const type = getImageType(logo);

        doc.addImage(
          logo,
          type,
          MARGIN,
          y,
          logoSize,
          logoSize
        );

        textX = MARGIN + 24;
      } catch {
        textX = MARGIN;
      }
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setTextColor(doc, INK);

  doc.text(
    branding?.company_name || "SC Aura Kurtis",
    textX,
    y + 5.5
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  setTextColor(doc, MUTE);

  const information = [];

  if (branding?.address) {
    information.push(branding.address);
  }

  const secondLine = [
    branding?.phone || null,
    branding?.gst
      ? `GST: ${branding.gst}`
      : null,
  ].filter(Boolean);

  if (secondLine.length) {
    information.push(secondLine.join("  ·  "));
  }

  let infoY = y + 10.5;

  for (const line of information) {
    const wrapped = doc.splitTextToSize(
      String(line),
      PAGE_W - textX - MARGIN - 44
    );

    doc.text(
      wrapped,
      textX,
      infoY
    );

    infoY += wrapped.length * 3.5;
  }

  const boxW = 44;
  const boxH = 20;

  const boxX =
    PAGE_W -
    MARGIN -
    boxW;

  setDrawColor(doc, LINE);
  setFillColor(doc, SOFT);

  doc.roundedRect(
    boxX,
    y,
    boxW,
    boxH,
    2.5,
    2.5,
    "FD"
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, INK);

  doc.text(
    title,
    boxX + boxW / 2,
    y + 7,
    { align: "center" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);

  doc.text(
    documentNumber || "",
    boxX + boxW / 2,
    y + 14,
    { align: "center" }
  );

  const dividerY = y + headerHeight + 1;

  setDrawColor(doc, LINE);

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
    PAGE_W - MARGIN * 2;

  const colWidth =
    contentWidth / 2;

  const rowHeight = 6.5;

  const rows = Math.ceil(
    entries.length / 2
  );

  doc.setFontSize(8.5);

  for (
    let index = 0;
    index < entries.length;
    index++
  ) {
    const [label, value] =
      entries[index];

    const column =
      index % 2;

    const row =
      Math.floor(index / 2);

    const x =
      MARGIN +
      column * colWidth;

    const y =
      startY +
      row * rowHeight;

    doc.setFont("helvetica", "normal");
    setTextColor(doc, MUTE);

    doc.text(
      String(label),
      x,
      y
    );

    doc.setFont("helvetica", "bold");
    setTextColor(doc, INK);

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

  return Object.entries(item.sizes)
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
    return Number(item?.quantity || 0);
  }

  return Object.values(item.sizes).reduce(
    (total, quantity) =>
      total +
      Number(quantity || 0),
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
      `${sizeText ? `\n${sizeText}` : ""}`;

    const unitPrice =
      Number(
        item?.unit_price || 0
      );

    const amount =
      totalQty * unitPrice;

    preparedItems.push({
      item,
      image,
      description,
      totalQty,
      unitPrice,
      amount,
    });
  }

  const head = showPrice
    ? [[
        "#",
        "SCA",
        "Item / Description",
        "Qty",
        "Rate",
        "Amount",
      ]]
    : [[
        "#",
        "SCA",
        "Item / Description",
        "Qty",
      ]];

  /*
   * Important:
   * For rows that have an image, the Item / Description cell's
   * AutoTable text is intentionally blank. The cell is rendered
   * manually in didDrawCell so AutoTable can never print text
   * underneath the image.
   */
  const body =
    preparedItems.map(
      (entry, index) => {
        if (showPrice) {
          return [
            String(index + 1),
            entry.item?.sr_number || "",
            entry.image
              ? ""
              : entry.description,
            String(entry.totalQty),
            "",
            "",
          ];
        }

        return [
          String(index + 1),
          entry.item?.sr_number || "",
          entry.image
            ? ""
            : entry.description,
          String(entry.totalQty),
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

    columnStyles: showPrice
      ? {
          0: {
            cellWidth: 8,
            halign: "center",
          },

          1: {
            cellWidth: 18,
            fontStyle: "bold",
          },

          2: {
            cellWidth: 49,
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
            cellWidth: 18,
            fontStyle: "bold",
          },

          2: {
            cellWidth: 88,
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

    didParseCell(data) {
      if (
        data.section !== "body" ||
        data.column.index !== 2
      ) {
        return;
      }

      const entry =
        preparedItems[data.row.index];

      if (!entry) return;

      if (entry.image) {
        /*
         * Reserve enough vertical space for both:
         * - product image
         * - title + size lines
         */
        const textWidth =
          Math.max(
            12,
            data.cell.width - 24
          );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);

        const lines =
          doc.splitTextToSize(
            entry.description || "",
            textWidth
          );

        const textHeight =
          lines.length * 3.8 + 5;

        data.cell.text = [];
        data.cell.minCellHeight =
          Math.max(
            data.cell.minCellHeight || 0,
            25,
            textHeight
          );
      }
    },

    didDrawCell(data) {
      if (data.section !== "body") {
        return;
      }

      const entry =
        preparedItems[data.row.index];

      if (!entry) return;

      const cell = data.cell;

      /*
       * Product image + description:
       * the Item / Description cell is rendered manually so
       * AutoTable can never place its original text underneath
       * the image.
       */
      if (data.column.index === 2) {
        if (!entry.image) {
          return;
        }

        try {
          const padding = 2;

          const imageSize =
            Math.min(
              17,
              cell.height - padding * 2
            );

          const imageX =
            cell.x + padding;

          const imageY =
            cell.y +
            (cell.height - imageSize) / 2;

          setFillColor(
            doc,
            cell.fillColor || SOFT
          );

          doc.rect(
            cell.x + 0.7,
            cell.y + 0.7,
            19,
            Math.max(
              1,
              cell.height - 1.4
            ),
            "F"
          );

          const imageType =
            getImageType(entry.image);

          doc.addImage(
            entry.image,
            imageType,
            imageX,
            imageY,
            imageSize,
            imageSize
          );

          const textX =
            cell.x + 21.5;

          const availableWidth =
            cell.width - 23.5;

          doc.setFont(
            "helvetica",
            "normal"
          );
          doc.setFontSize(8.1);
          setTextColor(doc, INK);

          const text =
            doc.splitTextToSize(
              entry.description || "",
              Math.max(
                12,
                availableWidth
              )
            );

          const lineHeight = 3.8;

          const totalTextHeight =
            text.length * lineHeight;

          const textY =
            cell.y +
            Math.max(
              4.2,
              (cell.height -
                totalTextHeight) /
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

          doc.setFont(
            "helvetica",
            "normal"
          );
          doc.setFontSize(8.1);
          setTextColor(doc, INK);

          const fallback =
            doc.splitTextToSize(
              entry.description || "",
              cell.width - 4
            );

          doc.text(
            fallback,
            cell.x + 2,
            cell.y + 5
          );
        }

        return;
      }

      /*
       * Rate / Amount:
       * AutoTable receives an empty value for these columns and
       * we draw the value ourselves so ₹ is always visible.
       */
      if (
        showPrice &&
        (
          data.column.index === 4 ||
          data.column.index === 5
        )
      ) {
        drawMoneyRight(
          doc,
          data.column.index === 4
            ? entry.unitPrice
            : entry.amount,
          cell.x + cell.width - 2.2,
          cell.y +
            cell.height / 2 +
            2.7,
          {
            fontSize: 8.1,
            bold:
              data.column.index === 5,
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

function totalsHeight(lines) {
  return (
    lines.length * 6.5 +
    8
  );
}

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
    totalsHeight(lines);

  setDrawColor(doc, LINE);
  setFillColor(doc, SOFT);

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

    if (
      bold &&
      index > 0
    ) {
      setDrawColor(doc, LINE);

      doc.line(
        boxX + 3,
        currentY - 4.2,
        boxX + boxW - 3,
        currentY - 4.2
      );
    }

    doc.setFont(
      "helvetica",
      bold ? "bold" : "normal"
    );

    doc.setFontSize(
      bold ? 9 : 8.5
    );

    setTextColor(
      doc,
      bold ? INK : MUTE
    );

    doc.text(
      String(label),
      boxX + 3,
      currentY
    );

    /*
     * Monetary values are drawn with a vector ₹ symbol.
     * Non-money values (e.g. Total Pieces) remain normal text.
     */
    const isMoney =
      !/pieces/i.test(String(label));

    if (isMoney) {
      drawMoneyRight(
        doc,
        value,
        boxX + boxW - 3,
        currentY,
        {
          fontSize: bold ? 9 : 8.5,
          bold,
        }
      );
    } else {
      doc.setFont(
        "helvetica",
        bold ? "bold" : "normal"
      );
      doc.setFontSize(
        bold ? 9 : 8.5
      );
      setTextColor(doc, INK);

      doc.text(
        String(value),
        boxX + boxW - 3,
        currentY,
        { align: "right" }
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

function ensureTotalsSpace(
  doc,
  currentY,
  lines
) {
  const needed =
    totalsHeight(lines) + 5;

  if (
    currentY + needed >
    CONTENT_BOTTOM
  ) {
    doc.addPage();
    return MARGIN;
  }

  return currentY;
}

/* =========================================================
   FOOTER
========================================================= */

function drawFooter(
  doc,
  branding
) {
  setDrawColor(doc, LINE);

  doc.line(
    MARGIN,
    FOOTER_Y - 5,
    PAGE_W - MARGIN,
    FOOTER_Y - 5
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);
  setTextColor(doc, INK);

  /*
   * LOCKED:
   * Footer only company name.
   */
  doc.text(
    branding?.company_name ||
      "SC Aura Kurtis",
    PAGE_W / 2,
    FOOTER_Y,
    {
      align: "center",
    }
  );
}

/* =========================================================
   TOTAL PIECES
========================================================= */

function calculateTotalPieces(items) {
  return (
    Array.isArray(items)
      ? items
      : []
  ).reduce(
    (total, item) =>
      total +
      getTotalQuantity(item),
    0
  );
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
          booking?.booking_no || "—",
        ],
        [
          "Customer",
          booking?.customer_snapshot?.name ||
            "—",
        ],
        [
          "Shop",
          booking?.customer_snapshot?.shop_name ||
            "—",
        ],
        [
          "Phone",
          booking?.customer_snapshot?.phone ||
            "—",
        ],
        [
          "Status",
          (
            booking?.status || ""
          ).toUpperCase() || "—",
        ],
      ],
      y
    );

  y =
    await drawItemsTable(
      doc,
      booking?.items || [],
      y,
      {
        showPrice: true,
        showImages: true,
      }
    );

  const totalPieces =
    calculateTotalPieces(
      booking?.items || []
    );

  const totals = [
    [
      "Item Total",
      formatRupee(
        booking?.item_total
      ),
      false,
    ],
    [
      "Advance Received",
      formatRupee(
        booking?.advance_received
      ),
      false,
    ],
    [
      "Remaining",
      formatRupee(
        booking?.remaining
      ),
      true,
    ],
    [
      "Total Pieces",
      String(totalPieces),
      false,
    ],
  ];

  y = ensureTotalsSpace(
    doc,
    y,
    totals
  );

  drawTotalsBlock(
    doc,
    totals,
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
          dispatch?.dispatch_no || "—",
        ],
        [
          "Dispatch To",
          dispatch?.dispatch_to || "—",
        ],
        [
          "Phone",
          dispatch?.phone || "—",
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

  y =
    await drawItemsTable(
      doc,
      dispatch?.items || [],
      y,
      {
        showPrice: true,
        showImages: true,
      }
    );

  const totalPieces =
    calculateTotalPieces(
      dispatch?.items || []
    );

  const totals = [
    [
      "Item Total",
      formatRupee(
        dispatch?.item_total
      ),
      false,
    ],
    [
      "Delivery Charges",
      formatRupee(
        dispatch?.delivery_charges
      ),
      false,
    ],
    [
      "Grand Total",
      formatRupee(
        dispatch?.grand_total
      ),
      false,
    ],
    [
      "Advance Received",
      formatRupee(
        dispatch?.advance_received
      ),
      false,
    ],
    [
      "Final Payable",
      formatRupee(
        dispatch?.final_payable
      ),
      true,
    ],
    [
      "Total Pieces",
      String(totalPieces),
      false,
    ],
  ];

  y = ensureTotalsSpace(
    doc,
    y,
    totals
  );

  drawTotalsBlock(
    doc,
    totals,
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
          estimate?.estimate_no || "—",
        ],
        [
          "Customer",
          estimate?.customer_name ||
            "Walk-in",
        ],
        [
          "Phone",
          estimate?.customer_phone || "—",
        ],
        [
          "Status",
          (
            estimate?.status || ""
          ).toUpperCase() || "—",
        ],
        [
          "Validity",
          "72 hours",
        ],
      ],
      y
    );

  y =
    await drawItemsTable(
      doc,
      estimate?.items || [],
      y,
      {
        showPrice: true,
        showImages: true,
      }
    );

  const totals = [
    [
      "Item Total",
      formatRupee(
        estimate?.item_total
      ),
      false,
    ],
    [
      "Delivery Charges",
      formatRupee(
        estimate?.delivery_charges
      ),
      false,
    ],
    [
      "Grand Total",
      formatRupee(
        estimate?.grand_total
      ),
      false,
    ],
    [
      "Advance Received",
      formatRupee(
        estimate?.advance_received
      ),
      false,
    ],
    [
      "Remaining",
      formatRupee(
        estimate?.remaining
      ),
      true,
    ],
  ];

  y = ensureTotalsSpace(
    doc,
    y,
    totals
  );

  drawTotalsBlock(
    doc,
    totals,
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
          returnData?.return_no || "—",
        ],
        [
          "Vendor",
          returnData?.vendor_name || "—",
        ],
        [
          "Reason",
          returnData?.reason || "—",
        ],
        [
          "Created By",
          returnData?.created_by || "—",
        ],
        [
          "Type",
          "Vendor Return",
        ],
      ],
      y
    );

  y =
    await drawItemsTable(
      doc,
      returnData?.items || [],
      y,
      {
        showPrice: true,
        showImages: true,
      }
    );

  const totalPieces =
    calculateTotalPieces(
      returnData?.items || []
    );

  const totals = [
    [
      "Item Total",
      formatRupee(
        returnData?.item_total
      ),
      true,
    ],
    [
      "Pieces Returned",
      String(totalPieces),
      false,
    ],
  ];

  y = ensureTotalsSpace(
    doc,
    y,
    totals
  );

  drawTotalsBlock(
    doc,
    totals,
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
      // Continue to download/WhatsApp fallback.
    }
  }

  doc.save(finalFilename);

  const cleanPhone =
    (phone || "")
      .replace(/[^\d+]/g, "")
      .replace(/^\+/, "");

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
