/**
 * SC AURA KURTIS - FINAL PDF
 * A5 ERP receipts: Booking / Dispatch / Estimate / Return
 *
 * FINAL LOCKED LAYOUT
 * - Full GST/header information stays visible
 * - SCA number stays on one line
 * - Large product image inside Item / Description cell
 * - Description never leaves its cell
 * - Rs. currency text
 * - No NaN totals
 * - Footer: SC Aura Kurtis only
 * - No QR / signature / thank-you / extra footer text
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_W = 148;
const PAGE_H = 210;
const MARGIN = 10;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = [17, 24, 39];
const MUTE = [107, 114, 128];
const LINE = [229, 231, 235];
const SOFT = [248, 250, 252];
const WHITE = [255, 255, 255];

const FOOTER_Y = PAGE_H - 12;
const CONTENT_BOTTOM = FOOTER_Y - 7;

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.REACT_APP_BACKEND_URL ||
  "";

/* =========================================================
   BASIC HELPERS
========================================================= */

function setText(doc, color = INK) {
  doc.setTextColor(
    color[0],
    color[1],
    color[2]
  );
}

function setDraw(doc, color = LINE) {
  doc.setDrawColor(
    color[0],
    color[1],
    color[2]
  );
}

function setFill(doc, color = SOFT) {
  doc.setFillColor(
    color[0],
    color[1],
    color[2]
  );
}

function num(value, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : fallback;
  }

  const cleaned = String(
    value ?? ""
  )
    .replace(/₹/g, "")
    .replace(/Rs\.?/gi, "")
    .replace(/,/g, "")
    .trim();

  if (!cleaned) {
    return fallback;
  }

  const n = Number(cleaned);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function money(value) {
  return `Rs. ${new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 0,
    }
  ).format(num(value, 0))}`;
}

function totalPieces(items) {
  return (
    Array.isArray(items)
      ? items
      : []
  ).reduce(
    (sum, item) => {
      if (
        item?.sizes &&
        typeof item.sizes === "object"
      ) {
        return (
          sum +
          Object.values(
            item.sizes
          ).reduce(
            (s, q) =>
              s + num(q, 0),
            0
          )
        );
      }

      return (
        sum +
        num(
          item?.quantity,
          0
        )
      );
    },
    0
  );
}

function itemTotalFromRows(items) {
  return (
    Array.isArray(items)
      ? items
      : []
  ).reduce(
    (sum, item) => {
      const qty =
        item?.sizes &&
        typeof item.sizes === "object"
          ? Object.values(
              item.sizes
            ).reduce(
              (s, q) =>
                s + num(q, 0),
              0
            )
          : num(
              item?.quantity,
              0
            );

      return (
        sum +
        qty *
          num(
            item?.unit_price,
            0
          )
      );
    },
    0
  );
}

function validOrFallback(
  value,
  fallback
) {
  const n = num(
    value,
    NaN
  );

  return Number.isFinite(n)
    ? n
    : fallback;
}

function sizeText(item) {
  if (
    !item?.sizes ||
    typeof item.sizes !== "object"
  ) {
    return "";
  }

  return Object.entries(
    item.sizes
  )
    .filter(
      ([, q]) =>
        num(q, 0) > 0
    )
    .map(
      ([size, q]) =>
        `${size}:${q}`
    )
    .join("  ");
}

function descriptionText(item) {
  const title =
    String(
      item?.title ||
        item?.name ||
        ""
    ).trim();

  const sizes =
    sizeText(item);

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

/* =========================================================
   IMAGE HELPERS
========================================================= */

async function blobToDataUrl(
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
    typeof src !== "string"
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
  } catch (error) {
    console.warn(
      "PDF image load failed",
      error
    );

    return null;
  }
}

