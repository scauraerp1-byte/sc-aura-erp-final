import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* =========================================================
   SC AURA KURTIS - FINAL PDF
   A5 LANDSCAPE / SINGLE PAGE RECEIPT
========================================================= */

const PAGE_W = 210;
const PAGE_H = 148;

const MARGIN = 9;
const CONTENT_W = PAGE_W - MARGIN * 2;

const NAVY = [18, 27, 45];
const TEXT = [30, 37, 50];
const MUTED = [100, 110, 125];
const BORDER = [220, 224, 230];
const LIGHT = [247, 248, 250];
const WHITE = [255, 255, 255];
const GOLD = [190, 154, 65];

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.REACT_APP_BACKEND_URL ||
  "";

/* =========================================================
   BASIC HELPERS
========================================================= */

function num(value, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : fallback;
  }

  const cleaned = String(value ?? "")
    .replace(/₹/g, "")
    .replace(/Rs\.?/gi, "")
    .replace(/,/g, "")
    .trim();

  if (!cleaned) return fallback;

  const n = Number(cleaned);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function money(value) {
  return (
    "Rs. " +
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(num(value))
  );
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function totalQty(item) {
  if (
    item?.sizes &&
    typeof item.sizes === "object"
  ) {
    return Object.values(item.sizes).reduce(
      (sum, value) =>
        sum + num(value, 0),
      0
    );
  }

  return num(
    item?.quantity ??
      item?.qty ??
      0
  );
}

function sizeText(item) {
  if (
    !item?.sizes ||
    typeof item.sizes !== "object"
  ) {
    return "";
  }

  return Object.entries(item.sizes)
    .filter(
      ([, value]) =>
        num(value, 0) > 0
    )
    .map(
      ([size, value]) =>
        `${size}: ${value}`
    )
    .join("   ");
}

function productDescription(item) {
  const name = String(
    item?.title ||
      item?.name ||
      item?.product_name ||
      item?.description ||
      ""
  ).trim();

  const sizes = sizeText(item);

  if (name && sizes) {
    return `${name}\n${sizes}`;
  }

  return name || sizes || "—";
}

function itemsTotal(items) {
  if (!Array.isArray(items)) return 0;

  return items.reduce(
    (sum, item) => {
      const qty = totalQty(item);
      const rate = num(
        item?.unit_price ??
          item?.rate ??
          item?.price ??
          0
      );

      return sum + qty * rate;
    },
    0
  );
}

function piecesTotal(items) {
  if (!Array.isArray(items)) return 0;

  return items.reduce(
    (sum, item) =>
      sum + totalQty(item),
    0
  );
}

/* =========================================================
   COLOUR
========================================================= */

function fill(doc, c) {
  doc.setFillColor(c[0], c[1], c[2]);
}

function textColor(doc, c) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function drawColor(doc, c) {
  doc.setDrawColor(c[0], c[1], c[2]);
}

/* =========================================================
   IMAGE
========================================================= */

function blobToDataURL(blob) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () =>
        resolve(reader.result);

      reader.onerror = reject;

      reader.readAsDataURL(blob);
    }
  );
}

function imageType(data) {
  if (
    String(data).startsWith(
      "data:image/png"
    )
  ) {
    return "PNG";
  }

  if (
    String(data).startsWith(
      "data:image/webp"
    )
  ) {
    return "WEBP";
  }

  return "JPEG";
}

/*
 * IMPORTANT:
 * Different products may store their image under
 * different property names.
 */
function getImageSource(item) {
  return (
    item?.image_url ||
    item?.imageUrl ||
    item?.image ||
    item?.product_image ||
    item?.productImage ||
    item?.photo_url ||
    item?.photo ||
    item?.thumbnail_url ||
    item?.thumbnail ||
    null
  );
}

async function fetchImageDirect(url) {
  try {
    const response =
      await fetch(url, {
        mode: "cors",
      });

    if (!response.ok) {
      return null;
    }

    const blob =
      await response.blob();

    if (
      !blob.type.startsWith(
        "image/"
      )
    ) {
      return null;
    }

    return await blobToDataURL(
      blob
    );
  } catch {
    return null;
  }
}

