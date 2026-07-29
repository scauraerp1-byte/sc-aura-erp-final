/**
 * WhatsApp sharing utility.
 * - On mobile, attempts navigator.share with files when supported.
 * - Falls back to wa.me URL with prefilled text + customer phone.
 */

const cleanPhone = (p) => (p || "").replace(/[^\d+]/g, "").replace(/^\+/, "");

export function whatsappUrl(phone, text) {
  const target = cleanPhone(phone);
  const base = target ? `https://wa.me/${target}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function shareWhatsApp({ phone, text }) {
  const url = whatsappUrl(phone, text);
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function sharePage({ title, text, url, phone }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      // user cancelled or share failed — fall through to wa.me
    }
  }
  const full = `${text}\n${url}`;
  shareWhatsApp({ phone, text: full });
  return false;
}

export function publicCatalogueUrl(sr_number) {
  return `${window.location.origin}/catalogue/${sr_number}`;
}

export function publicBookingUrl(id) {
  return `${window.location.origin}/r/booking/${id}`;
}

export function publicDispatchUrl(id) {
  return `${window.location.origin}/r/dispatch/${id}`;
}

export function formatRupee(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}
