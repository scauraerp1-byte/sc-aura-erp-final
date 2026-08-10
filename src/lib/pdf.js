/**
 * SC AURA KURTIS
 * PROFESSIONAL ERP DOCUMENT PDF
 *
 * Documents:
 * - Booking
 * - Dispatch
 * - Estimate
 * - Return
 *
 * DESIGN:
 * - A5 LANDSCAPE
 * - Professional business receipt
 * - Dedicated product image column
 * - Dedicated description column
 * - Separate SCA column
 * - Clean customer / document information cards
 * - Rs. currency text
 * - No ₹ glyph
 * - No QR
 * - No signature
 * - No unnecessary footer text
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* =========================================================
   PAGE
========================================================= */

const PAGE_W = 210;
const PAGE_H = 148;

const MARGIN = 10;
const CONTENT_W =
  PAGE_W - MARGIN * 2;

const FOOTER_Y = PAGE_H - 8;
const CONTENT_BOTTOM =
  FOOTER_Y - 5;

/* =========================================================
   COLORS
========================================================= */

const NAVY = [18, 27, 45];
const NAVY_2 = [31, 43, 67];

const TEXT = [25, 32, 45];
const MUTED = [102, 112, 128];

const BORDER = [222, 226, 232];
const LIGHT = [247, 248, 250];
const WHITE = [255, 255, 255];

const ACCENT = [190, 154, 65];

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

function setTextColor(
  doc,
  color
) {
  doc.setTextColor(
    color[0],
    color[1],
    color[2]
  );
}

function setDrawColor(
  doc,
  color
) {
  doc.setDrawColor(
    color[0],
    color[1],
    color[2]
  );
}

function setFillColor(
  doc,
  color
) {
  doc.setFillColor(
    color[0],
    color[1],
    color[2]
  );
}

function safeNumber(
  value,
  fallback = 0
) {
  if (
    typeof value ===
    "number"
  ) {
    return Number.isFinite(
      value
    )
      ? value
      : fallback;
  }

  const cleaned =
    String(
      value ?? ""
    )
      .replace(/₹/g, "")
      .replace(
        /Rs\.?/gi,
        ""
      )
      .replace(/,/g, "")
      .trim();

  if (!cleaned) {
    return fallback;
  }

  const n =
    Number(cleaned);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function money(value) {
  return (
    "Rs. " +
    new Intl.NumberFormat(
      "en-IN",
      {
        maximumFractionDigits: 0,
      }
    ).format(
      safeNumber(
        value,
        0
      )
    )
  );
}

function dateTime(value) {
  if (!value) {
    return "—";
  }

  try {
    return new Date(
      value
    ).toLocaleString(
      "en-IN",
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
      }
    );
  } catch {
    return String(value);
  }
}

/* =========================================================
   PRODUCT HELPERS
========================================================= */

function getTotalQuantity(
  item
) {
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
        safeNumber(
          quantity,
          0
        ),
      0
    );
  }

  return safeNumber(
    item?.quantity,
    0
  );
}

