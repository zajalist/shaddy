// Palette personalisation — recents (MRU) + favorites, persisted to
// localStorage and shared across the app via a tiny subscription so any
// mounted Palette re-renders when they change. No store dependency; the
// palette is a leaf concern and this keeps it self-contained.

import { useEffect, useReducer } from 'react';

const RECENTS_KEY = 'shaddy.palette.recents.v1';
const FAVS_KEY = 'shaddy.palette.favorites.v1';
const RECENTS_MAX = 12;

const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((l) => l());

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
function write(key: string, v: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode / quota — ignore, prefs are best-effort */
  }
  emit();
}

export function getRecents(): string[] {
  return read(RECENTS_KEY);
}
export function pushRecent(id: string): void {
  const cur = read(RECENTS_KEY).filter((x) => x !== id);
  cur.unshift(id);
  write(RECENTS_KEY, cur.slice(0, RECENTS_MAX));
}

export function getFavorites(): string[] {
  return read(FAVS_KEY);
}
export function isFavorite(id: string): boolean {
  return read(FAVS_KEY).includes(id);
}
export function toggleFavorite(id: string): void {
  const cur = read(FAVS_KEY);
  const i = cur.indexOf(id);
  if (i >= 0) cur.splice(i, 1);
  else cur.unshift(id);
  write(FAVS_KEY, cur);
}

/** Re-render the caller whenever recents/favorites change (any tab/instance). */
export function usePaletteVersion(): void {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);
}
