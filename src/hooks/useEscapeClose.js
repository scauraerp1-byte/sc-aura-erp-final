import { useEffect } from "react";

/**
 * Close a modal / drawer / popover when the user presses the Escape key.
 * The handler is attached to `document` in the capture phase so it wins
 * over deeper focus handlers. Only active while `enabled` is truthy.
 */
export default function useEscapeClose(onClose, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof onClose !== "function") return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose, enabled]);
}
