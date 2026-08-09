/**
 * SC AURA KURTIS
 * Professional A5 ERP Receipts
 *
 * Supports:
 * - Booking PDF
 * - Dispatch PDF
 * - Estimate PDF
 * - Product images inside Item / Description cell
 * - JPG / PNG / WebP image conversion
 * - Rupee formatting
 * - Clean totals block
 * - Minimal SC Aura Kurtis footer
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { formatRupee } from "./share";

const PAGE_W = 148;
const PAGE_H = 210;
const MARGIN = 10;

const INK = [17, 24, 39];
const MUTE = [107, 114, 128];
const LINE = [229, 231, 235];
const LIGHT = [248, 250, 252];
const WHITE = [255, 255, 255];

/* =========================================================
   IMAGE HELPERS
   ========================================================= */

function getItemImage(it) {
  if (!it) return null;

  // Support all common image field formats
  if (typeof it.image === "string" && it.image) {
    return it.image;
  }

  if (typeof it.image_url === "string" && it.image_url) {
    return it.image_url;
  }

  if (typeof it.imageUrl === "string" && it.imageUrl) {
    return it.imageUrl;
  }

  if (Array.isArray(it.images) && it.images.length) {
    const first = it.images[0];

    if (typeof first === "string") {
      return first;
    }

    if (first?.url) {
      return first.url;
    }

    if (first?.src) {
      return first.src;
    }
  }

  if (Array.isArray(it.image_urls) && it.image_urls.length) {
    return it.image_urls[0];
  }

  if (Array.isArray(it.imageUrls) && it.imageUrls.length) {
    return it.imageUrls[0];
  }

  return null;
}

/*
 * Converts ANY supported browser image
 * into JPEG data URL for jsPDF.
 *
 * This is important because jsPDF can fail
 * when directly receiving WebP / some PNG URLs.
 */
async function imgToDataUrl(src) {
  if (!src) return null;

  try {
    /*
     * Already a data URL.
     */
    let source = src;

    /*
     * Remote URL -> fetch blob -> data URL
     */
    if (!src.startsWith("data:")) {
      const response = await fetch(src, {
        mode: "cors",
        credentials: "omit",
      });

      if (!response.ok) {
        console.warn(
          "PDF image fetch failed:",
          response.status,
          src
        );

        return null;
      }

      const blob = await response.blob();

      source = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(blob);
      });
    }

    /*
     * Browser image decode.
     */
    const img = new Image();

    /*
     * Needed for remote CORS images.
     */
    img.crossOrigin = "anonymous";

    img.src = source;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    if (!width || !height) {
      return null;
    }

    /*
     * Convert to canvas.
     */
    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return null;
    }

    /*
     * White background so transparent PNG/WebP
     * doesn't become black in the PDF.
     */
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      0,
      width,
      height
    );

    /*
     * Draw source image.
     */
    ctx.drawImage(
      img,
      0,
      0,
      width,
      height
    );

    /*
     * Always return JPEG.
     */
    return canvas.toDataURL(
      "image/jpeg",
      0.92
    );

  } catch (error) {
    console.warn(
      "PDF image conversion failed:",
      src,
      error
    );

    return null;
  }
}

/* =========================================================
   QR
   ========================================================= */

async function makeQr(text) {
  try {
    return await QRCode.toDataURL(
      text,
      {
        margin: 0,
        scale: 4,
        color: {
          dark: "#111827",
          light: "#ffffff",
        },
      }
    );
  } catch {
    return null;
  }
}

/* =========================================================
   MONEY
   ========================================================= */

function money(value) {
  const amount = Number(value) || 0;

  return formatRupee(amount);
}

/* =========================================================
   DOCUMENT
   ========================================================= */

export function newReceiptDoc() {
  return new jsPDF({
    unit: "mm",
    format: "a5",
    orientation: "portrait",
  });
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

  /*
   * Company logo
   */
  if (branding?.logo_url) {
    const logo = await imgToDataUrl(
      branding.logo_url
    );

    if (logo) {
      try {
        doc.addImage(
          logo,
          "JPEG",
          MARGIN,
          y0,
          20,
          20
        );

        xText = MARGIN + 24;

      } catch {
        // Ignore logo errors
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
      "SC AURA KURTIS",
    xText,
    y0 + 5.5
  );

  /*
   * Company details
   */
  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8.5);

  doc.setTextColor(
    MUTE[0],
    MUTE[1],
    MUTE[2]
  );

  const linesRaw = [];

  if (branding?.address) {
    linesRaw.push(
      branding.address
    );
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
        PAGE_W -
          xText -
          MARGIN -
          40
      );

    doc.text(
      wrapped,
      xText,
      ry
    );

    ry +=
      wrapped.length * 3.6;
  }

  /*
   * Booking / Dispatch / Estimate box
   */
  const boxX =
    PAGE_W -
    MARGIN -
    44;

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
    {
      align: "center",
    }
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
    {
      align: "center",
    }
  );

  /*
   * Divider
   */
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
   META
   ========================================================= */

