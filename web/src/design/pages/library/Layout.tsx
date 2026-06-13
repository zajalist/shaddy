// Layout — responsive two-column shell for the Library page. Replaces the
// old BodyLayout's binary mobile fork.
//
// Wide (≥ 960px): a CSS grid `240px minmax(0, 1fr)` centred at 1240px, with
// the TOC in the first track and the article column (capped at 72ch) in the
// second. The grid reflows in pure CSS (see LIBRARY_GRID_CSS in style.ts) so
// resizing doesn't need a React re-render.
//
// Narrow (< 960px): the grid collapses to one column and the TOC renders as
// a <details> drawer above the article. The drawer is JS-gated on the same
// 960 breakpoint via useMediaQuery so the sidebar/drawer choice matches the
// grid. We use 960 — not the 768 touch breakpoint — so the prose never gets
// starved in the 768–960 band where the sidebar still fits.

import type { ReactNode } from 'react';
import { SHADE, TYPE } from '../../tokens';
import { TOC } from './TOC';
import type { TocGroup } from './TOC';
import { useMediaQuery } from './useMediaQuery';
import { inkCard } from './style';

export const LIBRARY_LAYOUT_BREAKPOINT = 960;

export type LayoutProps = {
  tocGroups: TocGroup[];
  /** Lower-cased search query passed through to the TOC filter. */
  q: string;
  onNavigate?: (id: string) => void;
  children: ReactNode;
};

export const Layout = ({ tocGroups, q, onNavigate, children }: LayoutProps) => {
  const isNarrow = useMediaQuery(`(max-width: ${LIBRARY_LAYOUT_BREAKPOINT - 1}px)`);

  return (
    <div className="lib-shell">
      {isNarrow ? (
        <details style={inkCard({ marginBottom: 20 })}>
          <summary style={{
            cursor: 'pointer',
            padding: '14px 16px',
            font: `700 12px ${TYPE.bodyMono}`,
            letterSpacing: TYPE.trackEyebrow,
            textTransform: 'uppercase',
            color: SHADE.text,
            outline: 'none',
            userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span>Contents</span>
            <span style={{ marginLeft: 'auto', color: SHADE.textFaint }}>▾</span>
          </summary>
          <div style={{ padding: '4px 8px 14px' }}>
            <TOC groups={tocGroups} filter={q} onNavigate={onNavigate} />
          </div>
        </details>
      ) : (
        <TOC groups={tocGroups} filter={q} onNavigate={onNavigate} />
      )}
      {children}
    </div>
  );
};

export default Layout;
