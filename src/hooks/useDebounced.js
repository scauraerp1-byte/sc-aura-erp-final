import { useEffect, useState } from "react";

/**
 * useDebounced — return the latest value after `delay` ms of inactivity.
 * Prevents API spam on every keystroke.
 */
export default function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
