/**
 * Professional wholesale ERP receipt (A5 portrait) with:
 *  – Company header (logo/name/GST/phone/address)
 *  – Meta block (receipt no / date / customer / payment mode)
 *  – Product table (Sr, SCA, Item + sizes, Qty, Rate, Amount) with images
 *  – Totals block (right-aligned)
 *  – QR footer (for cross-reference to public receipt URL)
 *  – Signature + Thank-you note
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { formatRupee } from "./share";

const PAGE_W = 148; // A5 mm
const PAGE_H = 210;
const MARGIN = 10;

const INK  = [17, 24, 39];     // #111827
const MUTE = [107, 114, 128];  // #6b7280
const LINE = [229, 231, 235];  // #e5e7eb

async function imgToDataUrl(src) {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function makeQr(text) {
  try { return await QRCode.toDataURL(text, { margin: 0, scale: 4, color: { dark: "#111827", light: "#ffffff" } }); }
  catch { return null; }
}

function setInk(doc, rgb, alpha) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  if (alpha !== undefined) doc.setGState(new doc.GState({ opacity: alpha }));
}

export function newReceiptDoc() {
  return new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
}

async function header(doc, branding, titleText, subTitle) {
  const y0 = MARGIN;
  const H  = 30;

  // Logo (left) if available
  let xText = MARGIN;
  if (branding?.logo_url) {
    const logo = await imgToDataUrl(branding.logo_url);
    if (logo) {
      try { doc.addImage(logo, "PNG", MARGIN, y0, 20, 20); } catch { /* ignore */ }
      xText = MARGIN + 24;
    }
  }

  // Brand name & meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(branding?.company_name || "SC AURA KURTIS", xText, y0 + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTE[0], MUTE[1], MUTE[2]);

  const linesRaw = [];
  if (branding?.address) linesRaw.push(branding.address);
  const line2Bits = [branding?.phone, branding?.gst ? `GST: ${branding.gst}` : null].filter(Boolean);
  if (line2Bits.length) linesRaw.push(line2Bits.join("  ·  "));
  let ry = y0 + 10.5;
  for (const ln of linesRaw) {
    const wrapped = doc.splitTextToSize(ln, PAGE_W - xText - MARGIN - 40);
    doc.text(wrapped, xText, ry);
    ry += wrapped.length * 3.6;
  }

  // Receipt title block (right)
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(PAGE_W - MARGIN - 44, y0, 44, 20, 2.5, 2.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(titleText, PAGE_W - MARGIN - 22, y0 + 7, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(subTitle || "", PAGE_W - MARGIN - 22, y0 + 14, { align: "center" });

  // Divider line
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(MARGIN, y0 + H + 1, PAGE_W - MARGIN, y0 + H + 1);
  return y0 + H + 5;
}

function metaBlock(doc, entries, y) {
  const colW = (PAGE_W - MARGIN * 2) / 2;
  doc.setFontSize(9);
  const rows = Math.ceil(entries.length / 2);
  for (let i = 0; i < entries.length; i++) {
    const [label, value] = entries[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * colW;
    doc.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
    doc.setFont("helvetica", "normal");
    doc.text(`${label}`, x, y + row * 6.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK[0], INK[1], INK[2]);
    const wrapped = doc.splitTextToSize(String(value || "—"), colW - 4);
    doc.text(wrapped, x + 22, y + row * 6.2);
  }
  return y + rows * 6.2 + 3;
}

async function itemsTable(doc, items, startY, { showPrice = true, showImages = true } = {}) {
  const head = showPrice
    ? [["#", "SCA", "Item / Description", "Qty", "Rate", "Amount"]]
    : [["#", "SCA", "Item / Description", "Qty"]];

  const body = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];

    const totalQty = Object.values(it.sizes || {}).reduce(
      (a, b) => a + Number(b || 0),
      0
    );

    const sizeBlock = Object.entries(it.sizes || {})
      .map(([s, n]) => `${s}:${n}`)
      .join("  ");

    const image = showImages && it.image
      ? await imgToDataUrl(it.image)
      : null;

    body.push({
      row: showPrice
        ? [
            String(i + 1),
            it.sr_number || "",
            `${it.title || ""}${sizeBlock ? `\n${sizeBlock}` : ""}`,
            String(totalQty),
            (Number(it.unit_price) || 0).toFixed(0),
            (totalQty * (Number(it.unit_price) || 0)).toFixed(0),
          ]
        : [
            String(i + 1),
            it.sr_number || "",
            `${it.title || ""}${sizeBlock ? `\n${sizeBlock}` : ""}`,
            String(totalQty),
          ],
      image,
    });
  }

  autoTable(doc, {
    startY,
    head,
    body: body.map((b) => b.row),
    theme: "grid",

    styles: {
      fontSize: 8.2,
      cellPadding: 2.2,
      lineColor: LINE,
      lineWidth: 0.15,
      textColor: INK,
      valign: "middle",
    },

    headStyles: {
      fillColor: [17, 24, 39],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },

    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },

    columnStyles: showPrice
      ? {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 21, fontStyle: "bold" },
          2: { cellWidth: "auto" },
          3: { cellWidth: 11, halign: "right" },
          4: { cellWidth: 16, halign: "right" },
          5: { cellWidth: 20, halign: "right", fontStyle: "bold" },
        }
      : {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 22, fontStyle: "bold" },
          2: { cellWidth: "auto" },
          3: { cellWidth: 14, halign: "right" },
        },

    margin: {
      left: MARGIN,
      right: MARGIN,
    },

      didParseCell: (data) => {
  if (
    data.section === "body" &&
    data.column.index === 2
  ) {
    const itemData = body[data.row.index];

    if (itemData?.image) {
      data.cell.minCellHeight = Math.max(
        data.cell.minCellHeight || 0,
        24
      );

      // Leave space for the thumbnail inside Item / Description.
      data.cell.text = data.cell.text.map(
        (line) => `          ${line}`
      );
    }
  }
},

