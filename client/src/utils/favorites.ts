const KEY = 'sq:favorites';

/** Favoritos para cuando no hay sesión iniciada: se guardan solo en este navegador. */
export function loadLocalFavorites(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalFavorites(favorites: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(favorites));
  } catch {
    // localStorage no disponible (modo privado, cuota llena...): los favoritos no persisten,
    // pero el resto de la app sigue funcionando con normalidad.
  }
}
