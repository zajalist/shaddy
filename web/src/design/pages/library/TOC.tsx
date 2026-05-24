// TOC — sticky left sidebar for the Library encyclopedia. Lists every
// article (grouped by section) and highlights the active entry as the
// reader scrolls.
//
// Active-state detection uses IntersectionObserver with a top-biased
// rootMargin so the highlight matches the article currently in the
// reader's eye-line rather than waiting for it to scroll off the top.
//
// The list is filtered by the page's live search query (passed in as
// `filter`): entries whose title doesn't contain the query are hidden,
// and groups with no visible entries collapse entirely. This keeps the
// TOC useful as an in-page search affordance.

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { SHADE, TYPE } from '../../tokens';
import { useIsMobile } from '../../useIsMobile';

export type TocEntry = { id: string; title: string };
export type TocGroup = { label: string; color: string; entries: TocEntry[] };

export type TOCProps = {
  groups: TocGroup[];
  /** Lower-cased search query — empty string means "show all". */
  filter: string;
};

export const TOC = ({ groups, filter }: TOCProps) => {
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Watch every article in the DOM. When more than one is visible at once,
  // pick the one closest to the top of the viewport.
  useEffect(() => {
    const articles = Array.from(
      document.querySelectorAll<HTMLElement>('[data-article-id]'),
    );
    if (articles.length === 0) return;
    const visible = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-article-id');
          if (!id) return;
          if (entry.isIntersecting) {
            visible.set(id, entry.boundingClientRect.top);
          } else {
            visible.delete(id);
          }
        });
        if (visible.size === 0) return;
        // Pick the article with the smallest non-negative top — i.e. the
        // one whose heading is just below the sticky filter, or the one
        // closest to it.
        let bestId: string | null = null;
        let bestTop = Infinity;
        visible.forEach((top, id) => {
          const adjusted = top < 0 ? Math.abs(top) + 9999 : top;
          if (adjusted < bestTop) { bestTop = adjusted; bestId = id; }
        });
        setActiveId(bestId);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: [0, 0.1, 0.5, 1] },
    );
    articles.forEach((a) => obs.observe(a));
    return () => obs.disconnect();
  }, []);

  // Hide entries whose title doesn't include the filter (case-insensitive).
  // Groups with zero matches drop out entirely.
  const visibleGroups: TocGroup[] = groups
    .map((g) => ({
      ...g,
      entries: g.entries.filter(
        (e) => filter === '' || e.title.toLowerCase().includes(filter),
      ),
    }))
    .filter((g) => g.entries.length > 0);

  // Desktop = sticky sidebar; mobile = flat in-page (parent <details> drawer
  // already supplies the surface + border + collapse affordance).
  const aside: CSSProperties = isMobile
    ? {
        width: '100%',
        padding: '6px 4px 10px',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
      }
    : {
        position: 'sticky',
        top: 24,
        alignSelf: 'flex-start',
        width: 240,
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        padding: '18px 16px 24px',
        background: SHADE.surface1,
        border: `1.5px solid ${SHADE.inkLine}`,
        borderRadius: 10,
        boxShadow: `0 3px 0 ${SHADE.inkLine}`,
        flex: '0 0 auto',
      };
  const heading: CSSProperties = {
    fontFamily: TYPE.bodyMono,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: TYPE.trackEyebrow,
    color: SHADE.textFaint,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: `1.5px dashed ${SHADE.border}`,
  };
  const groupLabel = (color: string): CSSProperties => ({
    display: 'block',
    fontFamily: TYPE.bodyMono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: TYPE.trackEyebrow,
    color,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 6,
  });
  const link = (active: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    minHeight: isMobile ? 36 : 0,
    padding: isMobile ? '8px 10px' : '5px 8px',
    margin: '1px 0',
    fontFamily: TYPE.body,
    fontSize: isMobile ? 14 : 13,
    fontWeight: active ? 600 : 500,
    color: active ? SHADE.text : SHADE.textDim,
    background: active ? SHADE.surface3 : 'transparent',
    borderRadius: 5,
    textDecoration: 'none',
    letterSpacing: '-0.005em',
    borderLeft: `2.5px solid ${active ? SHADE.inkLine : 'transparent'}`,
    transition: 'background 120ms ease, color 120ms ease',
  });

  return (
    <aside style={aside} aria-label="table of contents">
      <div style={heading}>contents</div>
      {visibleGroups.length === 0 && (
        <p style={{
          margin: 0, fontFamily: TYPE.body, fontSize: 12.5,
          color: SHADE.textFaint, lineHeight: 1.5,
        }}>
          no matches — clear the search to see everything.
        </p>
      )}
      {visibleGroups.map((g) => (
        <div key={g.label}>
          <span style={groupLabel(g.color)}>{g.label}</span>
          {g.entries.map((e) => (
            <a key={e.id} href={`#${e.id}`}
              style={link(activeId === e.id)}
              onClick={(ev) => {
                // Smooth scroll without polluting history.
                ev.preventDefault();
                const target = document.getElementById(e.id);
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  history.replaceState(null, '', `#${e.id}`);
                }
              }}>
              {e.title.toLowerCase()}
            </a>
          ))}
        </div>
      ))}
    </aside>
  );
};

export default TOC;
