// useMediaQuery — tiny matchMedia wrapper, colocated in library/.
//
// Returns whether the given media query currently matches, and re-renders
// when it changes. SSR/jsdom-safe: defaults to false when matchMedia is
// unavailable.

import { useEffect, useState } from 'react';

export const useMediaQuery = (query: string): boolean => {
  const get = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState<boolean>(get);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    // addEventListener is the modern API; older Safari used addListener.
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
};
