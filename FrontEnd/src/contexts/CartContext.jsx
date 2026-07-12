import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../AuthContext";

const API = process.env.REACT_APP_API_URL || "";

const CartContext = createContext({
  items: [],
  cartCount: 0,
  loading: false,
  isInCart: () => false,
  refresh: async () => {},
  addToCart: async () => ({ ok: false }),
  removeFromCart: async () => ({ ok: false }),
  clearCart: async () => ({ ok: false }),
});

export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.userId;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) { setItems([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`${API}/api/marketplace/cart`);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch { /* leave items as-is on transient error */ }
    setLoading(false);
  }, [userId]);

  // Load the cart on login; clear it on logout.
  useEffect(() => {
    if (userId) refresh();
    else setItems([]);
  }, [userId, refresh]);

  const addToCart = useCallback(async (listingId) => {
    if (!userId) return { ok: false, error: "Please log in to add items to your cart" };
    try {
      await api.post(`${API}/api/marketplace/cart`, { listingId });
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || "Failed to add to cart" };
    }
  }, [userId, refresh]);

  const removeFromCart = useCallback(async (listingId) => {
    if (!userId) return { ok: false };
    try {
      await api.delete(`${API}/api/marketplace/cart/${listingId}`);
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || "Failed to remove from cart" };
    }
  }, [userId, refresh]);

  const clearCart = useCallback(async () => {
    if (!userId) return { ok: false };
    try {
      await api.delete(`${API}/api/marketplace/cart`);
      setItems([]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || "Failed to clear cart" };
    }
  }, [userId]);

  const isInCart = useCallback(
    (listingId) => items.some((it) => it.listingId === listingId),
    [items]
  );

  const value = {
    items,
    cartCount: items.length,
    loading,
    isInCart,
    refresh,
    addToCart,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}

export default CartContext;
