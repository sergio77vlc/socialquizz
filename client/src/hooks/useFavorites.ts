import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadLocalFavorites, saveLocalFavorites } from '../utils/favorites';

/** Favoritos sincronizados con la cuenta si hay sesión iniciada; si no, guardados en este navegador. */
export function useFavorites() {
  const { user, toggleFavorite } = useAuth();
  const [localFavorites, setLocalFavorites] = useState<string[]>(() => loadLocalFavorites());

  useEffect(() => {
    if (!user) setLocalFavorites(loadLocalFavorites());
  }, [user]);

  const favorites = user ? user.favorites : localFavorites;

  const toggle = useCallback(
    (id: string) => {
      if (user) {
        toggleFavorite(id).catch(() => {});
        return;
      }
      setLocalFavorites((prev) => {
        const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
        saveLocalFavorites(next);
        return next;
      });
    },
    [user, toggleFavorite],
  );

  return { favorites, isFavorite: (id: string) => favorites.includes(id), toggle };
}
