# SC Aura Kurtis — Wholesale ERP (Frontend)

Vite + React 19 · TailwindCSS · Axios · Recharts · jsPDF · html5-qrcode · sonner

The frontend runs against the **live production backend** at `https://erp.scaurakurtis.com`.

---

## Prerequisites

- Node 20+
- Yarn 1.x

## Setup

```bash
yarn install
```

## Environment

Create `.env` at the project root (already provided with the correct value):

```env
VITE_API_URL=https://erp.scaurakurtis.com
```

## Run in development

```bash
yarn start           # vite --host 0.0.0.0 --port 3000
# → http://localhost:3000
```

## Build for production (Vercel-ready)

```bash
yarn build
```

Output goes to `dist/`. Vercel picks up `vercel.json` automatically.

---

## What was polished in this release

- **Global theme refresh** — Neutral, professional wholesale palette (Dark Slate `#111827`, Slate `#374151`, Success `#16A34A`, Warning `#F59E0B`, Error `#DC2626`).
- **Gold removed** from all amounts, labels, buttons and text. Gold is now reserved for brand marks only.
- **Light theme fixed** — every notification, modal, dropdown, popup, badge and amount is fully readable in light mode.
- **Bookings list** simplified to `Booking No · Customer · View` — the rest lives in Booking Detail.
- **Products** — cleaner overlay badges (small chips, not covering the image), Filter and Print buttons on the toolbar.
- **QR labels** encode ONLY the SCA product ID (e.g. `SCA-00014`). Client-side generation is available as a fallback.
- **FAB (+)** — icon + action label combo, works perfectly in both themes.
- **QR Scanner** — always centred modal, body scroll locked, camera failure falls back to manual entry.
- **Modals** — `Add Customer`, product pickers on Booking/Dispatch/Estimate/Return, confirm dispatch — all use body-scroll-lock, centred layout, no more zoom or jump.
- **Dispatch** and **Estimate** forms fixed for layout stability (no jump on Add Product).
- **Vendor Return** never renders blank now (safe defaults, error fallback).
- **PDF receipts** — full A5 professional layout: brand header, table, right-aligned totals block, QR footer, signature line.
- **Performance** — In-memory `dataCache` for /products and /customers (30s TTL), debounced search across all listing screens, single-flight fetches to prevent duplicate requests, notification polling reduced to 60s and paused when tab hidden.
- **PWA / TWA readiness** — `manifest.webmanifest`, PNG icons (192, 512, maskable, apple-touch), theme colors, viewport, standalone display, `/offline.html`, minimal service worker registered only in production.

## Deliverable structure

```
sc-aura-frontend/
├── index.html
├── vite.config.js
├── vercel.json
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── .env
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── offline.html
│   ├── favicon.svg
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       ├── icon-maskable-512.png
│       └── apple-touch-icon.png
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    ├── index.css                 ← new theme (dark + light + light-theme overrides)
    ├── hooks/
    │   ├── useBodyLock.js        ← NEW
    │   └── useDebounced.js       ← NEW
    ├── lib/
    │   ├── api.js
    │   ├── dataCache.js          ← NEW
    │   ├── qrGen.js              ← NEW (client-side SCA QR)
    │   ├── pdf.js                ← REDESIGNED (A5 professional layout)
    │   ├── share.js
    │   └── utils.js
    ├── contexts/                 (unchanged)
    ├── components/               (redesigned – neutral palette, body-lock)
    ├── constants/testIds/        (unchanged)
    └── pages/                    (all listing + form screens polished)
```

## Backend

Backend is **NOT** included in this ZIP (it lives on the VPS at `erp.scaurakurtis.com`).
No backend API contracts, database collections or business logic were touched.
