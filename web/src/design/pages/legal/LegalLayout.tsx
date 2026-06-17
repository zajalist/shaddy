// Shared chrome for the legal / informational pages (Privacy, Cookies,
// Terms, Contact). One narrow, readable prose column on the dark site
// background, with the marketing SiteNav on top and a quiet "last updated"
// stamp. Content is passed as children; the small typed prose primitives
// below keep each page terse and consistent.

import { useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { SHADE, TYPE } from '../../tokens';
import { SiteNav, ScrollToTop } from '../../SiteNav';

const FONT_LINK_ID = 'shade-design-fonts';
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Geist+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap';

const useChrome = () => {
  useEffect(() => {
    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      link.href = FONTS_HREF;
      document.head.appendChild(link);
    }
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = SHADE.bg;
    document.body.style.color = SHADE.text;
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
  }, []);
};

export const LegalLayout = ({
  eyebrow, title, updated, children,
}: { eyebrow: string; title: string; updated: string; children: ReactNode }) => {
  useChrome();
  return (
    <div style={{ minHeight: '100vh', background: SHADE.bg, color: SHADE.text, fontFamily: TYPE.body, paddingTop: 60 }}>
      <SiteNav solid />
      <ScrollToTop />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(36px, 7vw, 64px) clamp(20px, 5vw, 32px) 96px' }}>
        <div style={{ font: `600 11px ${TYPE.bodyMono}`, letterSpacing: '0.22em', textTransform: 'uppercase', color: SHADE.ember }}>
          {eyebrow}
        </div>
        <h1 style={{ margin: '12px 0 8px', font: `700 clamp(30px, 6vw, 44px) ${TYPE.display ?? TYPE.body}`, letterSpacing: TYPE.trackTighter, color: SHADE.text, lineHeight: 1.05 }}>
          {title}
        </h1>
        <div style={{ font: `500 12.5px ${TYPE.bodyMono}`, color: SHADE.textFaint, marginBottom: 28 }}>
          Last updated {updated}
        </div>
        {children}
      </main>
    </div>
  );
};

const headingStyle: CSSProperties = {
  margin: '34px 0 10px', font: `700 19px ${TYPE.display ?? TYPE.body}`,
  letterSpacing: TYPE.trackTight, color: SHADE.text,
};
const proseStyle: CSSProperties = {
  margin: '0 0 14px', font: `400 15.5px ${TYPE.body}`,
  color: SHADE.textDim, lineHeight: 1.7,
};

export const H = ({ children }: { children: ReactNode }) => <h2 style={headingStyle}>{children}</h2>;
export const P = ({ children }: { children: ReactNode }) => <p style={proseStyle}>{children}</p>;
export const UL = ({ children }: { children: ReactNode }) => (
  <ul style={{ ...proseStyle, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</ul>
);
export const LI = ({ children }: { children: ReactNode }) => <li style={{ lineHeight: 1.6 }}>{children}</li>;
export const Mail = ({ addr }: { addr: string }) => (
  <a href={`mailto:${addr}`} style={{ color: SHADE.gold, textDecoration: 'none', fontWeight: 600 }}>{addr}</a>
);

export const CONTACT_EMAIL = 'zejbadr@gmail.com';
