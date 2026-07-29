import { PRESETS } from "../components/SizeWidgets";

/**
 * initSizes – shared quantity initializer for Booking, Estimate, Dispatch
 * and Vendor Return forms.
 *
 *   • Every size in the product's preset starts with quantity = 1.
 *   • If we know stock (stock_by_size), we clamp to the available stock so
 *     Dispatch / Vendor Return never over-allocate. 0 stock → 0.
 *   • Unknown presets (e.g. "Free Size") fall back to the keys of
 *     stock_by_size, or a single "Free Size" bucket, so nothing is ever
 *     silently dropped.
 *
 *   const sizes = initSizes(product.size_preset, product.stock_by_size);
 *   // { M: 1, L: 1, XL: 1, XXL: 1 }
 */
export function initSizes(preset, stockBySize) {
  let sizes = PRESETS[preset];
  if (!sizes || sizes.length === 0) {
    if (stockBySize && Object.keys(stockBySize).length > 0) {
      sizes = Object.keys(stockBySize);
    } else {
      sizes = ["Free Size"];
    }
  }
  const out = {};
  for (const s of sizes) {
    if (stockBySize !== undefined) {
      const stock = Number(stockBySize?.[s] ?? 0);
      out[s] = stock > 0 ? 1 : 0;
    } else {
      out[s] = 1;
    }
  }
  return out;
}
