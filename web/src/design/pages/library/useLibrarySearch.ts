// useLibrarySearch — owns the Library's search query, its 180ms debounce,
// and its reflection into the URL (`?q=`). Replaces the title-only
// useState/useMemo filter that lived in Library.tsx.
//
// The caller passes a static `searchText` map (articleId -> concatenated,
// lowercased searchable text: title + curated keywords + code snippets).
// We return the immediate input value (`raw`), a setter, the debounced
// lowered query (`q`), and the set of article IDs that match.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// 5-line debounce — returns `value` only after it has been stable for `ms`.
export const useDebounced = <T,>(value: T, ms: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
};

export const SEARCH_DEBOUNCE_MS = 180;

export type LibrarySearch = {
  /** Immediate input value (drives the controlled <input>). */
  raw: string;
  setRaw: (v: string) => void;
  /** Debounced, trimmed, lowercased query. Empty string = show all. */
  q: string;
  /** IDs whose searchable text contains the query. */
  visibleIds: Set<string>;
};

export function useLibrarySearch(searchText: Record<string, string>): LibrarySearch {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const [raw, setRaw] = useState(urlQ);

  const debounced = useDebounced(raw, SEARCH_DEBOUNCE_MS);

  // Reflect the debounced query into ?q= (replace history; drop when empty).
  useEffect(() => {
    const trimmed = debounced.trim();
    const current = params.get('q') ?? '';
    if (trimmed === current) return;
    const next = new URLSearchParams(params);
    if (trimmed === '') next.delete('q');
    else next.set('q', trimmed);
    setParams(next, { replace: true });
    // Depend on the debounced value only; params/setParams are stable.
  }, [debounced]);

  const q = debounced.trim().toLowerCase();

  const visibleIds = useMemo(() => {
    const s = new Set<string>();
    for (const [id, text] of Object.entries(searchText)) {
      if (q === '' || text.includes(q)) s.add(id);
    }
    return s;
  }, [q, searchText]);

  return { raw, setRaw, q, visibleIds };
}
