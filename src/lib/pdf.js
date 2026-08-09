/**
 * SC AURA KURTIS
 * Professional A5 ERP PDFs
 *
 * Includes:
 * - Company header
 * - Booking / Dispatch / Estimate / Return
 * - Product table
 * - Product image inside Item / Description cell
 * - Proper totals box
 * - Footer with SC Aura Kurtis only
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

const PAGE_W = 148;
const PAGE_H = 210;
const MARGIN = 10;

const INK = [17, 24, 39];
const MUTE = [107, 114, 128];
const LINE = [229, 231, 235];
const LIGHT = [248, 250, 252];
const WHITE = [255, 255, 255];

/* =========================================================
   BASIC HELPERS
========================================================= */

export function newReceiptDoc() {
  return new jsPDF({
    unit: "mm",
    format: "a5",
    orientation: "portrait",
  });
}

function moneyNumber(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

/*
 * We do NOT use the Unicode ₹ character because jsPDF's
 * default Helvetica font does not render it correctly.
 *
 * This draws a clean ₹ symbol using vector lines.
 */
function drawRupeeSymbol(doc, x, y, size = 3) {
  doc.setDrawColor(INK[0], INK[1], INK[2]);
  doc.setLineWidth(0.35);

  // Top horizontal
  doc.line(x, y - size * 0.42, x + size * 0.72, y - size * 0.42);

  // Second horizontal
  doc.line(x, y - size * 0.12, x + size * 0.68, y - size * 0.12);

  // Curved-ish R/U shape
  doc.line(x + size * 0.18, y - size * 0.42, x + size * 0.18, y + size * 0.35);

  doc.line(
    x + size * 0.18,
    y - size * 0.42,
    x + size * 0.52,
    y - size * 0.42
  );

  doc.line(
    x + size * 0.52,
    y - size * 0.42,
    x + size * 0.60,
    y - size * 0.28
  );

  doc.line(
    x + size * 0.60,
    y - size * 0.28,
    x + size * 0.52,
    y - size * 0.12
  );

  doc.line(
    x + size * 0.52,
    y - size * 0.12,
    x + size * 0.18,
    y - size * 0.12
  );

  // Diagonal leg
  doc.line(
    x + size * 0.36,
    y - size * 0.12,
    x + size * 0.72,
    y + size * 0.35
  );

  doc.setLineWidth(0.2);
}

/*
 * Draw amount right-aligned.
 * Example: ₹ 19,950
 */
function drawMoneyRight(doc, value, rightX, y, bold = false) {
  const text = moneyNumber(value);

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(bold ? 8.8 : 8.3);
  doc.setTextColor(INK[0], INK[1], INK[2]);

  const textWidth = doc.getTextWidth(text);

  const symbolSize = 2.8;
  const gap = 1.2;

  const symbolX = rightX - textWidth - gap - symbolSize * 0.7;

  drawRupeeSymbol(
    doc,
    symbolX,
    y,
    symbolSize
  );

  doc.text(
    text,
    rightX,
    y,
    { align: "right" }
  );
}

/*
 * Same thing but inside table cells.
 */
function drawMoneyCell(doc, value, cell, bold = false) {
  const text = moneyNumber(value);

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(bold ? 8.2 : 8);
  doc.setTextColor(INK[0], INK[1], INK[2]);

  const textWidth = doc.getTextWidth(text);
  const rightX = cell.x + cell.width - 2.5;

  const symbolSize = 2.5;
  const gap = 1;

  const symbolX =
    rightX -
    textWidth -
    gap -
    symbolSize * 0.7;

  drawRupeeSymbol(
    doc,
    symbolX,
    cell.y + cell.height / 2 + 1.1,
    symbolSize
  );

  doc.text(
    text,
    rightX,
    cell.y + cell.height / 2 + 1.1,
    { align: "right" }
  );
}

async function imgToDataUrl(src) {
  if (!src) return null;

  if (typeof src !== "string") {
    return null;
  }

  if (src.startsWith("data:")) {
    return src;
  }

  try {
    const res = await fetch(src, {
      mode: "cors",
    });

    if (!res.ok) {
      console.warn(
        "PDF image request failed:",
        res.status,
        src
      );
      return null;
    }

    const blob = await res.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        resolve(null);
      };

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(
      "PDF image load failed:",
      src,
      error
    );

    return null;
  }
}

async function makeQr(text) {
  try {
    return await QRCode.toDataURL(text, {
      margin: 0,
      scale: 4,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    });
  } catch {
    return null;
  }
}