function imageType(
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
   PDF
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
  const top = MARGIN;

  /*
   * Logo
   */
  const logoSize = 18;

  let textX = MARGIN;

  if (branding?.logo_url) {
    const logo =
      await imageToDataUrl(
        branding.logo_url
      );

    if (logo) {
      try {
        doc.addImage(
          logo,
          imageType(logo),
          MARGIN,
          top,
          logoSize,
          logoSize
        );

        textX =
          MARGIN + 22;
      } catch {
        textX = MARGIN;
      }
    }
  }

  /*
   * Document box
   *
   * Narrower than previous version so GST/header text
   * has enough horizontal space.
   */
  const boxW = 34;
  const boxH = 19;

  const boxX =
    PAGE_W -
    MARGIN -
    boxW;

  /*
   * Company name
   */
  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(14.5);

  setText(doc);

  const company =
    String(
      branding?.company_name ||
        "SC Aura Kurtis"
    );

  doc.text(
    company,
    textX,
    top + 5.2
  );

  /*
   * Header information
   */
  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7.5);

  setText(
    doc,
    MUTE
  );

  const infoWidth =
    Math.max(
      40,
      boxX -
        textX -
        4
    );

  const info = [];

  if (branding?.address) {
    info.push(
      String(
        branding.address
      )
    );
  }

  const contact = [
    branding?.phone
      ? String(
          branding.phone
        )
      : "",

    branding?.gst
      ? `GST: ${branding.gst}`
      : "",
  ]
    .filter(Boolean)
    .join("  ·  ");

  if (contact) {
    info.push(contact);
  }

  let infoY =
    top + 10.2;

  for (
    const line of info
  ) {
    const wrapped =
      doc.splitTextToSize(
        line,
        infoWidth
      );

    doc.text(
      wrapped,
      textX,
      infoY
    );

    infoY +=
      wrapped.length *
      3.1;
  }

  /*
   * Document box
   */
  setDraw(
    doc,
    LINE
  );

  setFill(
    doc,
    SOFT
  );

  doc.roundedRect(
    boxX,
    top,
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

  doc.setFontSize(8.5);

  setText(doc);

  doc.text(
    title,
    boxX +
      boxW / 2,
    top + 6.5,
    {
      align: "center",
    }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9.5);

  doc.text(
    String(
      documentNumber || ""
    ),
    boxX +
      boxW / 2,
    top + 13.5,
    {
      align: "center",
    }
  );

  /*
   * Divider is deliberately below all header information.
   * This prevents GST from being visually cut.
   */
  const dividerY =
    Math.max(
      top + 25,
      infoY + 1.5,
      top + boxH + 5
    );

  setDraw(
    doc,
    LINE
  );

  doc.line(
    MARGIN,
    dividerY,
    PAGE_W - MARGIN,
    dividerY
  );

  return (
    dividerY + 5
  );
}

/* =========================================================
   META
========================================================= */

function drawMetaBlock(
  doc,
  entries,
  startY
) {
  const colWidth =
    CONTENT_W / 2;

  const rowHeight =
    6.2;

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
      Math.floor(
        i / 2
      );

    const x =
      MARGIN +
      col *
        colWidth;

    const y =
      startY +
      row *
        rowHeight;

    /*
     * Label
     */
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7.8);

    setText(
      doc,
      MUTE
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

    doc.setFontSize(7.8);

    setText(doc);

    const valueText =
      value === null ||
      value === undefined ||
      value === ""
        ? "—"
        : String(value);

    const valueWidth =
      colWidth - 29;

    const wrapped =
      doc.splitTextToSize(
        valueText,
        valueWidth
      );

    doc.text(
      wrapped,
      x + 25,
      y
    );
  }

  return (
    startY +
    rows *
      rowHeight +
    3
  );
}

/* =========================================================
   ITEMS TABLE
========================================================= */