function metaBlock(
  doc,
  entries,
  y
) {
  const colW =
    (PAGE_W - MARGIN * 2) / 2;

  doc.setFontSize(9);

  const rows =
    Math.ceil(
      entries.length / 2
    );

  for (
    let i = 0;
    i < entries.length;
    i++
  ) {
    const [
      label,
      value,
    ] = entries[i];

    const col =
      i % 2;

    const row =
      Math.floor(i / 2);

    const x =
      MARGIN +
      col * colW;

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
      y + row * 6.2
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

    const wrapped =
      doc.splitTextToSize(
        String(
          value || "—"
        ),
        colW - 4
      );

    doc.text(
      wrapped,
      x + 22,
      y + row * 6.2
    );
  }

  return (
    y +
    rows * 6.2 +
    3
  );
}

/* =========================================================
   ITEMS TABLE
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
   * Build rows first.
   */
  const body = [];

  for (
    let i = 0;
    i < items.length;
    i++
  ) {
    const it =
      items[i] || {};

    const totalQty =
      Object.values(
        it.sizes || {}
      ).reduce(
        (sum, qty) =>
          sum +
          Number(qty || 0),
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

    /*
     * Find product image.
     */
    let image = null;

    if (showImages) {
      const imageSource =
        getItemImage(it);

      if (imageSource) {
        image =
          await imgToDataUrl(
            imageSource
          );
      }
    }

    const title =
      it.title || "";

    const description =
      sizeBlock
        ? `${title}\n${sizeBlock}`
        : title;

    const unitPrice =
      Number(
        it.unit_price
      ) || 0;

    const lineTotal =
      totalQty *
      unitPrice;

    body.push({
      row: showPrice
        ? [
            String(i + 1),
            it.sr_number || "",
            description,
            String(totalQty),
            money(unitPrice),
            money(lineTotal),
          ]
        : [
            String(i + 1),
            it.sr_number || "",
            description,
            String(totalQty),
          ],

      image,
    });
  }

  /*
   * Generate table.
   */
  autoTable(doc, {
    startY,

    head,

    body: body.map(
      (item) =>
        item.row
    ),

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 8.1,
      cellPadding: 2.2,

      lineColor: LINE,

      lineWidth: 0.15,

      textColor: INK,

      valign: "middle",
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
      fillColor: LIGHT,
    },

    columnStyles:
      showPrice
        ? {
            0: {
              cellWidth: 8,
              halign:
                "center",
            },

            1: {
              cellWidth: 21,
              fontStyle:
                "bold",
            },

            /*
             * Description gets
             * the remaining space.
             */
            2: {
              cellWidth:
                "auto",
            },

            3: {
              cellWidth: 11,
              halign:
                "right",
            },

            4: {
              cellWidth: 18,
              halign:
                "right",
            },

            5: {
              cellWidth: 22,
              halign:
                "right",
              fontStyle:
                "bold",
            },
          }
        : {
            0: {
              cellWidth: 8,
              halign:
                "center",
            },

            1: {
              cellWidth: 22,
              fontStyle:
                "bold",
            },

            2: {
              cellWidth:
                "auto",
            },

            3: {
              cellWidth: 14,
              halign:
                "right",
            },
          },

    margin: {
      left: MARGIN,
      right: MARGIN,
    },

    /*
     * Reserve enough height
     * for product image.
     */
    didParseCell:
      (data) => {
        if (
          data.section !==
            "body" ||
          data.column.index !==
            2
        ) {
          return;
        }

        const itemData =
          body[
            data.row.index
          ];

        if (
          itemData?.image
        ) {
          data.cell.minCellHeight =
            Math.max(
              Number(
                data.cell
                  .minCellHeight
              ) || 0,
              25
            );

          /*
           * IMPORTANT:
           * Remove AutoTable's
           * original description
           * text.
           *
           * We redraw it ourselves
           * beside the image.
           */
          data.cell.text =
            [];
        }
      },

    /*
     * Draw image + description
     * inside the same Item cell.
     */
    didDrawCell:
      (data) => {
        if (
          data.section !==
            "body" ||
          data.column.index !==
            2
        ) {
          return;
        }

        const itemData =
          body[
            data.row.index
          ];

        if (
          !itemData?.image
        ) {
          /*
           * No image:
           * AutoTable already
           * removed the text only
           * when image exists.
           */
          return;
        }

        const cell =
          data.cell;

        try {
          /*
           * Image container.
           */
          const imageSize =
            Math.min(
              20,
              cell.height - 4
            );

          const imageX =
            cell.x + 2;

          const imageY =
            cell.y +
            (
              cell.height -
              imageSize
            ) /
              2;

          /*
           * White image background.
           */
          doc.setFillColor(
            WHITE[0],
            WHITE[1],
            WHITE[2]
          );

          doc.roundedRect(
            imageX,
            imageY,
            imageSize,
            imageSize,
            1.5,
            1.5,
            "F"
          );

          /*
           * Actual product image.
           */
          doc.addImage(
            itemData.image,
            "JPEG",
            imageX,
            imageY,
            imageSize,
            imageSize
          );

          /*
           * Description text.
           */
          const text =
            itemData.row[2];

          const textX =
            cell.x + 25;

          const textWidth =
            cell.width - 28;

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

          const wrapped =
            doc.splitTextToSize(
              text,
              textWidth
            );

          /*
           * Vertically center
           * description.
           */
          const lineHeight =
            3.5;

          const textHeight =
            wrapped.length *
            lineHeight;

          let textY =
            cell.y +
            (
              cell.height -
              textHeight
            ) /
              2 +
            2.8;

          if (
            textY <
            cell.y + 4
          ) {
            textY =
              cell.y + 4;
          }

          doc.text(
            wrapped,
            textX,
            textY
          );

        } catch (
          error
        ) {
          console.warn(
            "Could not draw product image:",
            error
          );
        }
      },
  });

  return (
    doc.lastAutoTable
      .finalY + 5
  );
}

