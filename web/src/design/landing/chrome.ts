import { useEffect, useState } from 'react';
import { SHADE, TYPE } from '../tokens';
import { FONTS_HREF, KEYFRAMES_ID, PAGE_BG } from './constants';

export const useLandingChrome = () => {
  useEffect(() => {
    if (!document.getElementById('shade-design-fonts')) {
      const link = document.createElement('link');
      link.id = 'shade-design-fonts';
      link.rel = 'stylesheet';
      link.href = FONTS_HREF;
      document.head.appendChild(link);
    }
    if (!document.getElementById(KEYFRAMES_ID)) {
      const style = document.createElement('style');
      style.id = KEYFRAMES_ID;
      style.textContent = `
        @keyframes shadeEmber {
          0%, 100% { opacity: 0; transform: scale(0.6); }
          8%, 14%  { opacity: 0.42; transform: scale(1); }
          22%      { opacity: 0; transform: scale(1.3); }
        }
        @keyframes shadeSpeck {
          0%   { transform: translate(0, 0);          opacity: 0; }
          10%  { opacity: 0.7; }
          50%  { transform: translate(20px, -50vh);   opacity: 0.7; }
          90%  { opacity: 0.4; }
          100% { transform: translate(-10px, -100vh); opacity: 0; }
        }
        @keyframes shadeFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shaddyDriftA {
          0%   { transform: translate(0, 0)        rotate(0deg);  }
          25%  { transform: translate(14px, -18px) rotate(2.5deg); }
          50%  { transform: translate(22px,  4px)  rotate(-1.5deg); }
          75%  { transform: translate(6px, -10px)  rotate(1.5deg); }
          100% { transform: translate(0, 0)        rotate(0deg);  }
        }
        @keyframes shaddyDriftB {
          0%   { transform: translate(0, 0)         rotate(0deg);  }
          33%  { transform: translate(-18px, -12px) rotate(-2deg); }
          66%  { transform: translate(8px, 14px)    rotate(2deg);  }
          100% { transform: translate(0, 0)         rotate(0deg);  }
        }
        @keyframes shaddyBubbleIn {
          from { opacity: 0; transform: scale(0.86) translateY(4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        /* Octocat hover — tilt + bob + a tiny blink. Pure CSS, no JS. */
        .oct-btn { transition: background 0.2s, border-color 0.2s; }
        .oct-svg {
          transform-origin: 50% 60%;
          transition: transform 0.35s cubic-bezier(0.2,1.4,0.4,1);
        }
        .oct-btn:hover .oct-svg {
          animation: octBob 0.9s ease-in-out infinite;
        }
        @keyframes octBob {
          0%   { transform: translateY(0)    rotate(-8deg) scale(1.04); }
          25%  { transform: translateY(-1.5px) rotate(6deg)  scale(1.06); }
          50%  { transform: translateY(0)    rotate(-4deg) scale(1.05); }
          75%  { transform: translateY(-1px)  rotate(8deg)  scale(1.06); }
          100% { transform: translateY(0)    rotate(-8deg) scale(1.04); }
        }
        .oct-eye { transform-origin: center; transform-box: fill-box; }
        .oct-btn:hover .oct-eye-l { animation: octBlinkL 1.8s ease-in-out infinite; }
        .oct-btn:hover .oct-eye-r { animation: octBlinkR 1.8s ease-in-out infinite; }
        @keyframes octBlinkL {
          0%, 42%, 50%, 100% { transform: scaleY(1); }
          46% { transform: scaleY(0.1); }
        }
        @keyframes octBlinkR {
          0%, 46%, 54%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.1); }
        }
        /* Composer icon — a tiny "snap" wiggle on hover */
        .comp-btn .comp-svg {
          transform-origin: 50% 60%;
          transition: transform 0.3s cubic-bezier(0.2,1.4,0.4,1);
        }
        .comp-btn:hover .comp-svg {
          animation: compSnap 0.7s ease-in-out infinite;
        }
        @keyframes compSnap {
          0%, 100% { transform: rotate(0deg)  scale(1); }
          25%      { transform: rotate(-4deg) scale(1.06); }
          50%      { transform: rotate(0deg)  scale(1.08); }
          75%      { transform: rotate(4deg)  scale(1.06); }
        }
        /* Tooltips for the nav icon buttons */
        .icon-tip { position: relative; }
        .icon-tip[data-tip]::after {
          content: attr(data-tip);
          position: absolute; top: calc(100% + 8px); left: 50%;
          transform: translateX(-50%) translateY(-4px);
          background: rgba(11,12,14,0.94);
          color: #FEE7C7;
          font: 600 10px "Geist Mono", ui-monospace, monospace;
          letter-spacing: 0.14em; text-transform: uppercase;
          padding: 5px 9px; border-radius: 3px;
          border: 1px solid rgba(252,180,39,0.35);
          white-space: nowrap;
          opacity: 0; pointer-events: none;
          transition: opacity 0.18s, transform 0.18s;
          z-index: 10;
        }
        .icon-tip[data-tip]:hover::after {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        /* Auth pills — subtle hover lift */
        .auth-pill { transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.18s; }
        .auth-pill:hover { transform: translateY(-1px); }

        /* Landing sign-in button refinement — flat dark pill to match nav */
        .landing-signin button {
          background: #1a1c1e !important;
          color: ${SHADE.topbarText} !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          box-shadow: none !important;
          border-radius: 6px !important;
          padding: 0 14px !important;
          height: 34px !important;
          font: 600 12px ${TYPE.body} !important;
        }
      `;
      document.head.appendChild(style);
    }
    const prev = document.body.style.background;
    const prevOverflowX = document.body.style.overflowX;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    document.body.style.background = PAGE_BG;
    // Kill any horizontal overflow on narrow viewports — every wide section
    // already shrinks on mobile, but stray box-shadows / nav widths can still
    // create a tiny horizontal scrollbar that wrecks the mobile feel.
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    return () => {
      document.body.style.background = prev;
      document.body.style.overflowX = prevOverflowX;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
    };
  }, []);
};

export const useNavScroll = () => {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY && y > 100);
      setScrolled(y > 80);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return { hidden, scrolled };
};
