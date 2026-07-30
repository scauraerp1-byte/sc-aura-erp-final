import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ClipboardList, Truck, Package, RotateCcw, FileText, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBodyLock } from "../hooks/useBodyLock";

/**
 * FloatingFAB
 * -----------
 * Global quick-create button. Redesigned so the action labels are ALWAYS
 * visible (previously black-on-black in light theme). Each action row is a
 * proper button with icon + label, on a solid surface, and a proper backdrop.
 */
export default function FloatingFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  useBodyLock(open);

  if (!user) return null;
  const role = user.role;
  const canReturn = role === "admin" || role === "super_staff";

  const actions = [
    { label: "Booking",  icon: ClipboardList, to: "/bookings/new",         testid: "fab-booking"  },
    { label: "Dispatch", icon: Truck,         to: "/dispatch/new",         testid: "fab-dispatch" },
    { label: "Estimate", icon: FileText,      to: "/estimates/new",        testid: "fab-estimate" },
    { label: "Product",  icon: Package,       to: "/products/new",         testid: "fab-product"  },
    canReturn && { label: "Return", icon: RotateCcw, to: "/vendor-returns/new", testid: "fab-return" },
  ].filter(Boolean);

  return (
    <>
      {open && (
        <div
  aria-hidden="true"
  data-testid="fab-backdrop"
  onClick={() => setOpen(false)}
  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
/>
      )}

      <div className="fab-anchor fixed z-50 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-8 flex flex-col items-end gap-2.5 pointer-events-none">
        {open && (
          <div className="flex flex-col items-end gap-2 pointer-events-auto">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  data-testid={a.testid}
                  onClick={() => { setOpen(false); navigate(a.to); }}
                  className="inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg border transition-colors
                    bg-white text-[var(--sca-primary)] border-[var(--sca-border)] hover:bg-[var(--sca-surface-2)]
                    dark:bg-[#161b25] dark:text-white dark:border-white/12 dark:hover:bg-[#1f2532]"
                >
                  <Icon className="w-4 h-4" />
                  <span>{a.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
  type="button"
  data-testid="fab-toggle"
 onClick={() => {
  console.log("FAB", open);
  setOpen(v => !v);
}}
  aria-label={open ? "Close quick actions" : "Open quick actions"}
  className="pointer-events-auto w-14 h-14 rounded-full bg-[var(--sca-primary)] text-white grid place-items-center shadow-[0_12px_28px_rgba(17,24,39,0.35)] hover:brightness-110 active:scale-95 transition"
>
          {open ? <X className="w-6 h-6" /> : <Plus className="w-7 h-7 text-white stroke-[3]" />}
        </button>
      </div>
    </>
  );
}
import { useEffect } from "react";