function getSizeText(
  item
) {
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
        safeNumber(
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

function getDescription(
  item
) {
  const title =
    String(
      item?.title ||
        item?.name ||
        ""
    ).trim();

  const sizes =
    getSizeText(item);

  if (
    title &&
    sizes
  ) {
    return `${title}\n${sizes}`;
  }

  return (
    title ||
    sizes ||
    "—"
  );
}

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
        safeNumber(
          item?.unit_price,
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

function firstValid(
  value,
  fallback
) {
  const n =
    safeNumber(
      value,
      NaN
    );

  return Number.isFinite(
    n
  )
    ? n
    : fallback;
}

/* =========================================================
   IMAGE HELPERS
========================================================= */

function blobToDataUrl(
  blob
) {
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

async function imageToDataUrl(
  src
) {
  if (
    !src ||
    typeof src !==
      "string"
  ) {
    return null;
  }

  if (
    src.startsWith(
      "data:image/"
    )
  ) {
    return src;
  }

  try {
    let url = src;

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

      url =
        `${BACKEND_URL}/api/images/proxy?url=${encodeURIComponent(src)}`;
    }

    const response =
      await fetch(url);

    if (!response.ok) {
      return null;
    }

    const blob =
      await response.blob();

    return await blobToDataUrl(
      blob
    );
  } catch (
    error
  ) {
    console.warn(
      "PDF image loading failed:",
      error
    );

    return null;
  }
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
   PDF BASE
========================================================= */

export function newReceiptDoc() {
  return new jsPDF({
    unit: "mm",
    format: [
      PAGE_W,
      PAGE_H,
    ],
    orientation:
      "landscape",
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

  let textX =
    MARGIN;

  /*
   * LOGO
   */
  if (
    branding?.logo_url
  ) {
    const logo =
      await imageToDataUrl(
        branding.logo_url
      );

    if (logo) {
      try {
        doc.addImage(
          logo,
          getImageType(
            logo
          ),
          MARGIN,
          y,
          logoSize,
          logoSize
        );

        textX =
          MARGIN + 25;
      } catch {
        textX =
          MARGIN;
      }
    }
  }

  /*
   * COMPANY
   */
  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    17
  );

  setTextColor(
    doc,
    NAVY
  );

  doc.text(
    branding?.company_name ||
      "SC Aura Kurtis",
    textX,
    y + 6
  );

  /*
   * ADDRESS
   */
  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(
    8
  );

  setTextColor(
    doc,
    MUTED
  );

  const address =
    branding?.address ||
    "";

  const contact = [
    branding?.phone
      ? branding.phone
      : null,

    branding?.gst
      ? `GST: ${branding.gst}`
      : null,
  ]
    .filter(Boolean)
    .join(
      "   ·   "
    );

  if (address) {
    const addressLines =
      doc.splitTextToSize(
        String(address),
        110
      );

    doc.text(
      addressLines,
      textX,
      y + 11
    );
  }

  if (contact) {
    doc.text(
      contact,
      textX,
      y + 17
    );
  }

  /*
   * DOCUMENT CARD
   */
  const cardW = 43;
  const cardH = 24;

  const cardX =
    PAGE_W -
    MARGIN -
    cardW;

  setFillColor(
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
   * Gold accent line
   */
  setFillColor(
    doc,
    ACCENT
  );

  doc.roundedRect(
    cardX,
    y,
    2,
    cardH,
    1,
    1,
    "F"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    8
  );

  setTextColor(
    doc,
    [220, 225, 235]
  );

  doc.text(
    title,
    cardX +
      cardW / 2,
    y + 8,
    {
      align:
        "center",
    }
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    13
  );

  setTextColor(
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
    y + 17,
    {
      align:
        "center",
    }
  );

  /*
   * DIVIDER
   */
  setDrawColor(
    doc,
    BORDER
  );

  doc.line(
    MARGIN,
    y + 28,
    PAGE_W - MARGIN,
    y + 28
  );

  return y + 33;
}

/* =========================================================
   INFORMATION CARDS
========================================================= */

function drawInfoCards(
  doc,
  customer,
  details,
  startY
) {
  const gap = 5;

  const leftW = 88;

  const rightW =
    CONTENT_W -
    leftW -
    gap;

  const cardH = 27;

  const leftX =
    MARGIN;

  const rightX =
    MARGIN +
    leftW +
    gap;

  /*
   * LEFT CUSTOMER CARD
   */
  setFillColor(
    doc,
    LIGHT
  );

  setDrawColor(
    doc,
    BORDER
  );

  doc.roundedRect(
    leftX,
    startY,
    leftW,
    cardH,
    2.5,
    2.5,
    "FD"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    7.5
  );

  setTextColor(
    doc,
    MUTED
  );

  doc.text(
    "CUSTOMER",
    leftX + 5,
    startY + 6
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    11
  );

  setTextColor(
    doc,
    NAVY
  );

  doc.text(
    String(
      customer?.name ||
        "Walk-in Customer"
    ),
    leftX + 5,
    startY + 13
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(
    7.8
  );

  setTextColor(
    doc,
    MUTED
  );

  const phone =
    customer?.phone
      ? `Phone: ${customer.phone}`
      : "";

  const shop =
    customer?.shop_name
      ? `Shop: ${customer.shop_name}`
      : "";

  if (phone) {
    doc.text(
      phone,
      leftX + 5,
      startY + 20
    );
  }

  if (shop) {
    doc.text(
      shop,
      leftX + 50,
      startY + 20
    );
  }

  /*
   * RIGHT DOCUMENT DETAILS
   */
  setFillColor(
    doc,
    LIGHT
  );

  setDrawColor(
    doc,
    BORDER
  );

  doc.roundedRect(
    rightX,
    startY,
    rightW,
    cardH,
    2.5,
    2.5,
    "FD"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    7.5
  );

  setTextColor(
    doc,
    MUTED
  );

  doc.text(
    "DOCUMENT DETAILS",
    rightX + 5,
    startY + 6
  );

  /*
   * Date
   */
  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(
    7.5
  );

  setTextColor(
    doc,
    MUTED
  );

  doc.text(
    "Date",
    rightX + 5,
    startY + 13
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  setTextColor(
    doc,
    TEXT
  );

  doc.text(
    String(
      details?.date ||
        "—"
    ),
    rightX + 23,
    startY + 13
  );

  /*
   * Status
   */
  doc.setFont(
    "helvetica",
    "normal"
  );

  setTextColor(
    doc,
    MUTED
  );

  doc.text(
    "Status",
    rightX + 5,
    startY + 20
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  setTextColor(
    doc,
    NAVY
  );

  doc.text(
    String(
      details?.status ||
        "—"
    ),
    rightX + 23,
    startY + 20
  );

  return (
    startY +
    cardH +
    6
  );
}

/* =========================================================
   PRODUCT TABLE
========================================================= */

async function drawItemsTable(
  doc,
  items,
  startY
) {
  const source =
    Array.isArray(items)
      ? items
      : [];

  const prepared =
    [];

  /*
   * PREPARE DATA
   */
  for (
    const item of source
  ) {
    const image =
      item?.image
        ? await imageToDataUrl(
            item.image
          )
        : null;

    const qty =
      getTotalQuantity(
        item
      );

    const rate =
      safeNumber(
        item?.unit_price,
        0
      );

    const amount =
      qty * rate;

    prepared.push({
      item,
      image,
      qty,
      rate,
      amount,
      description:
        getDescription(
          item
        ),
    });
  }

  /*
   * TABLE WIDTH
   *
   * Content width = 190mm
   *
   * #       7
   * SCA     24
   * IMAGE   30
   * DESC    70
   * QTY     12
   * RATE    22
   * AMOUNT  25
   *
   * TOTAL   190
   */
  const body =
    prepared.map(
      (
        row,
        index
      ) => [
        String(
          index + 1
        ),

        String(
          row.item
            ?.sr_number ||
            ""
        ),

        "",

        "",

        String(
          row.qty
        ),

        money(
          row.rate
        ),

        money(
          row.amount
        ),
      ]
    );

  autoTable(
    doc,
    {
      startY,

      head: [
        [
          "#",
          "SCA",
          "IMAGE",
          "DESCRIPTION",
          "QTY",
          "RATE",
          "AMOUNT",
        ],
      ],

      body,

      theme: "grid",

      margin: {
        left: MARGIN,
        right: MARGIN,
        bottom: 18,
      },

      styles: {
        font:
          "helvetica",

        fontSize:
          8,

        cellPadding:
          2,

        lineColor:
          BORDER,

        lineWidth:
          0.18,

        textColor:
          TEXT,

        valign:
          "middle",

        overflow:
          "linebreak",
      },

      headStyles: {
        fillColor:
          NAVY,

        textColor:
          WHITE,

        fontStyle:
          "bold",

        fontSize:
          7.5,

        halign:
          "left",

        valign:
          "middle",

        cellPadding:
          2.2,
      },

      alternateRowStyles: {
        fillColor:
          WHITE,
      },

      columnStyles: {
        /*
         * #
         */
        0: {
          cellWidth: 7,
          halign:
            "center",
        },

        /*
         * SCA
         */
        1: {
          cellWidth: 24,
          fontStyle:
            "bold",
          overflow:
            "ellipsize",
        },

        /*
         * IMAGE
         */
        2: {
          cellWidth: 30,
          halign:
            "center",
        },

        /*
         * DESCRIPTION
         */
        3: {
          cellWidth: 70,
        },

        /*
         * QTY
         */
        4: {
          cellWidth: 12,
          halign:
            "center",
        },

        /*
         * RATE
         */
        5: {
          cellWidth: 22,
          halign:
            "right",
        },

        /*
         * AMOUNT
         */
        6: {
          cellWidth: 25,
          halign:
            "right",
          fontStyle:
            "bold",
        },
      },

      didParseCell(
        data
      ) {
        if (
          data.section !==
          "body"
        ) {
          return;
        }

        const row =
          prepared[
            data.row.index
          ];

        if (!row) {
          return;
        }

        /*
         * IMAGE CELL
         */
        if (
          data.column.index ===
          2
        ) {
          data.cell.text =
            [];

          /*
           * Large image row.
           */
          data.cell.minCellHeight =
            Math.max(
              31,
              data.cell
                .minCellHeight ||
                0
            );
        }

        /*
         * DESCRIPTION CELL
         */
        if (
          data.column.index ===
          3
        ) {
          data.cell.text =
            [];

          const lines =
            doc.splitTextToSize(
              row.description,
              65
            );

          data.cell.minCellHeight =
            Math.max(
              31,
              lines.length *
                3.5 +
                7
            );
        }
      },

      didDrawCell(
        data
      ) {
        if (
          data.section !==
          "body"
        ) {
          return;
        }

        const row =
          prepared[
            data.row.index
          ];

        if (!row) {
          return;
        }

        /*
         * =====================================================
         * IMAGE
         * =====================================================
         */
        if (
          data.column.index ===
          2
        ) {
          const cell =
            data.cell;

          /*
           * Light image background.
           */
          setFillColor(
            doc,
            LIGHT
          );

          setDrawColor(
            doc,
            BORDER
          );

          const boxSize =
            Math.min(
              26,
              cell.height - 4
            );

          const boxX =
            cell.x +
            (
              cell.width -
              boxSize
            ) /
              2;

          const boxY =
            cell.y +
            (
              cell.height -
              boxSize
            ) /
              2;

          doc.roundedRect(
            boxX,
            boxY,
            boxSize,
            boxSize,
            1.5,
            1.5,
            "FD"
          );

          /*
           * ACTUAL PRODUCT IMAGE
           */
          if (row.image) {
            try {
              const imageSize =
                Math.min(
                  23,
                  boxSize - 2
                );

              const imageX =
                cell.x +
                (
                  cell.width -
                  imageSize
                ) /
                  2;

              const imageY =
                cell.y +
                (
                  cell.height -
                  imageSize
                ) /
                  2;

              doc.addImage(
                row.image,
                getImageType(
                  row.image
                ),
                imageX,
                imageY,
                imageSize,
                imageSize
              );
            } catch (
              error
            ) {
              console.warn(
                "Unable to draw product image:",
                error
              );
            }
          }

          return;
        }

        /*
         * =====================================================
         * DESCRIPTION
         * =====================================================
         */
        if (
          data.column.index ===
          3
        ) {
          const cell =
            data.cell;

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            8.2
          );

          setTextColor(
            doc,
            NAVY
          );

          const lines =
            doc.splitTextToSize(
              row.description,
              cell.width - 5
            );

          const lineHeight =
            3.5;

          const totalHeight =
            lines.length *
            lineHeight;

          const startTextY =
            cell.y +
            Math.max(
              6,
              (
                cell.height -
                totalHeight
              ) /
                2 +
                3
            );

          doc.text(
            lines,
            cell.x + 2.5,
            startTextY
          );

          return;
        }
      },
    }
  );

  return (
    doc.lastAutoTable.finalY +
    5
  );
}

/* =========================================================
   TOTALS
========================================================= */

function drawTotals(
  doc,
  lines,
  startY
) {
  const boxW =
    72;

  const boxH =
    lines.length *
      6.5 +
    9;

  const boxX =
    PAGE_W -
    MARGIN -
    boxW;

  /*
   * Totals card
   */
  setFillColor(
    doc,
    LIGHT
  );

  setDrawColor(
    doc,
    BORDER
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
    startY + 6;

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

    if (
      bold &&
      i > 0
    ) {
      setDrawColor(
        doc,
        BORDER
      );

      doc.line(
        boxX + 4,
        y - 4.2,
        boxX +
          boxW -
          4,
        y - 4.2
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
        ? 8.8
        : 8.2
    );

    setTextColor(
      doc,
      bold
        ? NAVY
        : MUTED
    );

    doc.text(
      String(label),
      boxX + 4,
      y
    );

    doc.setFont(
      "helvetica",
      bold
        ? "bold"
        : "normal"
    );

    doc.setFontSize(
      bold
        ? 8.8
        : 8.2
    );

    setTextColor(
      doc,
      TEXT
    );

    doc.text(
      String(value),
      boxX +
        boxW -
        4,
      y,
      {
        align:
          "right",
      }
    );

    y += 6.5;
  }

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
  setDrawColor(
    doc,
    BORDER
  );

  doc.line(
    MARGIN,
    FOOTER_Y - 2,
    PAGE_W - MARGIN,
    FOOTER_Y - 2
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    7.5
  );

  setTextColor(
    doc,
    MUTED
  );

  doc.text(
    branding?.company_name ||
      "SC Aura Kurtis",
    PAGE_W / 2,
    FOOTER_Y + 1,
    {
      align:
        "center",
    }
  );
}

/* =========================================================
   TOTAL SPACE
========================================================= */

function ensureTotalsSpace(
  doc,
  currentY,
  lines
) {
  const needed =
    lines.length *
      6.5 +
    15;

  if (
    currentY +
      needed >
    CONTENT_BOTTOM
  ) {
    doc.addPage();

    return MARGIN;
  }

  return currentY;
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

  y =
    drawInfoCards(
      doc,
      booking
        ?.customer_snapshot,
      {
        date:
          dateTime(
            booking?.created_at
          ),

        status:
          (
            booking?.status ||
            "CONFIRMED"
          ).toUpperCase(),
      },
      y
    );

  const items =
    booking?.items ||
    [];

  y =
    await drawItemsTable(
      doc,
      items,
      y
    );

  const calculated =
    calculateItemsTotal(
      items
    );

  const itemTotal =
    firstValid(
      booking?.item_total,
      calculated
    );

  const advance =
    firstValid(
      booking?.advance_received,
      0
    );

  const remaining =
    firstValid(
      booking?.remaining,
      Math.max(
        0,
        itemTotal -
          advance
      )
    );

  const pieces =
    calculateTotalPieces(
      items
    );

  const lines = [
    [
      "Item Total",
      money(
        itemTotal
      ),
      false,
    ],

    [
      "Advance Received",
      money(
        advance
      ),
      false,
    ],

    [
      "Balance",
      money(
        remaining
      ),
      true,
    ],

    [
      "Total Pieces",
      String(pieces),
      false,
    ],
  ];

  y =
    ensureTotalsSpace(
      doc,
      y,
      lines
    );

  drawTotals(
    doc,
    lines,
    y
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
    drawInfoCards(
      doc,
      {
        name:
          dispatch?.dispatch_to ||
          "—",

        phone:
          dispatch?.phone ||
          "",

        shop_name:
          "",
      },
      {
        date:
          dateTime(
            dispatch?.created_at
          ),

        status:
          safeNumber(
            dispatch?.final_payable,
            0
          ) <= 0
            ? "PAID"
            : "PENDING",
      },
      y
    );

  const items =
    dispatch?.items ||
    [];

  y =
    await drawItemsTable(
      doc,
      items,
      y
    );

  const itemTotal =
    firstValid(
      dispatch?.item_total,
      calculateItemsTotal(
        items
      )
    );

  const delivery =
    firstValid(
      dispatch?.delivery_charges,
      0
    );

  const grandTotal =
    firstValid(
      dispatch?.grand_total,
      itemTotal +
        delivery
    );

  const advance =
    firstValid(
      dispatch?.advance_received,
      0
    );

  const finalPayable =
    firstValid(
      dispatch?.final_payable,
      Math.max(
        0,
        grandTotal -
          advance
      )
    );

  const pieces =
    calculateTotalPieces(
      items
    );

  const lines = [
    [
      "Item Total",
      money(
        itemTotal
      ),
      false,
    ],

    [
      "Delivery Charges",
      money(
        delivery
      ),
      false,
    ],

    [
      "Grand Total",
      money(
        grandTotal
      ),
      false,
    ],

    [
      "Advance Received",
      money(
        advance
      ),
      false,
    ],

    [
      "Final Payable",
      money(
        finalPayable
      ),
      true,
    ],

    [
      "Total Pieces",
      String(pieces),
      false,
    ],
  ];

  y =
    ensureTotalsSpace(
      doc,
      y,
      lines
    );

  drawTotals(
    doc,
    lines,
    y
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
    drawInfoCards(
      doc,
      {
        name:
          estimate?.customer_name ||
          "Walk-in Customer",

        phone:
          estimate?.customer_phone ||
          "",

        shop_name:
          "",
      },
      {
        date:
          dateTime(
            estimate?.created_at
          ),

        status:
          (
            estimate?.status ||
            "DRAFT"
          ).toUpperCase(),
      },
      y
    );

  const items =
    estimate?.items ||
    [];

  y =
    await drawItemsTable(
      doc,
      items,
      y
    );

  const itemTotal =
    firstValid(
      estimate?.item_total,
      calculateItemsTotal(
        items
      )
    );

  const delivery =
    firstValid(
      estimate?.delivery_charges,
      0
    );

  const grandTotal =
    firstValid(
      estimate?.grand_total,
      itemTotal +
        delivery
    );

  const advance =
    firstValid(
      estimate?.advance_received,
      0
    );

  const remaining =
    firstValid(
      estimate?.remaining,
      Math.max(
        0,
        grandTotal -
          advance
      )
    );

  const lines = [
    [
      "Item Total",
      money(
        itemTotal
      ),
      false,
    ],

    [
      "Delivery Charges",
      money(
        delivery
      ),
      false,
    ],

    [
      "Grand Total",
      money(
        grandTotal
      ),
      false,
    ],

    [
      "Advance Received",
      money(
        advance
      ),
      false,
    ],

    [
      "Balance",
      money(
        remaining
      ),
      true,
    ],
  ];

  y =
    ensureTotalsSpace(
      doc,
      y,
      lines
    );

  drawTotals(
    doc,
    lines,
    y
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
    drawInfoCards(
      doc,
      {
        name:
          returnData?.vendor_name ||
          "—",

        phone:
          "",

        shop_name:
          "",
      },
      {
        date:
          dateTime(
            returnData?.created_at
          ),

        status:
          "VENDOR RETURN",
      },
      y
    );

  const items =
    returnData?.items ||
    [];

  y =
    await drawItemsTable(
      doc,
      items,
      y
    );

  const itemTotal =
    firstValid(
      returnData?.item_total,
      calculateItemsTotal(
        items
      )
    );

  const pieces =
    calculateTotalPieces(
      items
    );

  const lines = [
    [
      "Item Total",
      money(
        itemTotal
      ),
      true,
    ],

    [
      "Pieces Returned",
      String(pieces),
      false,
    ],
  ];

  y =
    ensureTotalsSpace(
      doc,
      y,
      lines
    );

  drawTotals(
    doc,
    lines,
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
        title:
          finalFilename,
      });

      return true;
    } catch {
      /*
       * Fallback below.
       */
    }
  }

  doc.save(
    finalFilename
  );

  const cleanPhone =
    String(
      phone || ""
    )
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
