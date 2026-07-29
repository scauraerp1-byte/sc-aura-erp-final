import { useEffect, useRef, useState } from "react";
import { Bell, X, CheckCheck, ClipboardList, Truck, FileText, RotateCcw, Package, AlertTriangle, IndianRupee } from "lucide-react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useBodyLock } from "../hooks/useBodyLock";
import useEscapeClose from "../hooks/useEscapeClose";

const ICONS = {
  booking:   ClipboardList,
  dispatch:  Truck,
  estimate:  FileText,
  return:    RotateCcw,
  product:   Package,
  low_stock: AlertTriangle,
  payment:   IndianRupee,
  user:      Bell,
};

const POLL_MS = 60_000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const btnRef = useRef();
  const navigate = useNavigate();
  useBodyLock(open);
  useEscapeClose(() => setOpen(false), open);

  const load = async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch { /* silent */ }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const openAndLoad = async () => {
    setOpen((v) => !v);
    if (!open) await load();
  };

  const markAll = async () => {
    try { await api.post("/notifications/mark-all-read"); load(); } catch {}
  };

  const clickItem = async (n) => {
    if (!n.read) { try { await api.patch(`/notifications/${n.id}/read`); } catch {} }
    setOpen(false);
    const ref = n.ref || {};
    if (n.kind === "booking" && ref.booking_id) navigate(`/bookings/${ref.booking_id}`);
    else if (n.kind === "dispatch") navigate("/dispatch");
    else if (n.kind === "estimate") navigate("/estimates");
    else if (n.kind === "return") navigate("/vendor-returns");
    else if ((n.kind === "product" || n.kind === "low_stock") && ref.product_id) navigate(`/products/${ref.product_id}`);
    load();
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={openAndLoad}
        data-testid="topbar-notifications"
        className="relative w-9 h-9 grid place-items-center rounded-full glass hover:bg-white/10 transition"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-white/75" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center px-1 ring-2 ring-[var(--sca-bg)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed z-50 right-3 sm:right-6 top-14 w-[92vw] sm:w-[380px] modal-shell rounded-2xl border shadow-2xl fade-up
              bg-white border-[var(--sca-border)] text-[var(--sca-text)]
              dark:bg-[#11151d] dark:border-white/12 dark:text-white"
            data-testid="notification-panel"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--sca-border)] dark:border-white/10">
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--sca-text-muted)] dark:text-white/50">Updates</div>
                <div className="font-display text-lg leading-tight mt-0.5">Notifications</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAll}
                  data-testid="notif-mark-all"
                  title="Mark all read"
                  className="text-xs text-[var(--sca-text-soft)] dark:text-white/65 hover:text-[var(--sca-text)] dark:hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> All read
                </button>
                <button onClick={() => setOpen(false)} className="text-[var(--sca-text-muted)] dark:text-white/60 hover:text-[var(--sca-text)] dark:hover:text-white w-8 h-8 grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto modal-body">
              {items.length === 0 && (
                <div className="text-center py-10 text-[var(--sca-text-muted)] dark:text-white/50 text-sm">No notifications yet.</div>
              )}
              {items.map((n) => {
                const Icon = ICONS[n.kind] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => clickItem(n)}
                    data-testid={`notif-item-${n.kind}`}
                    className={`w-full text-left px-5 py-3 border-b border-[var(--sca-border)] dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 flex items-start gap-3 transition ${!n.read ? "bg-black/[0.02] dark:bg-white/[0.03]" : ""}`}
                  >
                    <div className={`w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 border ${!n.read ? "bg-[var(--sca-primary)]/8 text-[var(--sca-primary)] border-[var(--sca-primary)]/20 dark:bg-white/10 dark:text-white dark:border-white/15" : "bg-black/[0.03] text-[var(--sca-text-muted)] border-[var(--sca-border)] dark:bg-white/5 dark:text-white/60 dark:border-white/10"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate flex items-center gap-2 text-[var(--sca-text)] dark:text-white">
                        <span className="truncate">{n.title}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                      </div>
                      {n.body && <div className="text-xs text-[var(--sca-text-muted)] dark:text-white/55 truncate">{n.body}</div>}
                      <div className="text-[10px] text-[var(--sca-text-muted)] dark:text-white/40 mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
