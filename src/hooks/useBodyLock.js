import { useEffect } from "react";

/**
 * useBodyLock – prevents the page behind a modal / drawer / popover from
 * scrolling. Ref-counted so overlapping modals restore correctly.
 *
 * Strategy: apply `overflow: hidden` to both <html> and <body> plus a
 * dedicated `body-locked` class so global CSS can react (hide FAB, hide
 * bottom-nav). We avoid `position: fixed` on the body because that creates
 * a new containing block on some browsers, which pushes `position:fixed`
 * modal wrappers off-centre when the page was previously scrolled.
 *
 * The technique below is safe on iOS Safari because we also disable
 * `touch-action` via the `.body-locked` CSS class (see index.css), which
 * prevents the rubber-band scroll while a modal is open.
 */
let lockCount = 0;
let savedOverflow = null;
let savedHtmlOverflow = null;

export function useBodyLock(open) {
  useEffect(() => {
    if (!open) return undefined;
    lockCount += 1;
    if (lockCount === 1) {
      savedOverflow = document.body.style.overflow;
      savedHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.documentElement.classList.add("body-locked");
    }
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow ?? "";
        document.documentElement.style.overflow = savedHtmlOverflow ?? "";
        document.documentElement.classList.remove("body-locked");
      }
    };
  }, [open]);
}
