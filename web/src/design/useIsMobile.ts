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
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
};
