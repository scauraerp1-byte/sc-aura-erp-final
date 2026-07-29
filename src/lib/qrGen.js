/**
 * Client-side QR generation utility.
 *
 * Contract (per project brief):
 *   - Every product QR encodes ONLY the unique SCA Product ID (e.g. "SCA-00014").
 *   - QR is generated on-demand from the product's sr_number – no shared codes.
 *   - Backend may still provide a `qr_data_url`; we prefer that if present,
 *     otherwise we render one client-side using the `qrcode` package.
 */
import QRCode from "qrcode";

const cache = new Map();

/**
 * Generate a data URL PNG QR containing exactly the SR / SCA product ID.
 */
export async function generateProductQr(srNumber, opts = {}) {
  if (!srNumber) return null;
  const key = String(srNumber).trim().toUpperCase();
  if (cache.has(key)) return cache.get(key);
  const dataUrl = await QRCode.toDataURL(key, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: opts.scale || 6,
    color: {
      dark: opts.dark || "#111827",
      light: opts.light || "#ffffff",
    },
  });
  cache.set(key, dataUrl);
  return dataUrl;
}

/**
 * Return either the backend-provided QR data URL, or generate one client-side.
 */
export async function resolveProductQr(product) {
  if (!product) return null;
  if (product.qr_data_url) return product.qr_data_url;
  return generateProductQr(product.sr_number);
}
