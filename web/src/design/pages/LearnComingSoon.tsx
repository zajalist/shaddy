// /learn — closed-access placeholder.
//
// The interactive Learn course is not part of the current public release.
// Rather than ship a half-finished lesson flow, the route renders this
// calm, on-brand "in progress" screen featuring the mascot. The full Learn
// implementation still lives in ./Learn.tsx for when it reopens.

import { useEffect } from 'react';

import { SHADE, TYPE } from '../tokens';
import { Mascot } from '@/ux/Mascot';

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
    document.body.style.background = SHADE.surface2;
    document.body.style.color = SHADE.text;
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
  }, []);
};

export function LearnComingSoon() {
  useChrome();
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 4,
        padding: '48px 24px',
        background: `linear-gradient(180deg, ${SHADE.surface2} 0%, ${SHADE.bg} 100%)`,
      }}
    >
      <a
        href="/"
        aria-label="Shaddy home"
        style={{ position: 'fixed', top: 22, left: 24, display: 'flex', alignItems: 'center' }}
      >
        <img src="/mascot.svg" alt="Shaddy" style={{ height: 30, width: 'auto', display: 'block' }} />
      </a>

      <Mascot mood="thinking" size={150} ariaLabel="Shaddy is still building this" />

      <div
        style={{
          font: `600 11px ${TYPE.bodyMono}`,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: SHADE.ember,
          marginTop: 18,
        }}
      >
        Learn · in progress
      </div>

      <h1
        style={{
          margin: '6px 0 0',
          font: `700 clamp(30px, 6vw, 46px) ${TYPE.display ?? TYPE.body}`,
          letterSpacing: TYPE.trackTighter,
          color: SHADE.text,
          maxWidth: 620,
          lineHeight: 1.05,
        }}
      >
        The lessons aren&apos;t open just yet.
      </h1>

      <p
        style={{
          margin: '14px 0 0',
          maxWidth: 480,
          font: `500 15.5px ${TYPE.body}`,
          color: SHADE.textDim,
          lineHeight: 1.6,
        }}
      >
        Shaddy&apos;s guided shader course is being polished for launch. In the
        meantime, you can read the Library and start building in the composer —
        that&apos;s the best place to learn by doing.
      </p>

      <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a
          href="/design"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 20px', borderRadius: 7,
            background: `linear-gradient(180deg, ${SHADE.gold} 0%, ${SHADE.goldDeep} 100%)`,
            border: `1px solid ${SHADE.goldDeep}`,
            color: '#1a1208', textDecoration: 'none',
            font: `700 13px ${TYPE.body}`, letterSpacing: '0.01em',
          }}
        >
          Open the composer
        </a>
        <a
          href="/library"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 20px', borderRadius: 7,
            background: 'transparent',
            border: `1px solid ${SHADE.inkLine}`,
            color: SHADE.text, textDecoration: 'none',
            font: `600 13px ${TYPE.body}`, letterSpacing: '0.01em',
          }}
        >
          Read the Library
        </a>
      </div>
    </div>
  );
}

export default LearnComingSoon;