async function loadImage(src) {
  if (!src) return null;

  if (
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

  /*
   * Try original URL first.
   */
  let result =
    await fetchImageDirect(
      src
    );

  if (result) {
    return result;
  }

  /*
   * If backend proxy exists,
   * try proxy.
   */
  if (BACKEND_URL) {
    try {
      const proxyURL =
        `${BACKEND_URL}/api/images/proxy?url=${encodeURIComponent(src)}`;

      result =
        await fetchImageDirect(
          proxyURL
        );

      if (result) {
        return result;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/* =========================================================
   DOC
========================================================= */

function createDoc() {
  return new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [PAGE_W, PAGE_H],
    compress: true,
  });
}

/* =========================================================
   HEADER
========================================================= */

async function drawHeader(
  doc,
  branding,
  documentType,
  documentNumber
) {
  const top = MARGIN;

  /*
   * HEADER HEIGHT = 25mm
   */
  const headerH = 25;

  /*
   * LOGO
   */
  const logoSource =
    branding?.logo_url ||
    branding?.logo ||
    null;

  const logo =
    await loadImage(
      logoSource
    );

  if (logo) {
    try {
      fill(doc, LIGHT);
      drawColor(doc, BORDER);

      doc.roundedRect(
        MARGIN,
        top,
        22,
        22,
        2,
        2,
        "FD"
      );

      doc.addImage(
        logo,
        imageType(logo),
        MARGIN + 1.5,
        top + 1.5,
        19,
        19
      );
    } catch {
      // no logo
    }
  }

  /*
   * COMPANY TEXT
   */
  const companyX =
    logo
      ? MARGIN + 27
      : MARGIN;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(16);

  textColor(doc, NAVY);

  doc.text(
    branding?.company_name ||
      "SC Aura Kurtis",
    companyX,
    top + 7
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7.5);

  textColor(doc, MUTED);

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

  doc.text(
    String(address),
    companyX,
    top + 12
  );

  doc.text(
    `${phone}${gst ? `   ·   GST: ${gst}` : ""}`,
    companyX,
    top + 17
  );

  /*
   * DOCUMENT CARD
   */
  const cardW = 40;
  const cardH = 22;

  const cardX =
    PAGE_W -
    MARGIN -
    cardW;

  fill(doc, NAVY);

  doc.roundedRect(
    cardX,
    top,
    cardW,
    cardH,
    3,
    3,
    "F"
  );

  fill(doc, GOLD);

  doc.roundedRect(
    cardX,
    top,
    2.2,
    cardH,
    1,
    1,
    "F"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7);

  textColor(
    doc,
    [220, 225, 235]
  );

  doc.text(
    documentType,
    cardX + cardW / 2,
    top + 8,
    {
      align: "center",
    }
  );

  doc.setFontSize(12);

  textColor(doc, WHITE);

  doc.text(
    String(
      documentNumber || ""
    ),
    cardX + cardW / 2,
    top + 16,
    {
      align: "center",
    }
  );

  /*
   * DIVIDER
   */
  drawColor(doc, BORDER);

  doc.line(
    MARGIN,
    top + headerH,
    PAGE_W - MARGIN,
    top + headerH
  );

  return (
    top +
    headerH +
    4
  );
}

/* =========================================================
   INFO STRIP
========================================================= */

function drawInfo(
  doc,
  customer,
  details,
  y
) {
  const gap = 4;

  const leftW = 92;

  const rightW =
    CONTENT_W -
    leftW -
    gap;

  const h = 22;

  /*
   * CUSTOMER
   */
  fill(doc, LIGHT);
  drawColor(doc, BORDER);

  doc.roundedRect(
    MARGIN,
    y,
    leftW,
    h,
    2.5,
    2.5,
    "FD"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(6.5);

  textColor(doc, MUTED);

  doc.text(
    "CUSTOMER",
    MARGIN + 4,
    y + 5
  );

  doc.setFontSize(10);

  textColor(doc, NAVY);

  doc.text(
    String(
      customer?.name ||
        customer?.customer_name ||
        "Walk-in Customer"
    ),
    MARGIN + 4,
    y + 12
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7);

  textColor(doc, MUTED);

  const phone =
    customer?.phone ||
    customer?.mobile ||
    "";

  const shop =
    customer?.shop_name ||
    customer?.shop ||
    "";

  if (phone) {
    doc.text(
      `Phone: ${phone}`,
      MARGIN + 4,
      y + 18
    );
  }

  if (shop) {
    doc.text(
      `Shop: ${shop}`,
      MARGIN + 48,
      y + 18
    );
  }

  /*
   * DETAILS
   */
  const rightX =
    MARGIN +
    leftW +
    gap;

  fill(doc, LIGHT);
  drawColor(doc, BORDER);

  doc.roundedRect(
    rightX,
    y,
    rightW,
    h,
    2.5,
    2.5,
    "FD"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(6.5);

  textColor(doc, MUTED);

  doc.text(
    "DOCUMENT DETAILS",
    rightX + 4,
    y + 5
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7);

  textColor(doc, MUTED);

  doc.text(
    "Date",
    rightX + 4,
    y + 12
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  textColor(doc, TEXT);

  doc.text(
    String(
      details?.date || "—"
    ),
    rightX + 20,
    y + 12
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  textColor(doc, MUTED);

  doc.text(
    "Status",
    rightX + 4,
    y + 18
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  textColor(doc, NAVY);

  doc.text(
    String(
      details?.status || "—"
    ),
    rightX + 20,
    y + 18
  );

  return y + h + 4;
}

/* =========================================================
   PRODUCT TABLE
========================================================= */

async function drawProducts(
  doc,
  items,
  y
) {
  const products =
    Array.isArray(items)
      ? items
      : [];

  /*
   * Load images BEFORE creating table.
   */
  const rows = [];

  for (
    const item of products
  ) {
    const source =
      getImageSource(item);

    const image =
      await loadImage(
        source
      );

    const fullCode =
      String(
        item?.sku ||
          item?.code ||
          item?.product_code ||
          item?.sca_code ||
          ""
      ).trim();

    /*
     * ONLY SHOW LAST NUMBER
     *
     * SCA-00017 -> 0017
     * SCA-0017 -> 0017
     * 0017     -> 0017
     */
    let shortCode =
      fullCode;

    const match =
      fullCode.match(
        /(\d+)$/
      );

    if (match) {
      shortCode =
        match[1];
    }

    rows.push({
      item,
      image,
      code:
        shortCode || "—",
      description:
        productDescription(
          item
        ),
      qty:
        totalQty(item),
      rate:
        num(
          item?.unit_price ??
            item?.rate ??
            item?.price ??
            0
        ),
    });
  }

  const body =
    rows.map(
      (row, index) => [
        String(index + 1),
        row.code,
        "",
        row.description,
        String(row.qty),
        money(row.rate),
        money(
          row.qty *
            row.rate
        ),
      ]
    );

  /*
   * ========================================================
   * TABLE
   *
   *  #       7
   *  CODE   19
   *  IMAGE  35
   *  DESC   67
   *  QTY    11
   *  RATE   23
   *  AMOUNT 28
   *
   * TOTAL = 190
   * ========================================================
   */

  autoTable(doc, {
    startY: y,

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
      top: 5,
      bottom: 5,
    },

    /*
     * CRITICAL:
     * Keep product row tall enough for image.
     */
    styles: {
      font:
        "helvetica",

      fontSize: 7.5,

      cellPadding: 2,

      minCellHeight: 34,

      valign: "middle",

      overflow:
        "linebreak",

      lineColor:
        BORDER,

      lineWidth:
        0.18,

      textColor:
        TEXT,
    },

    headStyles: {
      fillColor:
        NAVY,

      textColor:
        WHITE,

      fontStyle:
        "bold",

      fontSize: 7,

      cellPadding: 2,

      valign:
        "middle",
    },

    columnStyles: {
      0: {
        cellWidth: 7,
        halign: "center",
      },

      1: {
        cellWidth: 19,
        fontStyle: "bold",
        halign: "left",
      },

      2: {
        cellWidth: 35,
        halign: "center",
      },

      3: {
        cellWidth: 67,
        fontSize: 8,
        overflow:
          "linebreak",
      },

      4: {
        cellWidth: 11,
        halign: "center",
      },

      5: {
        cellWidth: 23,
        halign: "right",
      },

      6: {
        cellWidth: 28,
        halign: "right",
        fontStyle: "bold",
      },
    },

    didParseCell(data) {
      if (
        data.section ===
          "body" &&
        data.column.index === 2
      ) {
        /*
         * Do NOT allow image cell
         * to collapse.
         */
        data.cell.styles.minCellHeight =
          34;
      }

      if (
        data.section ===
          "body" &&
        data.column.index === 3
      ) {
        data.cell.styles.minCellHeight =
          34;
      }
    },

    didDrawCell(data) {
      if (
        data.section !==
        "body"
      ) {
        return;
      }

      const row =
        rows[data.row.index];

      if (!row) return;

      /*
       * =====================================================
       * IMAGE
       * =====================================================
       */

      if (
        data.column.index === 2
      ) {
        const cell =
          data.cell;

        /*
         * Image background
         */
        fill(doc, LIGHT);
        drawColor(
          doc,
          BORDER
        );

        const boxW = 29;
        const boxH = 28;

        const boxX =
          cell.x +
          (cell.width -
            boxW) /
            2;

        const boxY =
          cell.y +
          (cell.height -
            boxH) /
            2;

        doc.roundedRect(
          boxX,
          boxY,
          boxW,
          boxH,
          1.5,
          1.5,
          "FD"
        );

        /*
         * ACTUAL IMAGE
         */
        if (row.image) {
          try {
            /*
             * 25 x 25 mm actual product image.
             */
            const imageSize =
              25;

            const imageX =
              cell.x +
              (cell.width -
                imageSize) /
                2;

            const imageY =
              cell.y +
              (cell.height -
                imageSize) /
                2;

            doc.addImage(
              row.image,
              imageType(
                row.image
              ),
              imageX,
              imageY,
              imageSize,
              imageSize,
              undefined,
              "FAST"
            );
          } catch (
            error
          ) {
            console.warn(
              "Product image could not be drawn",
              error
            );
          }
        } else {
          /*
           * Don't show broken-image icon.
           * Show clean placeholder instead.
           */
          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.setFontSize(
            6.5
          );

          textColor(
            doc,
            MUTED
          );

          doc.text(
            "IMAGE",
            cell.x +
              cell.width /
                2,
            cell.y +
              cell.height /
                2 +
              2,
            {
              align:
                "center",
            }
          );
        }

        return;
      }

      /*
       * =====================================================
       * DESCRIPTION
       * =====================================================
       */

      if (
        data.column.index === 3
      ) {
        /*
         * We use AutoTable's normal
         * text wrapping.
         *
         * Nothing is manually drawn
         * outside the cell.
         */
        return;
      }
    },
  });

  return (
    doc.lastAutoTable.finalY +
    4
  );
}

/* =========================================================
   TOTALS
========================================================= */

function drawTotals(
  doc,
  lines,
  y
) {
  const boxW = 68;

  const rowH = 5.5;

  const boxH =
    lines.length *
      rowH +
    7;

  /*
   * Keep totals on same page.
   */
  const x =
    PAGE_W -
    MARGIN -
    boxW;

  /*
   * Never create another page.
   */
  const safeY =
    Math.min(
      y,
      PAGE_H -
        boxH -
        11
    );

  fill(doc, LIGHT);
  drawColor(doc, BORDER);

  doc.roundedRect(
    x,
    safeY,
    boxW,
    boxH,
    3,
    3,
    "FD"
  );

  let currentY =
    safeY + 5;

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

      if (
        bold &&
        index > 0
      ) {
        drawColor(
          doc,
          BORDER
        );

        doc.line(
          x + 4,
          currentY - 3.5,
          x +
            boxW -
            4,
          currentY - 3.5
        );
      }

      doc.setFont(
        "helvetica",
        bold
          ? "bold"
          : "normal"
      );

      doc.setFontSize(
        bold ? 8 : 7.2
      );

      textColor(
        doc,
        bold
          ? NAVY
          : MUTED
      );

      doc.text(
        label,
        x + 4,
        currentY
      );

      doc.setFont(
        "helvetica",
        bold
          ? "bold"
          : "normal"
      );

      textColor(
        doc,
        TEXT
      );

      doc.text(
        value,
        x +
          boxW -
          4,
        currentY,
        {
          align:
            "right",
        }
      );

      currentY +=
        rowH;
    }
  );
}

/* =========================================================
   FOOTER
========================================================= */

function drawFooter(
  doc,
  branding
) {
  const y =
    PAGE_H - 5;

  drawColor(
    doc,
    BORDER
  );

  doc.line(
    MARGIN,
    y - 3,
    PAGE_W - MARGIN,
    y - 3
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7);

  textColor(
    doc,
    MUTED
  );

  doc.text(
    branding?.company_name ||
      "SC Aura Kurtis",
    PAGE_W / 2,
    y,
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
    createDoc();

  let y =
    await drawHeader(
      doc,
      branding,
      "BOOKING",
      booking?.booking_no
    );

  const customer =
    booking?.customer_snapshot ||
    booking?.customer ||
    {};

  y =
    drawInfo(
      doc,
      customer,
      {
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

  const items =
    booking?.items ||
    [];

  y =
    await drawProducts(
      doc,
      items,
      y
    );

  const itemTotal =
    num(
      booking?.item_total,
      itemsTotal(items)
    );

  const advance =
    num(
      booking?.advance_received,
      0
    );

  const remaining =
    num(
      booking?.remaining,
      Math.max(
        0,
        itemTotal -
          advance
      )
    );

  const pieces =
    piecesTotal(items);

  drawTotals(
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
    createDoc();

  let y =
    await drawHeader(
      doc,
      branding,
      "DISPATCH",
      dispatch?.dispatch_no
    );

  y =
    drawInfo(
      doc,
      {
        name:
          dispatch?.dispatch_to ||
          dispatch?.customer_name ||
          "—",

        phone:
          dispatch?.phone ||
          dispatch?.customer_phone ||
          "",

        shop_name:
          dispatch?.shop_name ||
          "",
      },
      {
        date:
          formatDate(
            dispatch?.created_at
          ),

        status:
          String(
            dispatch?.payment_status ||
              dispatch?.status ||
              "PENDING"
          ).toUpperCase(),
      },
      y
    );

  const items =
    dispatch?.items ||
    [];

  y =
    await drawProducts(
      doc,
      items,
      y
    );

  const itemTotal =
    num(
      dispatch?.item_total,
      itemsTotal(items)
    );

  const delivery =
    num(
      dispatch?.delivery_charges,
      0
    );

  const grandTotal =
    num(
      dispatch?.grand_total,
      itemTotal +
        delivery
    );

  const advance =
    num(
      dispatch?.advance_received,
      0
    );

  const finalPayable =
    num(
      dispatch?.final_payable,
      Math.max(
        0,
        grandTotal -
          advance
      )
    );

  drawTotals(
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
        String(
          piecesTotal(items)
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
   ESTIMATE
========================================================= */

export async function buildEstimatePDF(
  estimate,
  branding
) {
  const doc =
    createDoc();

  let y =
    await drawHeader(
      doc,
      branding,
      "ESTIMATE",
      estimate?.estimate_no
    );

  y =
    drawInfo(
      doc,
      {
        name:
          estimate?.customer_name ||
          "Walk-in Customer",

        phone:
          estimate?.customer_phone ||
          "",

        shop_name:
          estimate?.shop_name ||
          "",
      },
      {
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

  const items =
    estimate?.items ||
    [];

  y =
    await drawProducts(
      doc,
      items,
      y
    );

  const itemTotal =
    num(
      estimate?.item_total,
      itemsTotal(items)
    );

  const delivery =
    num(
      estimate?.delivery_charges,
      0
    );

  const grandTotal =
    num(
      estimate?.grand_total,
      itemTotal +
        delivery
    );

  const advance =
    num(
      estimate?.advance_received,
      0
    );

  const remaining =
    num(
      estimate?.remaining,
      Math.max(
        0,
        grandTotal -
          advance
      )
    );

  drawTotals(
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
    createDoc();

  let y =
    await drawHeader(
      doc,
      branding,
      "RETURN",
      returnData?.return_no
    );

  y =
    drawInfo(
      doc,
      {
        name:
          returnData?.vendor_name ||
          "—",

        phone:
          "",
      },
      {
        date:
          formatDate(
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
    await drawProducts(
      doc,
      items,
      y
    );

  const itemTotal =
    num(
      returnData?.item_total,
      itemsTotal(items)
    );

  drawTotals(
    doc,
    [
      [
        "Item Total",
        money(itemTotal),
        true,
      ],
      [
        "Pieces Returned",
        String(
          piecesTotal(items)
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

  const finalName =
    filename ||
    "SC-Aura-Receipt.pdf";

  const blob =
    doc.output("blob");

  const file =
    new File(
      [blob],
      finalName,
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
        title: finalName,
      });

      return true;
    } catch {
      // fallback
    }
  }

  doc.save(finalName);

  const cleanPhone =
    String(
      phone || ""
    ).replace(
      /[^\d]/g,
      ""
    );

  const message =
    encodeURIComponent(
      `${finalName} - SC Aura Kurtis`
    );

  const url =
    cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

  window.open(
    url,
    "_blank",
    "noopener"
  );

  return false;
}
