// Shared mobile-viewport hook. Reused by every page that needs a
// branch between desktop and mobile UI (Library, Learn, Gallery, Docs,
// Landing, Properties, BlockEditor, Block, RecipeCanvas).
//
// 768px is the same breakpoint DesignApp uses to route between the
// DesktopApp and MobileApp shells. Keeping it in one place avoids
// drift.

import { useEffect, useState } from 'react';

export const MOBILE_BREAKPOINT = 768;

export const useIsMobile = (breakpoint: number = MOBILE_BREAKPOINT): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.innerWidth < breakpoint,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    // matchMedia only notifies when the breakpoint is actually crossed, so we
    // skip the per-pixel `resize` churn that fired a state update on every
    // frame of a window drag.
    const mql = window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [breakpoint]);
  return isMobile;
};
