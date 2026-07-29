import { useEffect } from "react";

export function useBodyLock(open) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.documentElement.classList.add("body-locked");
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.documentElement.classList.remove("body-locked");
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.documentElement.classList.remove("body-locked");
    };
  }, [open]);
}
useEffect(() => {
  console.log("OPEN =", open);
  console.log(
    "HTML LOCK =",
    document.documentElement.classList.contains("body-locked")
  );
}, [open]);
