import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useBranding } from "../contexts/BrandingContext";
import {
  GlassCard,
  Pill,
  SectionTitle,
} from "../components/Primitives";
import {
  ArrowLeft,
  Download,
  Share2,
  MessageCircle,
  Loader2,
  Truck,
  User,
  Phone,
  CalendarDays,
  CreditCard,
} from "lucide-react";
import {
  shareWhatsApp,
  formatRupee,
} from "../lib/share";
import {
  buildDispatchPDF,
  downloadPDF,
  sharePDF,
} from "../lib/pdf";

export default function DispatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { branding } = useBranding();

  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let mounted = true;

    setLoading(true);

    api
      .get(`/dispatches/${id}`)
      .then((r) => {
        if (mounted) {
          setD(r.data);
        }
      })
      .catch((error) => {
        console.error(
          "Dispatch detail failed:",
          error
        );

        if (mounted) {
          setD(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  /* =====================================================
     TOTAL PIECES
  ===================================================== */

  const totalPieces = (d?.items || []).reduce(
    (total, item) =>
      total +
      Object.values(
        item.sizes || {}
      ).reduce(
        (sum, qty) =>
          sum + Number(qty || 0),
        0
      ),
    0
  );

  /* =====================================================
     PDF DOWNLOAD
  ===================================================== */

  const downloadReceiptPdf = async () => {
    if (!d) return;

    setBusy("download");

    try {
      const doc =
        await buildDispatchPDF(
          d,
          branding
        );

      await downloadPDF(
        doc,
        `${d.dispatch_no}.pdf`
      );
    } catch (error) {
      console.error(
        "Dispatch PDF download failed:",
        error
      );
    } finally {
      setBusy("");
    }
  };

  /* =====================================================
     PDF SHARE
  ===================================================== */

  const shareReceiptPdf = async () => {
    if (!d) return;

    setBusy("share");

    try {
      const doc =
        await buildDispatchPDF(
          d,
          branding
        );

      await sharePDF(
        doc,
        `${d.dispatch_no}.pdf`,
        d.phone || ""
      );
    } catch (error) {
      console.error(
        "Dispatch PDF share failed:",
        error
      );
    } finally {
      setBusy("");
    }
  };

  /* =====================================================
     WHATSAPP SUMMARY
     NO PUBLIC URL
  ===================================================== */

  const shareSummary = () => {
    if (!d) return;

    const text = `*${
      branding?.company_name ||
      "SC Aura Kurtis"
    }* — Dispatch ${
      d.dispatch_no
    }

To: ${
      d.dispatch_to || "-"
    }

Phone: ${
      d.phone || "-"
    }

Pieces: ${totalPieces}

Grand Total: ${formatRupee(
      d.grand_total
    )}

Final Payable: ${formatRupee(
      d.final_payable
    )}

Payment Mode: ${(
      d.payment_mode ||
      "cash"
    ).toUpperCase()}`;

    shareWhatsApp({
      phone: d.phone || "",
      text,
    });
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-24 rounded-full shimmer" />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 h-96 rounded-2xl shimmer" />
          <div className="lg:col-span-2 h-96 rounded-2xl shimmer" />
        </div>
      </div>
    );
  }

  /* =====================================================
     NOT FOUND
  ===================================================== */

  if (!d) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <GlassCard className="text-center py-12">
          <div className="font-display text-xl">
            Dispatch not found
          </div>

          <div className="text-sm text-white/50 mt-2">
            This dispatch could not be loaded.
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/dispatch")
            }
            className="mt-5 rounded-full glass px-5 py-2.5 text-xs uppercase tracking-[0.18em]"
          >
            Back to Dispatch
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto space-y-5 overflow-x-hidden">

      {/* =================================================
          BACK
      ================================================= */}

      <button
        type="button"
        onClick={() =>
          navigate("/dispatch")
        }
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" />
        Back to Dispatch
      </button>

      {/* =================================================
          MAIN GRID
      ================================================= */}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 min-w-0">

        {/* =================================================
            LEFT
        ================================================= */}

        <div className="lg:col-span-3 space-y-4 min-w-0">

          {/* HEADER */}
          <GlassCard className="min-w-0 overflow-hidden">

            <div className="flex items-start justify-between gap-3 flex-wrap">

              <div className="min-w-0 flex-1">

                <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281] truncate">
                  {d.dispatch_no}
                </div>

                <h1 className="font-display text-3xl tracking-tight mt-1">
                  Dispatch
                </h1>

                <div className="text-xs text-white/50 mt-1">
                  {d.created_at
                    ? new Date(
                        d.created_at
                      ).toLocaleString()
                    : "-"}
                </div>

              </div>

              <Pill tone="primary">
                <Truck className="w-3 h-3" />
                Dispatched
              </Pill>

            </div>

          </GlassCard>

          {/* CUSTOMER */}
          <GlassCard className="min-w-0 overflow-hidden">

            <SectionTitle
              overline="Dispatch To"
              title="Customer Details"
            />

            <div className="space-y-3">

              <div className="flex items-start gap-3 min-w-0">

                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 grid place-items-center shrink-0">
                  <User className="w-4 h-4 text-[#ebd281]" />
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                    Customer / Shop
                  </div>

                  <div className="font-display text-lg break-words">
                    {d.dispatch_to ||
                      "-"}
                  </div>
                </div>

              </div>

              {d.phone && (
                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 grid place-items-center shrink-0">
                    <Phone className="w-4 h-4 text-[#ebd281]" />
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                      Phone
                    </div>

                    <div className="text-sm">
                      {d.phone}
                    </div>
                  </div>

                </div>
              )}

              {d.created_at && (
                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 grid place-items-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-[#ebd281]" />
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                      Date
                    </div>

                    <div className="text-sm">
                      {new Date(
                        d.created_at
                      ).toLocaleDateString()}
                    </div>
                  </div>

                </div>
              )}

            </div>

          </GlassCard>

          {/* ITEMS */}
          <GlassCard className="min-w-0 overflow-hidden">

            <SectionTitle
              overline="Order"
              title={`Items · ${totalPieces} pcs`}
            />

            <div className="space-y-3">

              {(d.items || []).map(
                (item, index) => {

                  const qty =
                    Object.values(
                      item.sizes || {}
                    ).reduce(
                      (sum, value) =>
                        sum +
                        Number(
                          value || 0
                        ),
                      0
                    );

                  const amount =
                    qty *
                    Number(
                      item.unit_price ||
                        0
                    );

                  return (
                    <div
                      key={
                        item.id ||
                        item.sr_number ||
                        index
                      }
                      className="p-3 sm:p-4 rounded-xl bg-white/[0.04] border border-white/10 min-w-0 overflow-hidden"
                    >

                      <div className="flex items-start justify-between gap-3 min-w-0">

                        <div className="min-w-0 flex-1">

                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#ebd281] truncate">
                            {item.sr_number ||
                              "Product"}
                          </div>

                          <div className="font-display text-base sm:text-lg mt-1 break-words">
                            {item.title ||
                              item.name ||
                              "Product"}
                          </div>

                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs text-white/45">
                            {qty} pcs
                          </div>

                          <div className="font-display tabular-nums">
                            {formatRupee(
                              amount
                            )}
                          </div>
                        </div>

                      </div>

                      {/* SIZES */}
                      {Object.keys(
                        item.sizes || {}
                      ).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">

                          {Object.entries(
                            item.sizes || {}
                          ).map(
                            ([size, quantity]) => (
                              <span
                                key={size}
                                className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] whitespace-nowrap"
                              >
                                <span className="text-[#ebd281] font-semibold">
                                  {size}
                                </span>
                                {" · "}
                                {quantity}
                              </span>
                            )
                          )}

                        </div>
                      )}

                      {/* UNIT PRICE */}
                      {item.unit_price != null && (
                        <div className="text-[11px] text-white/45 mt-3">
                          Unit price:{" "}
                          {formatRupee(
                            item.unit_price
                          )}
                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>

          </GlassCard>

        </div>

        {/* =================================================
            RIGHT
        ================================================= */}

        <div className="lg:col-span-2 space-y-4 min-w-0">

          {/* PAYMENT */}
          <GlassCard className="min-w-0 overflow-hidden">

            <SectionTitle
              overline="Payment"
              title="Summary"
            />

            <div className="space-y-3">

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/55">
                  Grand Total
                </span>

                <span className="font-display text-lg tabular-nums">
                  {formatRupee(
                    d.grand_total
                  )}
                </span>
              </div>

              {d.discount != null && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/55">
                    Discount
                  </span>

                  <span className="text-sm tabular-nums">
                    {formatRupee(
                      d.discount
                    )}
                  </span>
                </div>
              )}

              {d.advance_received !=
                null && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/55">
                    Advance
                  </span>

                  <span className="text-sm tabular-nums">
                    {formatRupee(
                      d.advance_received
                    )}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">

                <span className="text-sm text-white/55">
                  Final Payable
                </span>

                <span className="font-display text-2xl tabular-nums text-[#ebd281]">
                  {formatRupee(
                    d.final_payable
                  )}
                </span>

              </div>

            </div>

          </GlassCard>

          {/* PAYMENT MODE */}
          <GlassCard className="min-w-0 overflow-hidden">

            <SectionTitle
              overline="Payment"
              title="Method"
            />

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 grid place-items-center shrink-0">
                <CreditCard className="w-4 h-4 text-[#ebd281]" />
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Payment Mode
                </div>

                <div className="font-display text-lg capitalize">
                  {(
                    d.payment_mode ||
                    "cash"
                  ).toLowerCase()}
                </div>
              </div>

            </div>

          </GlassCard>

          {/* ACTIONS */}
          <GlassCard className="min-w-0 overflow-hidden">

            <SectionTitle
              overline="Actions"
              title="Dispatch Receipt"
            />

            <div className="grid gap-2">

              {/* DOWNLOAD */}
              <button
                type="button"
                onClick={
                  downloadReceiptPdf
                }
                disabled={
                  busy !== ""
                }
                className="w-full rounded-full glass px-4 py-3 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ===
                "download" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-[#ebd281]" />
                )}

                Download PDF
              </button>

              {/* SHARE PDF */}
              <button
                type="button"
                onClick={
                  shareReceiptPdf
                }
                disabled={
                  busy !== ""
                }
                className="w-full rounded-full glass px-4 py-3 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ===
                "share" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 text-[#ebd281]" />
                )}

                Share PDF
              </button>

              {/* WHATSAPP */}
              <button
                type="button"
                onClick={
                  shareSummary
                }
                className="w-full rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 px-4 py-3 text-xs uppercase tracking-[0.18em] hover:bg-emerald-500/25 inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />

                WhatsApp Summary
              </button>

            </div>

          </GlassCard>

        </div>
      </div>
    </div>
  );
}
