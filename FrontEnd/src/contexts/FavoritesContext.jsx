import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../AuthContext";

const API = process.env.REACT_APP_API_URL || "";
const TARGET_TYPE = "LISTING";

const FavoritesContext = createContext({
  favoriteIds: new Set(),
  isFavorite: () => false,
  toggleFavorite: async () => ({ ok: false }),
  refresh: async () => {},
});

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.userId;
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());

  const refresh = useCallback(async () => {
    if (!userId) { setFavoriteIds(new Set()); return; }
    try {
      const res = await api.get(`${API}/api/social/favorites`, {
        params: { userId, targetType: TARGET_TYPE },
      });
      const ids = Array.isArray(res.data) ? res.data.map((f) => f.targetId) : [];
      setFavoriteIds(new Set(ids));
    } catch { /* keep current on transient error */ }
  }, [userId]);

  useEffect(() => {
    if (userId) refresh();
    else setFavoriteIds(new Set());
  }, [userId, refresh]);

  const isFavorite = useCallback((listingId) => favoriteIds.has(listingId), [favoriteIds]);

  const toggleFavorite = useCallback(async (listingId) => {
    if (!userId) return { ok: false, error: "Please log in to save favorites" };
    try {
      const res = await api.post(`${API}/api/social/favorite`, {
        userId, targetType: TARGET_TYPE, targetId: listingId,
      });
      const favorited = !!res.data?.favorited;
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (favorited) next.add(listingId); else next.delete(listingId);
        return next;
      });
      return { ok: true, favorited };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || "Could not update favorite" };
    }
  }, [userId]);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite, refresh }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}

export default FavoritesContext;
