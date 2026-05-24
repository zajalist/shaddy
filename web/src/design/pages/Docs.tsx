// /docs — three-column technical documentation, dark theme.
//
// Layout:
//   ┌────────────┬───────────────────────────┬──────────────┐
//   │  Sidebar   │       Page content        │ On this page │
//   │  (sticky)  │       (centre, ~720)      │  (sticky)    │
//   └────────────┴───────────────────────────┴──────────────┘
//
// Navigation is hash-based — `/docs#concepts`, `/docs#3d-camera`, etc.
// No nested React Router routes; one route resolves to one page via the
// registry. This keeps the route table flat and means a user can save
// any page as a permalink without us inventing a path scheme.
//
// File ownership for this page (see SPEC §"File ownership"):
//   web/src/design/pages/Docs.tsx                — this file
//   web/src/design/pages/docs/Layout.tsx
//   web/src/design/pages/docs/Sidebar.tsx
//   web/src/design/pages/docs/PageContent.tsx
//   web/src/design/pages/docs/OnThisPage.tsx
//   web/src/design/pages/docs/CodeBlockDark.tsx
//   web/src/design/pages/docs/InlineCode.tsx
//   web/src/design/pages/docs/theme.ts
//   web/src/design/pages/docs/pages/registry.ts
//   web/src/design/pages/docs/pages/*.tsx        — content, one per page

import { useCallback, useEffect, useState } from 'react';

import { Layout } from './docs/Layout';
import { Sidebar } from './docs/Sidebar';
import { PageContent } from './docs/PageContent';
import { OnThisPage } from './docs/OnThisPage';
import { DOC, TYPE } from './docs/theme';
import { findPage, DEFAULT_PAGE_ID } from './docs/pages/registry';

// ─── chrome (fonts + body bg, same pattern as Landing/Library/Gallery) ─

const FONT_LINK_ID = 'shade-design-fonts';
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Geist+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap';
const CHROME_ID = 'shade-docs-chrome';

const useDocsChrome = () => {
  useEffect(() => {
    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      link.href = FONTS_HREF;
      document.head.appendChild(link);
    }
    if (!document.getElementById(CHROME_ID)) {
      const style = document.createElement('style');
      style.id = CHROME_ID;
      style.textContent = `
        .doc-anchor { opacity: 0; }
        h2:hover > .doc-anchor,
        h3:hover > .doc-anchor { opacity: 1; }
        .doc-nav-item:hover {
          background: ${DOC.surfaceRaised} !important;
          color: ${DOC.textPrimary} !important;
        }
        /* Subtle scrollbar styling for the dark theme. */
        nav::-webkit-scrollbar, aside::-webkit-scrollbar { width: 10px; }
        nav::-webkit-scrollbar-track, aside::-webkit-scrollbar-track { background: transparent; }
        nav::-webkit-scrollbar-thumb, aside::-webkit-scrollbar-thumb {
          background: ${DOC.border};
          border-radius: 5px;
        }
        nav::-webkit-scrollbar-thumb:hover, aside::-webkit-scrollbar-thumb:hover {
          background: ${DOC.borderStrong};
        }
        body { font-family: ${TYPE.body}; }
      `;
      document.head.appendChild(style);
    }
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    const prevOverflowX = document.body.style.overflowX;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    document.body.style.background = DOC.bg;
    document.body.style.color = DOC.textBody;
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
      document.body.style.overflowX = prevOverflowX;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
    };
  }, []);
};

// ─── hash routing ──────────────────────────────────────────────────────

// The hash is the page id, no leading slash. `/docs#concepts` → 'concepts'.
// Empty / missing falls back to DEFAULT_PAGE_ID.
function hashToPageId(): string {
  if (typeof window === 'undefined') return DEFAULT_PAGE_ID;
  const raw = window.location.hash.replace(/^#/, '').trim();
  return raw.length > 0 ? raw : DEFAULT_PAGE_ID;
}

// ─── page ──────────────────────────────────────────────────────────────

export const Docs = () => {
  useDocsChrome();
  const [pageId, setPageId] = useState<string>(() => hashToPageId());

  // Reflect back/forward and external hash edits into our state.
  useEffect(() => {
    const onHash = () => setPageId(hashToPageId());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Whenever the active page changes (via either sidebar click or hash
  // pop), scroll back to the top. Otherwise the previous page's scroll
  // position bleeds through into the new one.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pageId]);

  const go = useCallback((id: string) => {
    // Writing to window.location.hash also fires hashchange — single
    // source of truth lives in the hash, not in state.
    if (window.location.hash.replace(/^#/, '') === id) return;
    window.location.hash = id;
  }, []);

  const page = findPage(pageId);

  return (
    <Layout
      sidebar={<Sidebar activeId={page.id} onNavigate={go} />}
      content={<PageContent page={page} />}
      rightRail={<OnThisPage activeDocId={page.id} />}
    />
  );
};

export default Docs;
