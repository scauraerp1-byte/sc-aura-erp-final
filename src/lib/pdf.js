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
 * - Product image inside Item / Description cell
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
  if (!src) return null;

  if (typeof src !== "string") {
    return null;
  }

  // Already a data URL
  if (src.startsWith("data:image/")) {
    return src;
  }

  // Blob URL
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

  // Absolute external URL
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

  // Relative URL
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

  /*
   * Logo
   */
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

  let infoY = y + 10.5;

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
    boxX + boxW / 2,
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
    boxX + boxW / 2,
    y + 14,
    {
      align: "center",
    }
  );

  /*
   * Divider
   */
  const dividerY =
    y + headerHeight + 1;

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
   PRODUCT DESCRIPTION
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

  /*
   * Prepare all images BEFORE
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

  const body =
    preparedItems.map(
      (entry, index) => {
        if (showPrice) {
          return [
            String(index + 1),
            entry.item?.sr_number || "",
            entry.description,
            String(entry.totalQty),
            entry.unitPrice.toFixed(0),
            entry.amount.toFixed(0),
          ];
        }

        return [
          String(index + 1),
          entry.item?.sr_number || "",
          entry.description,
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
            cellWidth: 21,
            fontStyle: "bold",
          },

          2: {
            cellWidth: "auto",
          },

          3: {
            cellWidth: 11,
            halign: "right",
          },

          4: {
            cellWidth: 16,
            halign: "right",
          },

          5: {
            cellWidth: 20,
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
            cellWidth: 22,
            fontStyle: "bold",
          },

          2: {
            cellWidth: "auto",
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
     * Make image rows taller.
     */
    didParseCell(data) {
      if (
        data.section === "body" &&
        data.column.index === 2
      ) {
        const entry =
          preparedItems[
            data.row.index
          ];

        if (entry?.image) {
          data.cell.minCellHeight =
            Math.max(
              data.cell.minCellHeight || 0,
              25
            );
        }
      }
    },

    /*
     * Draw image INSIDE
     * Item / Description cell.
     */
    didDrawCell(data) {
      if (
        data.section !== "body"
      ) {
        return;
      }

      if (
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

      const cell =
        data.cell;

      const padding = 2;

      const imageSize =
        Math.min(
          19,
          cell.height -
            padding * 2
        );

      const imageX =
        cell.x + padding;

      const imageY =
        cell.y +
        (cell.height -
          imageSize) /
          2;

      try {
        const imageType =
          getImageType(
            entry.image
          );

        /*
         * Cover the part where
         * AutoTable originally
         * printed description.
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
          cell.x + 0.8,
          cell.y + 0.8,
          21,
          cell.height - 1.6,
          "F"
        );

        /*
         * Image
         */
        doc.addImage(
          entry.image,
          imageType,
          imageX,
          imageY,
          imageSize,
          imageSize
        );

        /*
         * Description text
         */
        const textX =
          cell.x +
          imageSize +
          5;

        const availableWidth =
          cell.width -
          imageSize -
          7;

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8.1);

        doc.setTextColor(
          INK[0],
          INK[1],
          INK[2]
        );

        const text =
          doc.splitTextToSize(
            entry.description,
            Math.max(
              10,
              availableWidth
            )
          );

        doc.text(
          text,
          textX,
          cell.y + 5
        );
      } catch (error) {
        console.warn(
          "Unable to draw product image:",
          error
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
     * Divider before
     * highlighted final value.
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
      bold ? 9 : 8.5
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

    doc.setTextColor(
      INK[0],
      INK[1],
      INK[2]
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

  y =
    drawTotalsBlock(
      doc,
      [
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

  y =
    drawTotalsBlock(
      doc,
      [
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

  y =
    drawTotalsBlock(
      doc,
      [
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

  y =
    drawTotalsBlock(
      doc,
      [
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
      // Continue to WhatsApp fallback.
    }
  }

  /*
   * Download fallback
   */
  doc.save(finalFilename);

  /*
   * WhatsApp fallback
   */
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