didDrawCell: (data) => {
  if (
    data.section !== "body" ||
    data.column.index !== 2
  ) {
    return;
  }

  const itemData = body[data.row.index];

  if (!itemData?.image) {
    return;
  }

  try {
    const cell = data.cell;
    const imgSize = 18;

    const imgX = cell.x + 2;
    const imgY = cell.y + (cell.height - imgSize) / 2;

    doc.addImage(
      itemData.image,
      "JPEG",
      imgX,
      imgY,
      imgSize,
      imgSize
    );
  } catch {
    try {
      const cell = data.cell;
      const imgSize = 18;

      const imgX = cell.x + 2;
      const imgY = cell.y + (cell.height - imgSize) / 2;

      doc.addImage(
        itemData.image,
        "PNG",
        imgX,
        imgY,
        imgSize,
        imgSize
      );
    } catch {
      // Ignore invalid image
    }
  }
},

  return doc.lastAutoTable.finalY + 5;
}

function totalsBlock(doc, lines, y) {
  const boxW = 70;
  const rowH = 6.5;
  const boxX = PAGE_W - MARGIN - boxW;
  const boxH = lines.length * rowH + 8;

  // Box
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.setFillColor(248, 250, 252);

  doc.roundedRect(
    boxX,
    y,
    boxW,
    boxH,
    2.5,
    2.5,
    "FD"
  );

  let cy = y + 5.5;

  for (let i = 0; i < lines.length; i++) {
    const [label, value, bold] = lines[i];

    doc.setFont(
      "helvetica",
      bold ? "bold" : "normal"
    );

    doc.setFontSize(bold ? 9 : 8.5);

    doc.setTextColor(
      bold ? INK[0] : MUTE[0],
      bold ? INK[1] : MUTE[1],
      bold ? INK[2] : MUTE[2]
    );

    doc.text(
      String(label),
      boxX + 3,
      cy
    );

    doc.setTextColor(
      INK[0],
      INK[1],
      INK[2]
    );

    doc.text(
      String(value),
      boxX + boxW - 3,
      cy,
      { align: "right" }
    );

    // Divider before important final amount
    if (bold && i > 0) {
      doc.setDrawColor(
        LINE[0],
        LINE[1],
        LINE[2]
      );

      doc.line(
        boxX + 3,
        cy - 4.2,
        boxX + boxW - 3,
        cy - 4.2
      );
    }

    cy += rowH;
  }

  return y + boxH + 5;
}

async function footer(doc, branding, y) {
  const footerY = PAGE_H - 13;

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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  doc.setTextColor(
    INK[0],
    INK[1],
    INK[2]
  );

  doc.text(
    branding?.company_name || "SC AURA KURTIS",
    PAGE_W / 2,
    footerY,
    { align: "center" }
  );
}

/* ================= Public builders ================= */