/* =========================================================
   TOTALS
   ========================================================= */

function totalsBlock(
  doc,
  lines,
  y
) {
  /*
   * Slightly wider box so
   * ₹ amounts never get clipped.
   */
  const boxW = 74;

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
   * Background.
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
     * Label.
     */
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
     * Value.
     */
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

    /*
     * Divider before
     * important final amount.
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
   * User requested:
   * only SC Aura Kurtis
   * in the middle.
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
      "SC Aura Kurtis",
    PAGE_W / 2,
    footerY,
    {
      align: "center",
    }
  );
}

/* =========================================================
   BOOKING
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
          ?.name || "—",
      ],

      [
        "Shop",
        b.customer_snapshot
          ?.shop_name || "—",
      ],

      [
        "Phone",
        b.customer_snapshot
          ?.phone || "—",
      ],

      [
        "Status",
        (
          b.status || ""
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
    (
      b.items || []
    ).reduce(
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
          money(
            b.item_total
          ),
          false,
        ],

        [
          "Advance Received",
          money(
            b.advance_received
          ),
          false,
        ],

        [
          "Remaining",
          money(
            b.remaining
          ),
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
   DISPATCH
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
        d.phone || "—",
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
    (
      d.items || []
    ).reduce(
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
          money(
            d.item_total
          ),
          false,
        ],

        [
          "Delivery Charges",
          money(
            d.delivery_charges
          ),
          false,
        ],

        [
          "Grand Total",
          money(
            d.grand_total
          ),
          false,
        ],

        [
          "Advance Received",
          money(
            d.advance_received
          ),
          false,
        ],

        [
          "Final Payable",
          money(
            d.final_payable
          ),
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
   ESTIMATE
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
          est.status || ""
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
          money(
            est.item_total
          ),
          false,
        ],

        [
          "Delivery Charges",
          money(
            est.delivery_charges
          ),
          false,
        ],

        [
          "Grand Total",
          money(
            est.grand_total
          ),
          false,
        ],

        [
          "Advance Received",
          money(
            est.advance_received
          ),
          false,
        ],

        [
          "Remaining",
          money(
            est.remaining
          ),
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
   RETURN
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
        showImages: true,
      }
    );

  const totalPcs =
    (
      r.items || []
    ).reduce(
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
          money(
            r.item_total
          ),
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
  doc.save(
    filename
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
  const blob =
    doc.output("blob");

  const file =
    new File(
      [blob],
      filename,
      {
        type:
          "application/pdf",
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
      // Continue to download/WhatsApp
    }
  }

  doc.save(
    filename
  );

  const clean =
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
    ? `https://wa.me/${clean}?text=${text}`
    : `https://wa.me/?text=${text}`;

  window.open(
    url,
    "_blank",
    "noopener"
  );

  return false;
}