async function drawItemsTable(
  doc,
  items,
  startY
) {
  const rows =
    Array.isArray(items)
      ? items
      : [];

  const prepared = [];

  /*
   * Prepare every row before AutoTable.
   */
  for (
    const item of rows
  ) {
    const qty =
      item?.sizes &&
      typeof item.sizes ===
        "object"
        ? Object.values(
            item.sizes
          ).reduce(
            (s, q) =>
              s +
              num(q, 0),
            0
          )
        : num(
            item?.quantity,
            0
          );

    const rate =
      num(
        item?.unit_price,
        0
      );

    const amount =
      qty * rate;

    const image =
      item?.image
        ? await imageToDataUrl(
            item.image
          )
        : null;

    prepared.push({
      item,
      qty,
      rate,
      amount,
      image,
      description:
        descriptionText(
          item
        ),
    });
  }

  /*
   * IMPORTANT:
   *
   * Table width = exactly 128mm
   *
   * #       7
   * SCA    20
   * Item   51
   * Qty    10
   * Rate   18
   * Amount 22
   *
   * Total 128mm
   */
  const body =
    prepared.map(
      (
        p,
        index
      ) => [
        String(
          index + 1
        ),

        String(
          p.item?.sr_number ||
            ""
        ),

        "",

        String(
          p.qty
        ),

        money(
          p.rate
        ),

        money(
          p.amount
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
          "Item / Description",
          "Qty",
          "Rate",
          "Amount",
        ],
      ],

      body,

      theme: "grid",

      margin: {
        left: MARGIN,
        right: MARGIN,
        top: MARGIN,
        bottom: 18,
      },

      styles: {
        font:
          "helvetica",

        fontSize:
          7.8,

        cellPadding:
          2,

        lineColor:
          LINE,

        lineWidth:
          0.15,

        textColor:
          INK,

        valign:
          "middle",

        overflow:
          "linebreak",
      },

      headStyles: {
        fillColor:
          INK,

        textColor:
          WHITE,

        fontStyle:
          "bold",

        fontSize:
          7.8,

        halign:
          "left",

        valign:
          "middle",
      },

      alternateRowStyles: {
        fillColor:
          SOFT,
      },

      /*
       * Exact 128mm layout.
       */
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
         *
         * 20mm is enough for:
         * SCA-00017
         */
        1: {
          cellWidth: 20,
          fontStyle:
            "bold",
          overflow:
            "ellipsize",
        },

        /*
         * Item / Description
         *
         * 51mm gives a large image area
         * and enough description space.
         */
        2: {
          cellWidth: 51,
        },

        /*
         * Qty
         */
        3: {
          cellWidth: 10,
          halign:
            "right",
        },

        /*
         * Rate
         */
        4: {
          cellWidth: 18,
          halign:
            "right",
        },

        /*
         * Amount
         */
        5: {
          cellWidth: 22,
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

        const p =
          prepared[
            data.row.index
          ];

        if (!p) {
          return;
        }

        /*
         * Item / Description cell
         *
         * Remove AutoTable text completely.
         * We render image + description ourselves.
         */
        if (
          data.column.index ===
          2
        ) {
          data.cell.text =
            [];

          const descriptionWidth =
            p.image
              ? 27
              : 47;

          const lines =
            doc.splitTextToSize(
              p.description,
              descriptionWidth
            );

          const imageHeight =
            p.image
              ? 24
              : 0;

          const textHeight =
            lines.length *
              3.3 +
            4;

          /*
           * Large enough for 21mm image.
           * Also enough for normal title + sizes.
           */
          data.cell.minCellHeight =
            Math.max(
              26,
              imageHeight +
                2,
              textHeight +
                2
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

        const p =
          prepared[
            data.row.index
          ];

        if (!p) {
          return;
        }

        /*
         * ITEM / DESCRIPTION
         */
        if (
          data.column.index ===
          2
        ) {
          const cell =
            data.cell;

          const padding =
            2;

          /*
           * Dedicated image area.
           */
          const imageBox =
            22;

          if (p.image) {
            /*
             * White image background.
             */
            setFill(
              doc,
              WHITE
            );

            doc.rect(
              cell.x +
                0.7,

              cell.y +
                0.7,

              imageBox,

              Math.max(
                1,
                cell.height -
                  1.4
              ),

              "F"
            );

            /*
             * LARGE PRODUCT IMAGE
             *
             * 21mm instead of previous 17mm.
             */
            const size =
              Math.min(
                21,
                cell.height -
                  padding *
                    2
              );

            const imageX =
              cell.x +
              1.2;

            const imageY =
              cell.y +
              (
                cell.height -
                size
              ) /
                2;

            try {
              doc.addImage(
                p.image,
                imageType(
                  p.image
                ),
                imageX,
                imageY,
                size,
                size
              );
            } catch (
              error
            ) {
              console.warn(
                "Product image draw failed",
                error
              );
            }

            /*
             * DESCRIPTION
             *
             * Starts AFTER image area.
             * Never overlaps image.
             */
            doc.setFont(
              "helvetica",
              "normal"
            );

            doc.setFontSize(
              7.8
            );

            setText(doc);

            const textX =
              cell.x +
              imageBox +
              3;

            const textWidth =
              cell.width -
              imageBox -
              5;

            const lines =
              doc.splitTextToSize(
                p.description,
                Math.max(
                  12,
                  textWidth
                )
              );

            const lineH =
              3.3;

            const totalH =
              lines.length *
              lineH;

            const textY =
              cell.y +
              Math.max(
                5,
                (
                  cell.height -
                  totalH
                ) /
                  2 +
                  2.5
              );

            doc.text(
              lines,
              textX,
              textY
            );
          } else {
            /*
             * No image:
             * description gets full cell width.
             */
            doc.setFont(
              "helvetica",
              "normal"
            );

            doc.setFontSize(
              7.8
            );

            setText(doc);

            const lines =
              doc.splitTextToSize(
                p.description,
                cell.width - 4
              );

            doc.text(
              lines,
              cell.x + 2,
              cell.y + 5
            );
          }

          return;
        }

        /*
         * Rate and Amount already contain:
         *
         * Rs. 1,395
         * Rs. 5,580
         *
         * So AutoTable's normal text handles them.
         * No custom ₹ drawing.
         */
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

function totalsHeight(
  lines
) {
  return (
    lines.length *
      6.3 +
    8
  );
}

function drawTotalsBlock(
  doc,
  lines,
  startY
) {
  const boxW =
    72;

  const boxX =
    PAGE_W -
    MARGIN -
    boxW;

  const rowH =
    6.3;

  const boxH =
    totalsHeight(
      lines
    );

  setDraw(
    doc,
    LINE
  );

  setFill(
    doc,
    SOFT
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

  let y =
    startY + 5.3;

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
      setDraw(
        doc,
        LINE
      );

      doc.line(
        boxX + 3,
        y - 4.1,
        boxX +
          boxW -
          3,
        y - 4.1
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
        ? 8.5
        : 8
    );

    setText(
      doc,
      bold
        ? INK
        : MUTE
    );

    doc.text(
      String(label),
      boxX + 3,
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
        ? 8.5
        : 8
    );

    setText(doc);

    doc.text(
      String(value),
      boxX +
        boxW -
        3,
      y,
      {
        align:
          "right",
      }
    );

    y += rowH;
  }

  return (
    startY +
    boxH +
    4
  );
}

function ensureTotalsSpace(
  doc,
  y,
  lines
) {
  const needed =
    totalsHeight(
      lines
    ) + 4;

  if (
    y + needed >
    CONTENT_BOTTOM
  ) {
    doc.addPage();

    return MARGIN;
  }

  return y;
}

/* =========================================================
   FOOTER
========================================================= */

function drawFooter(
  doc,
  branding
) {
  setDraw(
    doc,
    LINE
  );

  doc.line(
    MARGIN,
    FOOTER_Y - 4,
    PAGE_W - MARGIN,
    FOOTER_Y - 4
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    8.5
  );

  setText(doc);

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
      align:
        "center",
    }
  );
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

  const items =
    booking?.items ||
    [];

  y =
    await drawItemsTable(
      doc,
      items,
      y
    );

  const calculatedItemTotal =
    itemTotalFromRows(
      items
    );

  const itemTotal =
    validOrFallback(
      booking?.item_total,
      calculatedItemTotal
    );

  const advance =
    validOrFallback(
      booking?.advance_received,
      0
    );

  const remaining =
    validOrFallback(
      booking?.remaining,
      Math.max(
        0,
        itemTotal -
          advance
      )
    );

  const totals = [
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
      String(
        totalPieces(items)
      ),
      false,
    ],
  ];

  y =
    ensureTotalsSpace(
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
          num(
            dispatch?.final_payable,
            0
          ) <= 0
            ? "PAID"
            : "PENDING",
        ],
      ],
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
    validOrFallback(
      dispatch?.item_total,
      itemTotalFromRows(
        items
      )
    );

  const delivery =
    validOrFallback(
      dispatch?.delivery_charges,
      0
    );

  const grandTotal =
    validOrFallback(
      dispatch?.grand_total,
      itemTotal +
        delivery
    );

  const advance =
    validOrFallback(
      dispatch?.advance_received,
      0
    );

  const finalPayable =
    validOrFallback(
      dispatch?.final_payable,
      Math.max(
        0,
        grandTotal -
          advance
      )
    );

  const totals = [
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
      String(
        totalPieces(items)
      ),
      false,
    ],
  ];

  y =
    ensureTotalsSpace(
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
    validOrFallback(
      estimate?.item_total,
      itemTotalFromRows(
        items
      )
    );

  const delivery =
    validOrFallback(
      estimate?.delivery_charges,
      0
    );

  const grandTotal =
    validOrFallback(
      estimate?.grand_total,
      itemTotal +
        delivery
    );

  const advance =
    validOrFallback(
      estimate?.advance_received,
      0
    );

  const remaining =
    validOrFallback(
      estimate?.remaining,
      Math.max(
        0,
        grandTotal -
          advance
      )
    );

  const totals = [
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
  ];

  y =
    ensureTotalsSpace(
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
    validOrFallback(
      returnData?.item_total,
      itemTotalFromRows(
        items
      )
    );

  const totals = [
    [
      "Item Total",
      money(itemTotal),
      true,
    ],

    [
      "Pieces Returned",
      String(
        totalPieces(items)
      ),
      false,
    ],
  ];

  y =
    ensureTotalsSpace(
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
       * Continue to
       * download + WhatsApp.
       */
    }
  }

  doc.save(
    finalFilename
  );

  const cleanPhone =
    String(phone || "")
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
