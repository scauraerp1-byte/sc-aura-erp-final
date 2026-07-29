# Changelog

## v1.3.1 — Final production pass (Feb 2026)

### Stabilization
- **Global modal system**: introduced `.modal-shell` + `.modal-viewport` utility classes. Every modal now has: perfectly centred layout, `max-height: min(85dvh, calc(100dvh - 80px))`, internal body scroll (`.modal-body`), safe-area padding, and ref-counted body scroll lock.
- **FAB + bottom-nav auto-hide** whenever any modal is open (CSS: `html.body-locked .fab-anchor, html.body-locked nav.sca-bottom-nav { display: none }`).
- **Escape-to-close** on every modal + drawer via new `useEscapeClose` hook (Customer Add, Booking / Dispatch / Estimate / Vendor Return product picker, QR Scanner, Notifications panel, Mobile drawer, Confirm-Dispatch).
- **useBodyLock rewritten** to use `overflow: hidden` on `<html>` + `<body>` (removed the `position: fixed; top: -scrollY` approach which caused visual jump when reopening after scroll).
- **Root cause fix**: removed `fade-up` class from `<main>` in Layout — its animation was creating a CSS containing block that off-centred every `position:fixed` modal by ~155px. Modals now anchor perfectly to the viewport.

### Performance
- **`dataCache` upgraded to SWR**: `cachedGet(key, url, { ttl, onFresh })` returns stale value instantly and revalidates in background — Products list and Dashboard now feel instant on re-visit (2363ms first visit → 53ms cached).
- **Request deduplication**: single-flight promises for concurrent identical GETs.
- **Debounced search** (220ms) on Products / Bookings / Dispatch / Estimates / Vendor Returns.
- **Notification polling**: 60s + tab-hidden pause.
- **Lazy product tile images**.

### Mobile responsiveness
- Verified no horizontal scroll at 360, 375, 390, 393, 412, 768.
- Mobile header now stacks brand + page-title cleanly (no clipped text).
- Bottom-nav respects iOS safe-area (`padding-bottom: env(safe-area-inset-bottom)`).
- Modals fit vertical viewport at all sizes tested.

## v1.2 — Second polish pass
- Removed residual gold on Dashboard tiles / Latest Dispatches / Low Stock / Dispatch quick-action.
- Login "Sign In" button switched from gold gradient to primary dark slate.
- Product Detail QR now generated purely client-side via `lib/qrGen.js` (no CORS noise from `/api/products/:id/qr`).

## v1.1 — First polish pass
- Global theme rebuild (neutral wholesale palette, gold reserved for brand mark only).
- Light theme repaired (notifications, dialogs, popups, inputs, badges, contrast).
- Bookings list simplified to `Booking No · Customer · View`.
- Products tile cleaner overlays (small chips, no huge overlays).
- Every product has unique SCA product ID; QR encodes ONLY the SCA ID.
- Add Customer / Product Picker / Confirm Dispatch modals with body-lock.
- Vendor Return safe null-defaults (never blank).
- Professional A5 PDF receipts (Booking / Dispatch / Estimate / Return).
- PWA readiness: manifest, icons, service worker (shell-only), offline.html.

## v1.0 — MVP (pre-existing)
- Bookings, Dispatch, Estimates, Vendor Returns, Analytics, History, Users, Settings.
- Products, Customers.
