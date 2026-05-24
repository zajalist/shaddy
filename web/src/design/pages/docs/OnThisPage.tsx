// Right rail — "On this page" table of contents. Scans the rendered
// article for every <h2 data-toc="h2"> / <h3 data-toc="h3">, hangs an
// IntersectionObserver on each to track which is currently in view, and
// highlights it in the rail.
//
// The TOC re-scans whenever the active doc id changes (the centre column
// renders a different page). The observer is rebuilt fresh on each scan
// so we never hold references to detached nodes.

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { DOC, TYPE } from './theme';

type Entry = { id: string; text: string; level: 2 | 3 };

export type OnThisPageProps = {
  /** Re-scan when this changes (centre column has swapped to a new page). */
  activeDocId: string;
};

export const OnThisPage = ({ activeDocId }: OnThisPageProps) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  // Re-scan headings whenever the doc changes. Defer to next animation
  // frame so the new article has actually rendered.
  useEffect(() => {
    let cancelled = false;
    const scan = () => {
      if (cancelled) return;
      const nodes = document.querySelectorAll<HTMLElement>(
        'article [data-toc]',
      );
      const list: Entry[] = [];
      nodes.forEach((n) => {
        const level = n.dataset.toc === 'h3' ? 3 : 2;
        list.push({
          id: n.id,
          text: n.textContent?.replace(/#$/, '').trim() ?? '',
          level,
        });
      });
      setEntries(list);
      setActiveHeading(list[0]?.id ?? null);
    };
    const raf = requestAnimationFrame(scan);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [activeDocId]);

  // Observe each heading. Whichever is closest to the top of the
  // viewport "wins" the highlight; ties break to the higher level.
  useEffect(() => {
    if (entries.length === 0) return;
    const observed: HTMLElement[] = [];
    entries.forEach((e) => {
      const el = document.getElementById(e.id);
      if (el) observed.push(el);
    });
    if (observed.length === 0) return;

    const obs = new IntersectionObserver(
      () => {
        // On any change, pick whichever observed heading is closest to
        // (but not past) 25% of the viewport down from the top. This
        // matches the way most docs feel — the heading you're "reading
        // under" highlights, not the one barely off-screen.
        const triggerLine = window.innerHeight * 0.25;
        let bestId: string | null = null;
        let bestDist = Infinity;
        observed.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top - triggerLine);
          if (rect.top - triggerLine <= 4 && dist < bestDist) {
            bestId = el.id;
            bestDist = dist;
          }
        });
        if (bestId !== null) {
          setActiveHeading(bestId);
        }
      },
      {
        rootMargin: '0px 0px -60% 0px',
        threshold: [0, 1],
      },
    );

    observed.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [entries]);

  const wrap: CSSProperties = {
    position: 'sticky',
    top: 0,
    alignSelf: 'flex-start',
    width: 240,
    flex: '0 0 240px',
    padding: '56px 24px 32px 32px',
    boxSizing: 'border-box',
    maxHeight: '100vh',
    overflowY: 'auto',
  };
  const eyebrow: CSSProperties = {
    font: `600 10px ${TYPE.bodyMono}`,
    letterSpacing: TYPE.trackEyebrow,
    color: DOC.textFaint,
    textTransform: 'uppercase',
    marginBottom: 12,
  };
  if (entries.length === 0) {
    return (
      <aside style={wrap}>
        <div style={eyebrow}>On this page</div>
        <div style={{ font: `400 12px ${TYPE.body}`, color: DOC.textFaint }}>
          No headings.
        </div>
      </aside>
    );
  }
  return (
    <aside style={wrap} aria-label="On this page">
      <div style={eyebrow}>On this page</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {entries.map((e) => (
          <li
            key={e.id}
            style={{
              margin: '4px 0',
              paddingLeft: e.level === 3 ? 14 : 0,
            }}
          >
            <a
              href={`#${e.id}`}
              onClick={(ev) => {
                ev.preventDefault();
                const el = document.getElementById(e.id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              style={{
                display: 'block',
                padding: '3px 8px',
                borderLeft: `2px solid ${e.id === activeHeading ? DOC.accent : 'transparent'}`,
                color: e.id === activeHeading ? DOC.accent : DOC.textBody,
                font: `${e.id === activeHeading ? 600 : 400} 12.5px ${TYPE.body}`,
                letterSpacing: '-0.003em',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'color 120ms ease, border-color 120ms ease',
              }}
            >
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
};
