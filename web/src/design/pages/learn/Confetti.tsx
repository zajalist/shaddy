// Flat completion burst — six-plus radial rays + nothing flashy.
//
// Re-keyed by the parent (`key={confettiKey}`) so a new pass remounts the
// component and replays the animation. Mounted ONCE at the workspace level
// inside a dedicated `position: relative` stage wrapper (not nested in the
// mascot's own layout), so the remount always plays.
//
// Reduced motion: when `prefers-reduced-motion: reduce` matches, render
// nothing — the mascot's mood swap to "cheering" is the celebration. The
// `learnConfetti` keyframe is mounted by useLearnChrome (token-free).

import { useMemo } from 'react';

import { SHADE } from '../../tokens';

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const Confetti = () => {
  // Deterministic ray angles per mount (we re-key to retrigger).
  const rays = useMemo(
    () => [0, 60, 120, 180, 240, 300, 30, 90, 150, 210, 270, 330],
    [],
  );

  // Silent under reduced motion — no animation at all.
  if (prefersReducedMotion()) return null;

  return (
    <div
      aria-hidden
      data-testid="learn-confetti"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 220,
        height: 220,
        pointerEvents: 'none',
        animation: 'learnConfetti 700ms cubic-bezier(0.2, 1.4, 0.4, 1) forwards',
      }}
    >
      <svg width="220" height="220" viewBox="-110 -110 220 220">
        {rays.map((a, i) => {
          const rad = (a * Math.PI) / 180;
          const r1 = 60;
          const r2 = 100;
          const x1 = Math.cos(rad) * r1;
          const y1 = Math.sin(rad) * r1;
          const x2 = Math.cos(rad) * r2;
          const y2 = Math.sin(rad) * r2;
          const color = i % 2 === 0 ? SHADE.gold : SHADE.ember;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </div>
  );
};
