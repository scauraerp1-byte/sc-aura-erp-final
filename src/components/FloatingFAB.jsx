import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  X,
  Package,
  CalendarDays,
  Truck,
  FileText,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  {
    label: "Product",
    icon: Package,
    path: "/products/new",
  },
  {
    label: "Booking",
    icon: CalendarDays,
    path: "/bookings/new",
  },
  {
    label: "Dispatch",
    icon: Truck,
    path: "/dispatch/new",
  },
  {
    label: "Estimate",
    icon: FileText,
    path: "/estimates/new",
  },
  {
    label: "Return",
    icon: RotateCcw,
    path: "/vendor-returns/new",
  },
];

export default function FloatingFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const fabRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        fabRef.current &&
        !fabRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const handleAction = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div
      ref={fabRef}
      className="fixed bottom-12 right-5 z-50 flex flex-col items-end gap-2"
    >
      {open && (
        <div className="flex flex-col items-end gap-2 mb-2">
          {actions.map(
            ({ label, icon: Icon, path }) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  handleAction(path)
                }
                className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-lg border border-gray-200 hover:bg-gray-50 transition-all"
              >
                <span className="text-sm font-medium text-gray-900">
                  {label}
                </span>

                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                  <Icon size={18} />
                </span>
              </button>
            )
          )}
        </div>
      )}

      <button
        type="button"
        aria-label={
          open
            ? "Close quick actions"
            : "Open quick actions"
        }
        aria-expanded={open}
        onClick={() =>
          setOpen((value) => !value)
        }
        className="flex h-14 w-14 -translate-y-2 items-center justify-center rounded-full bg-black text-white shadow-xl transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {open ? (
          <X size={24} />
        ) : (
          <Plus size={24} />
        )}
      </button>
    </div>
  );
}
