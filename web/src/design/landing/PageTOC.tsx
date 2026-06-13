import { useEffect, useState } from 'react';
import { SHADE, TYPE } from '../tokens';
import { useIsMobile } from '../useIsMobile';

export const TOC = [
  { id: 'top', label: 'Shaddy' },
  { id: 'how', label: 'How it works' },
  { id: 'templates', label: 'Templates' },
  { id: 'compose', label: 'Compose' },
  { id: 'code', label: 'Code' },
  { id: 'stats', label: 'Built for the web' },
  { id: 'faq', label: 'FAQ' },
];

export const PageTOC = () => {
  const [active, setActive] = useState('top');
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile(1024); // hide below desktop — TOC needs wide gutter space

  useEffect(() => {
    if (isMobile) return;

    // Cache elements to avoid getElementById in the scroll handler
    let topEl = document.getElementById('top');
    const sections = new Map<string, HTMLElement>();
    const updateCache = () => {
      topEl = document.getElementById('top');
      TOC.forEach((t) => {
        const el = document.getElementById(t.id);
        if (el) sections.set(t.id, el);
      });
    };

    updateCache();

    const onScroll = () => {
      const heroH = topEl?.offsetHeight ?? 600;
      setVisible(window.scrollY > heroH * 0.45);
      const probe = window.scrollY + window.innerHeight * 0.4;
      let cur = TOC[0]!.id;
      for (const t of TOC) {
        const el = sections.get(t.id);
        if (el && el.offsetTop <= probe) cur = t.id;
      }
      setActive(cur);
    };

    const onResize = () => {
      updateCache();
      onScroll();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [isMobile]);

  if (isMobile) return null;
  return (
    <aside
      aria-label="Page sections"
      style={{
        position: 'fixed',
        left: 36,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        font: `500 12px ${TYPE.body}`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {TOC.map((t) => {
        const isActive = t.id === active;
        const isBrand = t.id === 'top';
        return (
          <a
            key={t.id}
            href={`#${t.id}`}
            style={{
              position: 'relative',
              color: isActive ? SHADE.cream : 'rgba(232,226,212,0.45)',
              textDecoration: 'none',
              padding: `2px 0 2px ${isActive ? 22 : 14}px`,
              transition: 'color 0.2s, padding-left 0.2s',
              lineHeight: 1.3,
              fontWeight: isBrand ? 600 : 500,
              fontSize: isBrand ? 13 : 12,
              marginBottom: isBrand ? 6 : 0,
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                width: isActive ? 14 : 6,
                height: 1,
                background: isActive ? SHADE.gold : 'currentColor',
                transform: 'translateY(-50%)',
                opacity: isActive ? 1 : 0.5,
                transition:
                  'width 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s, opacity 0.25s',
              }}
            />
            {t.label}
          </a>
        );
      })}
    </aside>
  );
};