/* =========================================================
   HEADER
========================================================= */

async function header(
  doc,
  branding,
  titleText,
  subTitle
) {
  const y0 = MARGIN;
  const H = 30;

  let xText = MARGIN;

  /* Logo */
  if (branding?.logo_url) {
    const logo = await imgToDataUrl(
      branding.logo_url
    );

    if (logo) {
      try {
        doc.addImage(
          logo,
          "PNG",
          MARGIN,
          y0,
          20,
          20
        );

        xText = MARGIN + 24;
      } catch {
        // Continue without logo
      }
    }
  }

  /* Company name */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(
    INK[0],
    INK[1],
    INK[2]
  );

  doc.text(
    branding?.company_name ||
      "SC AURA KURTIS",
    xText,
    y0 + 5.5
  );

  /* Address / phone / GST */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(
    MUTE[0],
    MUTE[1],
    MUTE[2]
  );

  const linesRaw = [];

  if (branding?.address) {
    linesRaw.push(branding.address);
  }

  const line2Bits = [
    branding?.phone,
    branding?.gst
      ? `GST: ${branding.gst}`
      : null,
  ].filter(Boolean);

  if (line2Bits.length) {
    linesRaw.push(
      line2Bits.join("  ·  ")
    );
  }

  let ry = y0 + 10.5;

  for (const line of linesRaw) {
    const wrapped =
      doc.splitTextToSize(
        line,
        PAGE_W - xText - MARGIN - 40
      );

    doc.text(
      wrapped,
      xText,
      ry
    );

    ry += wrapped.length * 3.6;
  }

  /* Booking / Dispatch / Estimate box */
  const boxX =
    PAGE_W - MARGIN - 44;

  doc.setDrawColor(
    LINE[0],
    LINE[1],
    LINE[2]
  );

  doc.setFillColor(
    248,
    250,
    252
  );

  doc.roundedRect(
    boxX,
    y0,
    44,
    20,
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
    titleText,
    boxX + 22,
    y0 + 7,
    { align: "center" }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(11);

  doc.text(
    subTitle || "",
    boxX + 22,
    y0 + 14,
    { align: "center" }
  );

  /* Divider */
  doc.setDrawColor(
    LINE[0],
    LINE[1],
    LINE[2]
  );

  doc.line(
    MARGIN,
    y0 + H + 1,
    PAGE_W - MARGIN,
    y0 + H + 1
  );

  return y0 + H + 5;
}

/* =========================================================
   META BLOCK
========================================================= */

function metaBlock(
  doc,
  entries,
  y
) {
  const colW =
    (PAGE_W - MARGIN * 2) / 2;

  doc.setFontSize(9);

  const rows = Math.ceil(
    entries.length / 2
  );

  for (
    let i = 0;
    i < entries.length;
    i++
  ) {
    const [label, value] =
      entries[i];

    const col = i % 2;
    const row = Math.floor(i / 2);

    const x =
      MARGIN + col * colW;

    const rowY =
      y + row * 6.2;

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
      rowY
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setTextColor(
      INK[0],
      INK[1],
      INK[2]
    );

    const wrapped =
      doc.splitTextToSize(
        String(value || "—"),
        colW - 25
      );

    doc.text(
      wrapped,
      x + 22,
      rowY
    );
  }

  return (
    y +
    rows * 6.2 +
    3
  );
}

/* =========================================================
   PRODUCT TABLE
========================================================= */

async function itemsTable(
  doc,
  items,
  startY,
  {
    showPrice = true,
    showImages = true,
  } = {}
) {
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

  const body = [];

  for (
    let i = 0;
    i < items.length;
    i++
  ) {
    const it = items[i];

    const totalQty =
      Object.values(
        it.sizes || {}
      ).reduce(
        (a, b) =>
          a + Number(b || 0),
        0
      );

    const sizeBlock =
      Object.entries(
        it.sizes || {}
      )
        .map(
          ([size, qty]) =>
            `${size}:${qty}`
        )
        .join("  ");

    const image =
      showImages && it.image
        ? await imgToDataUrl(
            it.image
          )
        : null;

    const unitPrice =
      Number(
        it.unit_price
      ) || 0;

    const amount =
      totalQty * unitPrice;

    body.push({
      row: showPrice
        ? [
            String(i + 1),
            it.sr_number || "",
            `${
              it.title || ""
            }${
              sizeBlock
                ? `\n${sizeBlock}`
                : ""
            }`,
            String(totalQty),
            "",
            "",
          ]
        : [
            String(i + 1),
            it.sr_number || "",
            `${
              it.title || ""
            }${
              sizeBlock
                ? `\n${sizeBlock}`
                : ""
            }`,
            String(totalQty),
          ],

      image,
      unitPrice,
      amount,
    });
  }

  autoTable(doc, {
    startY,

    head,

    body: body.map(
      (item) => item.row
    ),

    theme: "grid",

    styles: {
      fontSize: 8.1,
      cellPadding: 2.2,
      lineColor: LINE,
      lineWidth: 0.15,
      textColor: INK,
      valign: "middle",
      overflow: "linebreak",
    },

    headStyles: {
      fillColor: [17, 24, 39],
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      valign: "middle",
    },

    alternateRowStyles: {
      fillColor: LIGHT,
    },

    columnStyles: showPrice
      ? {
          0: {
            cellWidth: 8,
            halign: "center",
          },

          1: {
            cellWidth: 20,
            fontStyle: "bold",
          },

          /*
           * IMPORTANT:
           * This is now the largest column.
           * Image + product description live here.
           */
          2: {
            cellWidth: "auto",
          },

          3: {
            cellWidth: 11,
            halign: "right",
          },

          /*
           * Increased from 16 → 19
           */
          4: {
            cellWidth: 19,
            halign: "right",
          },

          /*
           * Increased from 20 → 23
           */
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
     * Give image rows enough height.
     */
    didParseCell: (data) => {
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

      const itemData =
        body[data.row.index];

      if (
        itemData?.image
      ) {
        data.cell.minCellHeight =
          Math.max(
            data.cell.minCellHeight ||
              0,
            25
          );
      }
    },

    /*
     * Draw image INSIDE Item / Description.
     */
    didDrawCell: (data) => {
      if (
        data.section !== "body"
      ) {
        return;
      }

      const itemData =
        body[data.row.index];

      if (!itemData) {
        return;
      }

      /*
       * PRICE CELLS
       */
      if (
        showPrice &&
        data.column.index === 4
      ) {
        drawMoneyCell(
          doc,
          itemData.unitPrice,
          data.cell,
          false
        );

        return;
      }

      if (
        showPrice &&
        data.column.index === 5
      ) {
        drawMoneyCell(
          doc,
          itemData.amount,
          data.cell,
          true
        );

        return;
      }

      /*
       * ITEM / DESCRIPTION CELL
       */
      if (
        data.column.index !== 2
      ) {
        return;
      }

      if (
        !itemData.image
      ) {
        return;
      }

      try {
        const cell =
          data.cell;

        /*
         * Image box
         */
        const imageSize = 18;

        const imageX =
          cell.x + 2;

        const imageY =
          cell.y +
          (cell.height -
            imageSize) /
            2;

        /*
         * Cover the left part of
         * the existing text.
         */
        const fill =
          data.row.index % 2 === 1
            ? LIGHT
            : WHITE;

        doc.setFillColor(
          fill[0],
          fill[1],
          fill[2]
        );

        doc.rect(
          cell.x + 0.5,
          cell.y + 0.5,
          21,
          cell.height - 1,
          "F"
        );

        /*
         * Image
         */
        try {
          doc.addImage(
            itemData.image,
            imageX,
            imageY,
            imageSize,
            imageSize
          );
        } catch {
          try {
            doc.addImage(
              itemData.image,
              "PNG",
              imageX,
              imageY,
              imageSize,
              imageSize
            );
          } catch {
            // Ignore broken image
          }
        }

        /*
         * Redraw description next to image.
         */
        const text =
          body[data.row.index]
            .row[2];

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

        const textX =
          cell.x + 22;

        const maxTextWidth =
          cell.width - 24;

        const wrapped =
          doc.splitTextToSize(
            text,
            maxTextWidth
          );

        doc.text(
          wrapped,
          textX,
          cell.y + 5
        );
      } catch (error) {
        console.warn(
          "Could not draw product image:",
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
   TOTALS BLOCK
========================================================= */

function totalsBlock(
  doc,
  lines,
  y
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
    LIGHT[0],
    LIGHT[1],
    LIGHT[2]
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

  let cy =
    y + 5.5;

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const [
      label,
      value,
      bold,
    ] = lines[i];

    /*
     * Divider before important
     * final amount.
     */
    if (
      bold &&
      i > 0
    ) {
      doc.setDrawColor(
        LINE[0],
        LINE[1],
        LINE[2]
      );

      doc.line(
        boxX + 3,
        cy - 4.2,
        boxX +
          boxW -
          3,
        cy - 4.2
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
      cy
    );

    /*
     * Currency values
     */
    const numericValue =
      typeof value ===
      "number"
        ? value
        : String(value)
            .replace(
              /[^\d.-]/g,
              ""
            );

    const isMoney =
      String(label)
        .toLowerCase()
        .includes("total") ||
      String(label)
        .toLowerCase()
        .includes("received") ||
      String(label)
        .toLowerCase()
        .includes("remaining") ||
      String(label)
        .toLowerCase()
        .includes("payable") ||
      String(label)
        .toLowerCase()
        .includes("charges");

    if (isMoney) {
      drawMoneyRight(
        doc,
        Number(
          numericValue
        ) || 0,
        boxX +
          boxW -
          3,
        cy,
        bold
      );
    } else {
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
        INK[0],
        INK[1],
        INK[2]
      );

      doc.text(
        String(value),
        boxX +
          boxW -
          3,
        cy,
        {
          align: "right",
        }
      );
    }

    cy += rowH;
  }

  return (
    y +
    boxH +
    5
  );
}

/* =========================================================
   FOOTER
========================================================= */

async function footer(
  doc,
  branding,
  y
) {
  /*
   * Only SC Aura Kurtis.
   * No QR.
   * No authorised signature.
   * No WhatsApp.
   * No thank-you note.
   */

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

  doc.text(
    branding?.company_name ||
      "SC AURA KURTIS",
    PAGE_W / 2,
    footerY,
    {
      align: "center",
    }
  );
}

/* =========================================================
   BOOKING PDF
========================================================= */

export async function buildBookingPDF(
  b,
  branding
) {
  const doc =
    newReceiptDoc();

  let y =
    await header(
      doc,
      branding,
      "BOOKING",
      b.booking_no
    );

  y = metaBlock(
    doc,
    [
      [
        "Date",
        new Date(
          b.created_at
        ).toLocaleString(),
      ],

      [
        "Booking No",
        b.booking_no,
      ],

      [
        "Customer",
        b.customer_snapshot
          ?.name ||
          "—",
      ],

      [
        "Shop",
        b.customer_snapshot
          ?.shop_name ||
          "—",
      ],

      [
        "Phone",
        b.customer_snapshot
          ?.phone ||
          "—",
      ],

      [
        "Status",
        (
          b.status ||
          ""
        ).toUpperCase(),
      ],
    ],
    y
  );

  y =
    await itemsTable(
      doc,
      b.items || [],
      y,
      {
        showPrice: true,
        showImages: true,
      }
    );

  const totalPcs =
    (b.items || [])
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          Object.values(
            item.sizes || {}
          ).reduce(
            (
              a,
              n
            ) =>
              a +
              Number(
                n || 0
              ),
            0
          ),
        0
      );

  y =
    totalsBlock(
      doc,
      [
        [
          "Item Total",
          b.item_total,
          false,
        ],

        [
          "Advance Received",
          b.advance_received,
          false,
        ],

        [
          "Remaining",
          b.remaining,
          true,
        ],

        [
          "Total Pieces",
          String(
            totalPcs
          ),
          false,
        ],
      ],
      y
    );

  await footer(
    doc,
    branding,
    y
  );

  return doc;
}

/* =========================================================
   DISPATCH PDF
========================================================= */

export async function buildDispatchPDF(
  d,
  branding
) {
  const doc =
    newReceiptDoc();

  let y =
    await header(
      doc,
      branding,
      "DISPATCH",
      d.dispatch_no
    );

  y = metaBlock(
    doc,
    [
      [
        "Date",
        new Date(
          d.created_at
        ).toLocaleString(),
      ],

      [
        "Dispatch No",
        d.dispatch_no,
      ],

      [
        "Dispatch To",
        d.dispatch_to ||
          "—",
      ],

      [
        "Phone",
        d.phone ||
          "—",
      ],

      [
        "Payment Mode",
        (
          d.payment_mode ||
          "cash"
        ).toUpperCase(),
      ],

      [
        "Payment Status",
        (
          Number(
            d.final_payable
          ) || 0
        ) <= 0
          ? "PAID"
          : "PENDING",
      ],
    ],
    y
  );

  y =
    await itemsTable(
      doc,
      d.items || [],
      y,
      {
        showPrice: true,
        showImages: true,
      }
    );

  const totalPcs =
    (d.items || [])
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          Object.values(
            item.sizes || {}
          ).reduce(
            (
              a,
              n
            ) =>
              a +
              Number(
                n || 0
              ),
            0
          ),
        0
      );

  y =
    totalsBlock(
      doc,
      [
        [
          "Item Total",
          d.item_total,
          false,
        ],

        [
          "Delivery Charges",
          d.delivery_charges,
          false,
        ],

        [
          "Grand Total",
          d.grand_total,
          false,
        ],

        [
          "Advance Received",
          d.advance_received,
          false,
        ],

        [
          "Final Payable",
          d.final_payable,
          true,
        ],

        [
          "Total Pieces",
          String(
            totalPcs
          ),
          false,
        ],
      ],
      y
    );

  await footer(
    doc,
    branding,
    y
  );

  return doc;
}

/* =========================================================
   ESTIMATE PDF
========================================================= */

export async function buildEstimatePDF(
  est,
  branding
) {
  const doc =
    newReceiptDoc();

  let y =
    await header(
      doc,
      branding,
      "ESTIMATE",
      est.estimate_no
    );

  y = metaBlock(
    doc,
    [
      [
        "Date",
        new Date(
          est.created_at
        ).toLocaleString(),
      ],

      [
        "Estimate No",
        est.estimate_no,
      ],

      [
        "Customer",
        est.customer_name ||
          "Walk-in",
      ],

      [
        "Phone",
        est.customer_phone ||
          "—",
      ],

      [
        "Status",
        (
          est.status ||
          ""
        ).toUpperCase(),
      ],

      [
        "Validity",
        "72 hours",
      ],
    ],
    y
  );

  y =
    await itemsTable(
      doc,
      est.items || [],
      y,
      {
        showPrice: true,
        showImages: true,
      }
    );

  y =
    totalsBlock(
      doc,
      [
        [
          "Item Total",
          est.item_total,
          false,
        ],

        [
          "Delivery Charges",
          est.delivery_charges,
          false,
        ],

        [
          "Grand Total",
          est.grand_total,
          false,
        ],

        [
          "Advance Received",
          est.advance_received,
          false,
        ],

        [
          "Remaining",
          est.remaining,
          true,
        ],
      ],
      y
    );

  await footer(
    doc,
    branding,
    y
  );

  return doc;
}

/* =========================================================
   RETURN PDF
========================================================= */

export async function buildReturnPDF(
  r,
  branding
) {
  const doc =
    newReceiptDoc();

  let y =
    await header(
      doc,
      branding,
      "RETURN",
      r.return_no
    );

  y = metaBlock(
    doc,
    [
      [
        "Date",
        new Date(
          r.created_at
        ).toLocaleString(),
      ],

      [
        "Return No",
        r.return_no,
      ],

      [
        "Vendor",
        r.vendor_name ||
          "—",
      ],

      [
        "Reason",
        r.reason ||
          "—",
      ],

      [
        "Created By",
        r.created_by ||
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
    await itemsTable(
      doc,
      r.items || [],
      y,
      {
        showPrice: true,
        showImages: false,
      }
    );

  const totalPcs =
    (r.items || [])
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          Object.values(
            item.sizes || {}
          ).reduce(
            (
              a,
              n
            ) =>
              a +
              Number(
                n || 0
              ),
            0
          ),
        0
      );

  y =
    totalsBlock(
      doc,
      [
        [
          "Item Total",
          r.item_total,
          true,
        ],

        [
          "Pieces Returned",
          String(
            totalPcs
          ),
          false,
        ],
      ],
      y
    );

  await footer(
    doc,
    branding,
    y
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
  doc.save(filename);
}

/* =========================================================
   SHARE
========================================================= */

export async function sharePDF(
  doc,
  filename,
  phone
) {
  const blob =
    doc.output("blob");

  const file =
    new File(
      [blob],
      filename,
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
        title: filename,
      });

      return true;
    } catch {
      // Continue to download
    }
  }

  doc.save(filename);

  const clean = (
    p
  ) =>
    (p || "")
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
      `${filename} — Please find the receipt attached.`
    );

  const url = phone
    ? `https://wa.me/${clean(
        phone
      )}?text=${text}`
    : `https://wa.me/?text=${text}`;

  window.open(
    url,
    "_blank",
    "noopener"
  );

  return false;
}