export async function buildBookingPDF(b, branding) {
  const doc = newReceiptDoc();
  let y = await header(doc, branding, "BOOKING", b.booking_no);
  y = metaBlock(doc, [
    ["Date", new Date(b.created_at).toLocaleString()],
    ["Booking No", b.booking_no],
    ["Customer", b.customer_snapshot?.name || "—"],
    ["Shop", b.customer_snapshot?.shop_name || "—"],
    ["Phone", b.customer_snapshot?.phone || "—"],
    ["Status", (b.status || "").toUpperCase()],
  ], y);
  y = await itemsTable(doc, b.items || [], y, { showPrice: true, showImages: true });
  const totalPcs = (b.items || []).reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, n) => a + n, 0), 0);
  y = totalsBlock(doc, [
    ["Item Total",       formatRupee(b.item_total),       false],
    ["Advance Received", formatRupee(b.advance_received), false],
    ["Remaining",        formatRupee(b.remaining),        true],
    ["Total Pieces",     String(totalPcs),                false],
  ], y);
  await footer(doc, branding, y);
  return doc;
}

export async function buildDispatchPDF(d, branding) {
  const doc = newReceiptDoc();
  let y = await header(doc, branding, "DISPATCH", d.dispatch_no);
  y = metaBlock(doc, [
    ["Date", new Date(d.created_at).toLocaleString()],
    ["Dispatch No", d.dispatch_no],
    ["Dispatch To", d.dispatch_to || "—"],
    ["Phone", d.phone || "—"],
    ["Payment Mode", (d.payment_mode || "cash").toUpperCase()],
    ["Payment Status", (Number(d.final_payable) || 0) <= 0 ? "PAID" : "PENDING"],
  ], y);
  y = await itemsTable(doc, d.items || [], y, { showPrice: true, showImages: true });
  const totalPcs = (d.items || []).reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, n) => a + n, 0), 0);
  y = totalsBlock(doc, [
    ["Item Total",       formatRupee(d.item_total),       false],
    ["Delivery Charges", formatRupee(d.delivery_charges), false],
    ["Grand Total",      formatRupee(d.grand_total),      false],
    ["Advance Received", formatRupee(d.advance_received), false],
    ["Final Payable",    formatRupee(d.final_payable),    true],
    ["Total Pieces",     String(totalPcs),                false],
  ], y);
  await footer(doc, branding, y);
  return doc;
}

export async function buildEstimatePDF(est, branding) {
  const doc = newReceiptDoc();
  let y = await header(doc, branding, "ESTIMATE", est.estimate_no);
  y = metaBlock(doc, [
    ["Date", new Date(est.created_at).toLocaleString()],
    ["Estimate No", est.estimate_no],
    ["Customer", est.customer_name || "Walk-in"],
    ["Phone", est.customer_phone || "—"],
    ["Status", (est.status || "").toUpperCase()],
    ["Validity", "72 hours"],
  ], y);
  y = await itemsTable(doc, est.items || [], y, { showPrice: true, showImages: true });
  y = totalsBlock(doc, [
    ["Item Total",       formatRupee(est.item_total),       false],
    ["Delivery Charges", formatRupee(est.delivery_charges), false],
    ["Grand Total",      formatRupee(est.grand_total),      false],
    ["Advance Received", formatRupee(est.advance_received), false],
    ["Remaining",        formatRupee(est.remaining),        true],
  ], y);
  await footer(doc, branding, y);
  return doc;
}

export async function buildReturnPDF(r, branding) {
  const doc = newReceiptDoc();
  let y = await header(doc, branding, "RETURN", r.return_no);
  y = metaBlock(doc, [
    ["Date", new Date(r.created_at).toLocaleString()],
    ["Return No", r.return_no],
    ["Vendor", r.vendor_name || "—"],
    ["Reason", r.reason || "—"],
    ["Created By", r.created_by || "—"],
    ["Type", "Vendor Return"],
  ], y);
  y = await itemsTable(doc, r.items || [], y, { showPrice: true, showImages: false });
  const totalPcs = (r.items || []).reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, n) => a + n, 0), 0);
  y = totalsBlock(doc, [
    ["Item Total",     formatRupee(r.item_total), true],
    ["Pieces Returned", String(totalPcs),         false],
  ], y);
  await footer(doc, branding, y, null, "Vendor return · Stock adjusted accordingly.");
  return doc;
}

export async function downloadPDF(doc, filename) { doc.save(filename); }

export async function sharePDF(doc, filename, phone) {
  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return true; } catch {}
  }
  doc.save(filename);
  const clean = (p) => (p || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  const text = encodeURIComponent(`${filename} — Please find the receipt attached.`);
  const url = phone ? `https://wa.me/${clean(phone)}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank", "noopener");
  return false;
}
