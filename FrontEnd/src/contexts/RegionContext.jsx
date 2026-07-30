import React, { createContext, useContext, useState } from "react";

/**
 * Region gate for the marketplace. India can't check out yet (payments not set
 * up for INR), so India visitors see "Contact us to buy" instead of prices/cart.
 * Detection is client-side (timezone + locale); a superadmin toggle overrides it
 * so staff can preview/test both the India and International experiences.
 */
const RegionContext = createContext({ region: "INTL", isIndia: false, setRegion: () => {} });

function detectIndia() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return true;
    const langs = [navigator.language, ...(navigator.languages || [])]
      .filter(Boolean)
      .map((l) => l.toLowerCase());
    if (langs.some((l) => l === "hi" || l.startsWith("hi-") || l.endsWith("-in"))) return true;
  } catch { /* SSR / blocked APIs → default International */ }
  return false;
}

export function RegionProvider({ children }) {
  const [region, setRegionState] = useState(() => {
    try {
      const saved = localStorage.getItem("ss_region");
      if (saved === "IN" || saved === "INTL") return saved;
    } catch { /* ignore */ }
    return detectIndia() ? "IN" : "INTL";
  });

  const setRegion = (r) => {
    const next = r === "IN" ? "IN" : "INTL";
    setRegionState(next);
    try { localStorage.setItem("ss_region", next); } catch { /* ignore */ }
  };

  return (
    <RegionContext.Provider value={{ region, isIndia: region === "IN", setRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
