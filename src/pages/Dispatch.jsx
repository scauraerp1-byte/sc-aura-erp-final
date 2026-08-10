import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useBranding } from "../contexts/BrandingContext";
import {
  GlassCard,
  Pill,
  SectionTitle,
} from "../components/Primitives";
import {
  Plus,
  Share2,
  Download,
  Loader2,
  ChevronRight,
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
import FilterBar from "../components/FilterBar";
import useDebounced from "../hooks/useDebounced";

export default function Dispatch() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { branding } = useBranding();
  const dq = useDebounced(search, 220);

  const load = useCallback(() => {
    setLoading(true);

    const params = {};

    if (status !== "All") {
      params.status = status;
    }

    if (dq.trim()) {
      params.q = dq.trim();
    }

    api
      .get("/dispatches", {
        params,
      })
      .then((r) => {
        setItems(r.data || []);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [status, dq]);

  useEffect(() => {
    load();
  }, [load]);

  /* =====================================================
     PDF SHARE
  ===================================================== */

  const shareReceiptPdf = async (d) => {
    setBusy(d.id);

    try {
      const doc =
        await buildDispatchPDF(
          d,
          branding
        );

      await sharePDF(
        doc,
        `${d.dispatch_no}.pdf`,
        d.phone
      );
    } finally {
      setBusy("");
    }
  };

  /* =====================================================
     PDF DOWNLOAD
  ===================================================== */

  const downloadReceiptPdf = async (d) => {
    setBusy(d.id);

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
    } finally {
      setBusy("");
    }
  };

  /* =====================================================
     WHATSAPP SUMMARY
     NO PUBLIC URL
  ===================================================== */

  const shareSummary = (d) => {
    const qty =
      (d.items || []).reduce(
        (a, it) =>
          a +
          Object.values(
            it.sizes || {}
          ).reduce(
            (x, y) => x + y,
            0
          ),
        0
      );

    const text = `*${
      branding?.company_name ||
      "SC Aura Kurtis"
    }* — Dispatch ${
      d.dispatch_no
    }\nTo: ${
      d.dispatch_to
    }\nPieces: ${qty}\nGrand: ${formatRupee(
      d.grand_total
    )}\nFinal Payable: ${formatRupee(
      d.final_payable
    )}\nMode: ${(
      d.payment_mode || "cash"
    ).toUpperCase()}`;

    shareWhatsApp({
      phone: d.phone,
      text,
    });
  };

  /* =====================================================
     OPEN DISPATCH DETAIL
  ===================================================== */

  const openDispatch = (id) => {
    navigate(`/dispatch/${id}`);
  };

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden">

      {/* HEADER */}
      <SectionTitle
        overline="Operations"
        title="Dispatch"
        action={
          <button
            type="button"
            onClick={() =>
              navigate("/dispatch/new")
            }
            data-testid="dispatch-new"
            className="btn-primary rounded-full px-4 sm:px-5 py-2.5 text-xs uppercase tracking-[0.18em] inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Direct Dispatch
          </button>
        }
      />

      {/* FILTERS */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search dispatch no, customer, phone…"
        filters={[
          {
            key: "status",
            label: "Status",
            value: status,
            onChange: setStatus,
            options: [
              {
                value: "All",
                label: "All",
              },
              {
                value: "dispatched",
                label: "Dispatched",
              },
            ],
          },
        ]}
      />

      {/* LIST */}
      <div className="grid lg:grid-cols-2 gap-3 min-w-0">

        {/* LOADING */}
        {loading &&
          Array.from({
            length: 4,
          }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-2xl shimmer"
            />
          ))}

        {/* EMPTY */}
        {!loading &&
          items.length === 0 && (
            <GlassCard className="lg:col-span-2 text-center py-10 text-white/55">
              No dispatches.
            </GlassCard>
          )}

        {/* DISPATCH CARDS */}
        {items.map((d) => {
          const qty =
            (d.items || []).reduce(
              (a, it) =>
                a +
                Object.values(
                  it.sizes || {}
                ).reduce(
                  (x, y) => x + y,
                  0
                ),
              0
            );

          return (
            <GlassCard
              key={d.id}
              data-testid={`dispatch-card-${d.dispatch_no}`}
              className="!p-4 sm:!p-5 min-w-0 overflow-hidden"
            >
              {/* CLICKABLE CONTENT */}
              <button
                type="button"
                onClick={() =>
                  openDispatch(d.id)
                }
                className="w-full text-left min-w-0"
              >

                {/* HEADER */}
                <div className="flex items-start justify-between mb-2 gap-3 min-w-0">

                  <div className="min-w-0 flex-1">

                    <div className="text-[10px] font-mono-receipt text-white/60 truncate">
                      {d.dispatch_no}
                    </div>

                    <div className="font-display text-lg mt-0.5 truncate">
                      {d.dispatch_to}
                    </div>

                    <div className="text-xs text-white/55 truncate">
                      {d.phone} ·{" "}
                      {(
                        d.payment_mode ||
                        "cash"
                      ).toUpperCase()}
                    </div>

                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Pill tone="primary">
                      Dispatched
                    </Pill>

                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </div>

                </div>

                {/* PRODUCTS */}
                <div className="mt-2 flex flex-wrap gap-1">

                  {(d.items || [])
                    .slice(0, 4)
                    .map((it, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono-receipt"
                      >
                        {it.sr_number}
                      </span>
                    ))}

                  {(d.items || []).length >
                    4 && (
                    <span className="text-[11px] text-white/45">
                      +
                      {d.items.length -
                        4}{" "}
                      more
                    </span>
                  )}

                </div>

                {/* SUMMARY */}
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs min-w-0">

                  <div className="rounded-lg bg-white/5 px-2 py-1.5 min-w-0 overflow-hidden">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-white/45">
                      Items
                    </div>

                    <div className="font-display tabular-nums truncate">
                      {qty} pcs
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/5 px-2 py-1.5 min-w-0 overflow-hidden">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-white/45">
                      Grand
                    </div>

                    <div className="font-display tabular-nums truncate">
                      {formatRupee(
                        d.grand_total
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/5 px-2 py-1.5 min-w-0 overflow-hidden">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-white/45">
                      Payable
                    </div>

                    <div className="font-display tabular-nums truncate">
                      {formatRupee(
                        d.final_payable
                      )}
                    </div>
                  </div>

                </div>

                {/* DATE */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-white/10 text-xs">

                  <span className="text-white/55 truncate">
                    {new Date(
                      d.created_at
                    ).toLocaleString()}
                  </span>

                  <span className="text-white/35 shrink-0">
                    View details
                  </span>

                </div>

              </button>

              {/* ACTIONS */}
              <div
                className="flex gap-2 mt-3 flex-wrap"
                onClick={(e) =>
                  e.stopPropagation()
                }
              >

                {/* PDF DOWNLOAD */}
                <button
                  type="button"
                  onClick={() =>
                    downloadReceiptPdf(
                      d
                    )
                  }
                  disabled={
                    busy === d.id
                  }
                  className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {busy === d.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}

                  PDF
                </button>

                {/* PDF SHARE */}
                <button
                  type="button"
                  onClick={() =>
                    shareReceiptPdf(
                      d
                    )
                  }
                  disabled={
                    busy === d.id
                  }
                  className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-white/10 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>

                {/* WHATSAPP SUMMARY */}
                <button
                  type="button"
                  onClick={() =>
                    shareSummary(d)
                  }
                  title="WhatsApp summary"
                  aria-label="WhatsApp summary"
                  className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 grid place-items-center hover:bg-emerald-500/25"
                >
                  <Share2 className="w-4 h-4" />
                </button>

              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
