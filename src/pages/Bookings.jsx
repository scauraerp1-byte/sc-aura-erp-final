import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { GlassCard, SectionTitle } from "../components/Primitives";
import { Plus, ChevronRight } from "lucide-react";
import { StatusBadge } from "../components/StatusTracker";
import FilterBar from "../components/FilterBar";
import useDebounced from "../hooks/useDebounced";

/**
 * Bookings list — intentionally minimal per project brief.
 *
 * Columns shown: Booking No · Customer · View
 * All other data (items, total, advance, remaining, status details, date)
 * lives in the booking detail page.
 */
export default function Bookings() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("All");
  const [archive, setArchive] = useState("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const dq = useDebounced(search, 220);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (status !== "All") params.status = status;
    if (archive !== "active") params.include_dispatched = true;
    if (dq.trim()) params.q = dq.trim();
    try {
      const { data } = await api.get("/bookings", { params });
      let rows = data;
      if (archive === "archived") rows = rows.filter((b) => b.dispatched);
      if (archive === "active")   rows = rows.filter((b) => !b.dispatched);
      setItems(rows);
    } finally { setLoading(false); }
  }, [status, archive, dq]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <SectionTitle
        overline="Operations"
        title="Bookings"
        action={
          <button
            data-testid="booking-add"
            onClick={() => navigate("/bookings/new")}
            className="btn-primary rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Booking
          </button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search booking no, customer, phone…"
        filters={[
          {
            key: "status", label: "Status", value: status, onChange: setStatus,
            options: [
              { value: "All", label: "All" },
              { value: "confirmed", label: "Confirmed" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
          {
            key: "view", label: "View", value: archive, onChange: setArchive,
            options: [
              { value: "active",   label: "Pending" },
              { value: "archived", label: "Dispatched" },
              { value: "all",      label: "All" },
            ],
          },
        ]}
      />

      {/* Mobile-first list */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-lg shimmer" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-14 text-white/55 text-sm">No bookings match.</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  data-testid={`booking-row-${b.booking_no}`}
                  onClick={() => navigate(`/bookings/${b.id}`)}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-white/[0.04] transition text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-sm sm:text-base tabular-nums tracking-tight">
                        {b.booking_no}
                      </span>
                      <StatusBadge status={b.status} />
                      {b.dispatched && (
                        <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400">Dispatched</span>
                      )}
                    </div>
                    <div className="text-sm mt-0.5 truncate text-white/85">
                      {b.customer_snapshot?.name || "—"}
                      {b.customer_snapshot?.shop_name ? (
                        <span className="text-white/50"> · {b.customer_snapshot.shop_name}</span>
                      ) : null}
                    </div>
                  </div>
                  <span
                    data-testid={`booking-view-${b.booking_no}`}
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] hover:bg-white/10 flex-shrink-0"
                  >
                    View <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/40 sm:hidden flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && items.length > 0 && (
        <div className="text-[11px] text-white/45 text-center">
          Showing {items.length} {items.length === 1 ? "booking" : "bookings"} · Open a row for full details
        </div>
      )}
    </div>
  );
}
