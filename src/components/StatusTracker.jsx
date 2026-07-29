import { Pill } from "./Primitives";

const LABELS = {
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  pending: "Confirmed",
  processing: "Confirmed",
  partial: "Confirmed",
  fulfilled: "Confirmed",
  delivered: "Delivered",
};

export const STATUS_TONES = {
  confirmed: "primary",
  cancelled: "danger",
  delivered: "success",
};

export function StatusBadge({ status }) {
  return <Pill tone={STATUS_TONES[status] || "primary"}>{LABELS[status] || status}</Pill>;
}

export default function StatusTracker({ status, dispatched }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-300 inline-flex items-center gap-2">
        Booking cancelled
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2.5 text-sm inline-flex items-center gap-2 flex-wrap">
      <Pill tone="primary">Confirmed</Pill>
      {dispatched && <Pill tone="success">Dispatched</Pill>}
    </div>
  );
}
