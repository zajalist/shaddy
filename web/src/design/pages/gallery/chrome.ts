// Shared gallery chrome — font loader, keyframes, body background. Used by
// the gallery grid, the detail page, and author profiles so all three share
// one visual shell. Extracted from Gallery.tsx (spec 03).

import { useEffect } from 'react';
import { SHADE } from '../../tokens';

const FONT_LINK_ID = 'shade-design-fonts';
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Geist+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap';
const KEYFRAMES_ID = 'shade-gallery-keyframes';

export const useGalleryChrome = () => {
  useEffect(() => {
    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      link.href = FONTS_HREF;
      document.head.appendChild(link);
    }
    if (!document.getElementById(KEYFRAMES_ID)) {
      const style = document.createElement('style');
      style.id = KEYFRAMES_ID;
      // Flat & minimal — a subtle lift on hover, a flat ink shadow (no glow/halo).
      style.textContent = `
        @keyframes galFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gal-tile {
          transition: transform 180ms cubic-bezier(0.2, 1.2, 0.4, 1),
                      box-shadow 180ms cubic-bezier(0.2, 1.2, 0.4, 1);
        }
        .gal-tile:hover { transform: translateY(-4px); box-shadow: 0 10px 0 ${SHADE.inkLine}; }
        .gal-tile .gal-thumb { transform: scale(1); transition: transform 380ms cubic-bezier(0.2, 1, 0.4, 1); }
        .gal-tile:hover .gal-thumb { transform: scale(1.04); }
        .gal-chip {
          transition: transform 120ms ease, box-shadow 120ms ease, background 160ms ease, color 160ms ease;
        }
        .gal-chip:hover:not([data-active="true"]) { background: ${SHADE.surface3}; }
        .gal-cta { transition: transform 120ms ease, box-shadow 120ms ease, background 160ms ease; }
        .gal-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 0 ${SHADE.inkLine}; }
        .gal-cta:active { transform: translateY(1px); box-shadow: 0 1px 0 ${SHADE.inkLine}; }
        .gal-back { transition: background 160ms ease; }
        .gal-back:hover { background: ${SHADE.surface3}; }
      `;
      document.head.appendChild(style);
    }
    const prev = {
      bg: document.body.style.background,
      color: document.body.style.color,
      ox: document.body.style.overflowX,
      hox: document.documentElement.style.overflowX,
    };
    document.body.style.background = SHADE.bg;
    document.body.style.color = SHADE.text;
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    return () => {
      document.body.style.background = prev.bg;
      document.body.style.color = prev.color;
      document.body.style.overflowX = prev.ox;
      document.documentElement.style.overflowX = prev.hox;
    };
  }, []);
};
