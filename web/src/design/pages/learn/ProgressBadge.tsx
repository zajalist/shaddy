// Single source of truth for the "N of 8 lessons complete" indicator.
//
// Two variants:
//   - 'bar'    — a flat fill bar (gold on surface3, 1.5px inkLine border) with
//                the label beside it. Used in the hero.
//   - 'inline' — label only, no bar. Used in the workspace rail.
//
// Flat by directive: NO box-shadow, no glow. The bar communicates progress via
// a solid fill width only.

import type { CSSProperties } from 'react';

import { SHADE, TYPE } from '../../tokens';

export type ProgressBadgeProps = {
  done: number;
  total: number;
  variant?: 'bar' | 'inline';
};

export function progressCopy(done: number, total: number): string {
  if (total > 0 && done >= total) return `All ${total} done — replay any time`;
  return `${done} of ${total} lessons complete`;
}

export const ProgressBadge = ({ done, total, variant = 'bar' }: ProgressBadgeProps) => {
  const label = progressCopy(done, total);
  const pct = Math.round((done / Math.max(1, total)) * 100);

  if (variant === 'inline') {
    return (
      <span style={inlineLabelStyle} role="status" aria-label={label}>
        {label}
      </span>
    );
  }

  return (
    <div style={barWrapStyle} role="status" aria-label={label}>
      <div style={barTrackStyle} aria-hidden>
        <div style={{ ...barFillStyle, width: `${pct}%` }} />
      </div>
      <span style={barLabelStyle}>{label}</span>
    </div>
  );
};

// ─── styles (flat: no box-shadow) ───────────────────────────────────────────

const inlineLabelStyle: CSSProperties = {
  font: `700 11px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackEyebrow,
  textTransform: 'uppercase',
  color: SHADE.textDim,
};

const barWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 220,
};

const barTrackStyle: CSSProperties = {
  position: 'relative',
  height: 12,
  background: SHADE.surface3,
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 999,
  overflow: 'hidden',
};

const barFillStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  background: SHADE.gold,
  transition: 'width 320ms cubic-bezier(0.2, 1.0, 0.3, 1)',
};

const barLabelStyle: CSSProperties = {
  font: `700 11px/1 ${TYPE.body}`,
  letterSpacing: TYPE.trackEyebrow,
  textTransform: 'uppercase',
  color: SHADE.textDim,
};
