import { useEffect } from "react";

export function useBodyLock(open) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (open) {
      html.classList.add("body-locked");
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    } else {
      html.classList.remove("body-locked");
      html.style.overflow = "";
      body.style.overflow = "";
    }

    return () => {
      html.classList.remove("body-locked");
      html.style.overflow = "";
      body.style.overflow = "";
    };
  }, [open]);
}
