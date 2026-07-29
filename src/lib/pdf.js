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
    ? [["#", "SCA", "Item", "Qty", "Rate", "Amount"]]
    : [["#", "SCA", "Item", "Qty"]];

  const body = items.map((it, i) => {
    const totalQty = Object.values(it.sizes || {}).reduce((a, b) => a + b, 0);
    const sizeBlock = Object.entries(it.sizes || {}).map(([s, n]) => `${s}:${n}`).join("  ");
    const item = `${it.title || ""}\n${sizeBlock ? sizeBlock : ""}`;
    if (showPrice) {
      const lineTotal = totalQty * (Number(it.unit_price) || 0);
      return [
        String(i + 1),
        it.sr_number || "",
        item,
        String(totalQty),
        (Number(it.unit_price) || 0).toFixed(0),
        lineTotal.toFixed(0),
      ];
    }
    return [String(i + 1), it.sr_number || "", item, String(totalQty)];
  });

  autoTable(doc, {
    startY,
    head,
    body,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      lineColor: LINE,
      lineWidth: 0.15,
      textColor: INK,
    },
    headStyles: {
      fillColor: [17, 24, 39],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: showPrice
      ? {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 22, fontStyle: "bold" },
          2: { cellWidth: "auto" },
          3: { cellWidth: 12, halign: "right" },
          4: { cellWidth: 16, halign: "right" },
          5: { cellWidth: 20, halign: "right", fontStyle: "bold" },
        }
      : {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 24, fontStyle: "bold" },
          2: { cellWidth: "auto" },
          3: { cellWidth: 14, halign: "right" },
        },
    margin: { left: MARGIN, right: MARGIN },
  });

  let y = doc.lastAutoTable.finalY + 3;

  // Optional image strip under table
  if (showImages) {
    const imgs = items.map((it) => it.image).filter(Boolean).slice(0, 8);
    if (imgs.length) {
      const W = 20, PAD = 2;
      let x = MARGIN;
      for (const src of imgs) {
        const data = await imgToDataUrl(src);
        if (!data) continue;
        if (x + W > PAGE_W - MARGIN) { x = MARGIN; y += W + PAD; }
        try { doc.addImage(data, "JPEG", x, y, W, W); }
        catch { try { doc.addImage(data, "PNG", x, y, W, W); } catch {} }
        x += W + PAD;
      }
      y += W + 3;
    }
  }
  return y;
}

function totalsBlock(doc, lines, y) {
  const rightW = 62;
  const labelX = PAGE_W - MARGIN - rightW;
  const valueX = PAGE_W - MARGIN;

  // Right-aligned box for totals
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(labelX - 2, y - 2, rightW + 4, lines.length * 6 + 4, 2.5, 2.5, "FD");

  doc.setFontSize(9);
  let cy = y + 3.5;
  for (const [label, value, bold] of lines) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(bold ? INK[0] : MUTE[0], bold ? INK[1] : MUTE[1], bold ? INK[2] : MUTE[2]);
    doc.text(label, labelX, cy);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(String(value), valueX, cy, { align: "right" });
    cy += 6;
  }
  return cy + 2;
}

async function footer(doc, branding, y, qrText, note) {
  const boxY = Math.max(y + 4, PAGE_H - 32);
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(MARGIN, boxY - 4, PAGE_W - MARGIN, boxY - 4);

  // QR (left)
  const qr = qrText ? await makeQr(qrText) : null;
  if (qr) {
    try { doc.addImage(qr, "PNG", MARGIN, boxY - 2, 18, 18); } catch {}
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
    doc.text("Scan to view digital receipt", MARGIN + 20, boxY + 3);
    doc.text(qrText.length > 44 ? qrText.slice(0, 44) + "…" : qrText, MARGIN + 20, boxY + 7);
  }

  // Signature (right)
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(PAGE_W - MARGIN - 46, boxY + 12, PAGE_W - MARGIN, boxY + 12);
  doc.setFontSize(8);
  doc.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
  doc.text("Authorised Signature", PAGE_W - MARGIN - 23, boxY + 16, { align: "center" });

  // Thank you note
  doc.setFontSize(7.5);
  doc.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
  doc.text(note || "Thank you for your business. Goods once sold cannot be returned without prior approval.", PAGE_W / 2, PAGE_H - 6, { align: "center", maxWidth: PAGE_W - MARGIN * 2 });
  if (branding?.whatsapp) {
    doc.text(`WhatsApp: ${branding.whatsapp}`, PAGE_W / 2, PAGE_H - 3, { align: "center" });
  }
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
  await footer(doc, branding, y, `${window.location.origin}/r/booking/${b.id}`, "Booking receipt · Please retain for your records.");
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
  await footer(doc, branding, y, `${window.location.origin}/r/dispatch/${d.id}`, "Dispatch receipt · Goods dispatched in good condition.");
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
  await footer(doc, branding, y, null, "Estimate · Valid for 72 hours from the time of issue.");
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
