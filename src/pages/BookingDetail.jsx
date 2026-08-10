import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useBranding } from "../contexts/BrandingContext";
import {
  GlassCard,
  Pill,
  SectionTitle,
} from "../components/Primitives";
import {
  ArrowLeft,
  Truck,
  Share2,
  MessageCircle,
  Pencil,
  Download,
  Loader2,
} from "lucide-react";
import StatusTracker, {
  StatusBadge,
} from "../components/StatusTracker";
import {
  shareWhatsApp,
  formatRupee,
} from "../lib/share";
import {
  buildBookingPDF,
  downloadPDF,
  sharePDF,
} from "../lib/pdf";

export default function BookingDetail() {
  const { id } = useParams();
  const { branding } = useBranding();

  const [b, setB] = useState(null);
  const [busy, setBusy] = useState(false);

  const navigate = useNavigate();

  const load = () =>
    api
      .get(`/bookings/${id}`)
      .then((r) => setB(r.data));

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [id]);

  if (!b) {
    return (
      <div className="w-full min-w-0">
        <div className="h-64 rounded-2xl shimmer" />
      </div>
    );
  }

  const totalPieces = b.items.reduce(
    (s, it) =>
      s +
      Object.values(it.sizes).reduce(
        (a, q) => a + q,
        0
      ),
    0
  );

  const phone =
    b.customer_snapshot?.phone || "";

  const remaining =
    Number(b.remaining || 0);

  const fullyPaid =
    remaining <= 0 &&
    Number(b.item_total || 0) > 0;

  const cancel = async () => {
    if (
      !window.confirm(
        "Cancel this booking?"
      )
    ) {
      return;
    }

    await api.delete(`/bookings/${id}`);
    load();
  };

  const downloadReceipt = async () => {
    setBusy(true);

    try {
      const doc = await buildBookingPDF(
        b,
        branding
      );

      await downloadPDF(
        doc,
        `${b.booking_no}.pdf`
      );
    } finally {
      setBusy(false);
    }
  };

  const sharePdfFile = async () => {
    setBusy(true);

    try {
      const doc = await buildBookingPDF(
        b,
        branding
      );

      await sharePDF(
        doc,
        `${b.booking_no}.pdf`,
        phone
      );
    } finally {
      setBusy(false);
    }
  };

  const whatsappShort = () => {
    const text = `*${
      branding?.company_name ||
      "SC Aura Kurtis"
    }* — Booking ${
      b.booking_no
    }\nTotal: ${formatRupee(
      b.item_total
    )}\nAdvance: ${formatRupee(
      b.advance_received
    )}\nRemaining: ${formatRupee(
      b.remaining
    )}\nPieces: ${totalPieces}`;

    shareWhatsApp({
      phone,
      text,
    });
  };

  const goToDispatch = () =>
    navigate("/dispatch/new", {
      state: {
        booking: b,
      },
    });

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto space-y-5 overflow-x-hidden">

      {/* BACK */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" />
        Back
      </button>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 min-w-0">

        {/* LEFT CONTENT */}
        <div className="lg:col-span-3 space-y-4 min-w-0">

          {/* BOOKING HEADER */}
          <GlassCard className="min-w-0 overflow-hidden">

            <div className="flex items-start justify-between gap-3 flex-wrap min-w-0">

              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281] truncate">
                  {b.booking_no}
                </div>

                <h1 className="font-display text-3xl tracking-tight mt-1">
                  Booking
                </h1>

                <div className="text-xs text-white/50 mt-1 break-words">
                  {new Date(
                    b.created_at
                  ).toLocaleString()}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <StatusBadge
                  status={b.status}
                />

                {b.dispatched && (
                  <Pill tone="success">
                    Dispatched
                  </Pill>
                )}
              </div>
            </div>

            {b.status !== "cancelled" && (
              <div className="mt-5 min-w-0 overflow-hidden">
                <StatusTracker
                  status={b.status}
                  dispatched={b.dispatched}
                />
              </div>
            )}

            {/* CUSTOMER */}
            <div className="mt-5 p-4 rounded-2xl bg-white/[0.04] border border-white/10 min-w-0 overflow-hidden">

              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">
                Customer
              </div>

              <div className="flex items-start justify-between gap-3 flex-wrap min-w-0">

                <div className="min-w-0 flex-1">

                  <div className="font-display text-lg break-words">
                    {b.customer_snapshot?.name}
                  </div>

                  <div className="text-xs text-white/60 truncate">
                    {b.customer_snapshot?.shop_name}
                  </div>

                  <div className="text-xs text-white/60">
                    {b.customer_snapshot?.phone}
                  </div>

                  {b.customer_snapshot?.address && (
                    <div className="text-xs text-white/50 break-words mt-1">
                      {b.customer_snapshot.address}
                    </div>
                  )}

                </div>

                {phone && (
                  <button
                    type="button"
                    onClick={() =>
                      shareWhatsApp({
                        phone,
                        text: `Hi ${b.customer_snapshot?.name}, regarding your booking ${b.booking_no}.`,
                      })
                    }
                    className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 px-3 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.18em] hover:bg-emerald-500/25 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    WhatsApp
                  </button>
                )}

              </div>
            </div>

          </GlassCard>

          {/* ITEMS */}
          <GlassCard className="min-w-0 overflow-hidden">

            <SectionTitle
              overline="Order"
              title="Items"
            />

            <div className="space-y-3 min-w-0">

              {b.items.map((it, i) => {
                const q =
                  Object.values(
                    it.sizes
                  ).reduce(
                    (a, n) => a + n,
                    0
                  );

                return (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10 min-w-0 overflow-hidden"
                  >

                    <div className="flex items-start gap-3 flex-1 min-w-0">

                      <div className="w-14 h-14 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">
                        {it.image && (
                          <img
                            src={it.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="text-[10px] uppercase tracking-[0.2em] text-[#ebd281] truncate">
                          {it.sr_number}
                        </div>

                        <div className="text-sm truncate">
                          {it.title}
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(
                            it.sizes
                          ).map(
                            ([s, n]) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] whitespace-nowrap"
                              >
                                <b className="text-[#ebd281]">
                                  {s}
                                </b>
                                ·{n}
                              </span>
                            )
                          )}
                        </div>

                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs text-white/50 whitespace-nowrap">
                        {q} pcs · ₹
                        {it.unit_price}
                      </div>

                      <div className="font-display tabular-nums whitespace-nowrap">
                        {formatRupee(
                          q *
                            it.unit_price
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

            </div>

            {/* TOTAL */}
            <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10 min-w-0">

              <div className="text-sm text-white/60">
                Total pieces ·{" "}
                {totalPieces}
              </div>

              <div className="font-display text-2xl tabular-nums shrink-0">
                {formatRupee(
                  b.item_total
                )}
              </div>

            </div>

            {b.notes && (
              <div className="text-xs text-white/50 mt-3 break-words">
                Notes: {b.notes}
              </div>
            )}

          </GlassCard>

          {/* LINKED DISPATCHES */}
          {b.dispatches?.length > 0 && (
            <GlassCard className="min-w-0 overflow-hidden">

              <SectionTitle
                overline="Linked"
                title="Dispatches"
              />

              <div className="min-w-0">

                {b.dispatches.map(
                  (d) => (
                    <Link
                      key={d.id}
                      to={`/dispatch`}
                      className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/[0.04] px-2 -mx-2 rounded-lg min-w-0"
                    >

                      <div className="min-w-0">
                        <div className="font-display truncate">
                          {d.dispatch_no}
                        </div>

                        <div className="text-xs text-white/50 truncate">
                          {new Date(
                            d.created_at
                          ).toLocaleString()}
                        </div>
                      </div>

                      <Pill
                        tone={
                          d.status ===
                          "delivered"
                            ? "success"
                            : "gold"
                        }
                      >
                        {d.status}
                      </Pill>

                    </Link>
                  )
                )}

              </div>

            </GlassCard>
          )}

          {/* ACTIVITY */}
          {b.activity_log?.length > 0 && (
            <GlassCard className="min-w-0 overflow-hidden">

              <SectionTitle
                overline="Audit"
                title="Activity timeline"
              />

              <div className="relative pl-6 space-y-3 max-h-96 overflow-y-auto">

                <div className="absolute left-2 top-2 bottom-2 w-px bg-white/10" />

                {b.activity_log.map(
                  (ev, i) => (
                    <div
                      key={i}
                      className="relative min-w-0"
                    >

                      <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-[#d4af37]" />

                      <div className="text-sm break-words">
                        {ev.action}
                      </div>

                      {ev.note && (
                        <div className="text-xs text-white/50 break-words">
                          {ev.note}
                        </div>
                      )}

                      <div className="text-[10px] text-white/40 break-words">
                        {new Date(
                          ev.ts
                        ).toLocaleString()}{" "}
                        · {ev.actor} (
                        {ev.actor_role})
                      </div>

                    </div>
                  )
                )}

              </div>

            </GlassCard>
          )}

        </div>

        {/* RIGHT SIDEBAR */}
        <div className="lg:col-span-2 space-y-4 min-w-0">

          {/* PAYMENT */}
          <GlassCard className="min-w-0 overflow-hidden">

            <SectionTitle
              overline="Payment"
              title="Summary"
            />

            <div className="space-y-2 text-sm">

              <div className="flex justify-between gap-3">
                <span className="text-white/60">
                  Item Total
                </span>

                <span className="font-display tabular-nums shrink-0">
                  {formatRupee(
                    b.item_total
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-white/60">
                  Advance Received
                </span>

                <span className="shrink-0">
                  {formatRupee(
                    b.advance_received
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-3 pt-2 border-t border-white/10">

                <span className="text-white/60">
                  Remaining
                </span>

                <span
                  className={
                    remaining > 0
                      ? "text-amber-200 font-display shrink-0"
                      : "text-emerald-300 font-display shrink-0"
                  }
                >
                  {formatRupee(
                    b.remaining
                  )}
                </span>

              </div>

              {fullyPaid && (
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/90 pt-2">
                  Full payment received
                </div>
              )}

            </div>

          </GlassCard>

          {/* WORKFLOW */}
          <GlassCard className="min-w-0 overflow-hidden">

            <SectionTitle
              overline="Actions"
              title="Workflow"
            />

            <div className="grid gap-2 min-w-0">

              {!b.dispatched &&
                b.status !==
                  "cancelled" && (
                  <button
                    type="button"
                    onClick={
                      goToDispatch
                    }
                    data-testid="booking-dispatch-link"
                    className="w-full btn-primary rounded-full px-4 sm:px-5 py-3 text-[10px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.22em] inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Truck className="w-4 h-4 shrink-0" />
                    Confirm & Dispatch
                  </button>
                )}

              {b.status !==
                "cancelled" && (
                <Link
                  to={`/bookings/${b.id}/edit`}
                  className="w-full rounded-full glass px-4 sm:px-5 py-3 text-[10px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.2em] hover:bg-white/10 inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Pencil className="w-4 h-4 text-[#ebd281] shrink-0" />
                  Edit / Add Products
                </Link>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={
                  downloadReceipt
                }
                data-testid="booking-pdf-download"
                className="w-full rounded-full glass px-4 sm:px-5 py-3 text-[10px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.2em] hover:bg-white/10 inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Download className="w-4 h-4 text-[#ebd281] shrink-0" />
                )}

                Download PDF
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={
                  sharePdfFile
                }
                data-testid="booking-pdf-share"
                className="w-full rounded-full glass px-4 sm:px-5 py-3 text-[10px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.2em] hover:bg-white/10 inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                <Share2 className="w-4 h-4 text-[#ebd281] shrink-0" />
                Share PDF
              </button>

              <button
                type="button"
                onClick={
                  whatsappShort
                }
                className="w-full rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 px-4 sm:px-5 py-3 text-[10px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.2em] hover:bg-emerald-500/25 inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                WhatsApp summary
              </button>

              {b.status !==
                "cancelled" && (
                <button
                  type="button"
                  onClick={cancel}
                  className="w-full rounded-full bg-red-500/10 border border-red-500/30 text-red-200 px-4 sm:px-5 py-3 text-[10px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.2em] hover:bg-red-500/20 whitespace-nowrap"
                >
                  Cancel Booking
                </button>
              )}

            </div>

          </GlassCard>

        </div>

      </div>
    </div>
  );
}
