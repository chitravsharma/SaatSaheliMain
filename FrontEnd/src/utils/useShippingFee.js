import { useEffect, useState } from "react";
import api from "./api";

const API = process.env.REACT_APP_API_URL || "";

/**
 * Fetches the marketplace's flat delivery fee (per currency) + tax note.
 * Prices are tax-inclusive, so there's no separate tax line.
 * Returns { shipping, taxIncluded } — shipping is a Number for the given
 * currency, or null while loading / when the currency has no configured fee.
 */
export default function useShippingFee(currency) {
  const [fees, setFees] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api.get(`${API}/api/marketplace/checkout/fees`)
      .then((r) => { if (!cancelled) setFees(r.data); })
      .catch(() => { /* leave null → treated as no fee */ });
    return () => { cancelled = true; };
  }, []);
  const raw = fees?.shipping?.[(currency || "").toLowerCase()];
  return {
    shipping: raw != null ? Number(raw) : null,
    taxIncluded: fees?.taxIncluded ?? true,
  };
}
