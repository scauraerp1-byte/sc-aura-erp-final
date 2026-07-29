import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";

const BrandingContext = createContext({ branding: null, refresh: () => {} });

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/branding");
      setBranding(data);
    } catch {}
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("aura_token");
    if (token) refresh();
  }, [refresh]);

  return (
    <BrandingContext.Provider value={{ branding, refresh, setBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
