// Presentational atoms shared across the gallery grid, detail page, and
// author profiles. Flat & minimal — no glow/halo. Extracted from Gallery.tsx.

import type { CSSProperties, ReactNode } from 'react';
import { SHADE, TYPE } from '../../tokens';
import type { GalleryMode } from '@/api';

export const Eyebrow = ({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) => (
  <span
    style={{
      fontFamily: TYPE.bodyMono,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: TYPE.trackEyebrow,
      textTransform: 'uppercase',
      color: color ?? SHADE.textDim,
      ...style,
    }}
  >
    {children}
  </span>
);

export const Chip = ({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  color?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="gal-chip"
    data-active={active}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 14px',
      borderRadius: 999,
      border: `1.5px solid ${active ? SHADE.inkLine : SHADE.border}`,
      background: active ? (color ?? SHADE.inkLine) : SHADE.surface1,
      color: active ? SHADE.cream : SHADE.text,
      cursor: 'pointer',
      fontFamily: TYPE.body,
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1,
      boxShadow: active ? `0 2px 0 ${SHADE.inkLine}` : 'none',
    }}
  >
    {label}
    {count !== undefined && (
      <span
        style={{
          fontFamily: TYPE.bodyMono,
          fontSize: 10,
          fontWeight: 600,
          opacity: 0.75,
          padding: '2px 6px',
          borderRadius: 6,
          background: active ? 'rgba(0,0,0,0.2)' : SHADE.surface3,
        }}
      >
        {count}
      </span>
    )}
  </button>
);

export const ModeBadge = ({ mode }: { mode: GalleryMode }) => {
  const color = mode === '3d' ? SHADE.catEffect : SHADE.catShape;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 7px',
        borderRadius: 4,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        color: SHADE.cream,
        fontFamily: TYPE.bodyMono,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        border: `1px solid ${color}`,
      }}
    >
      {/* flat dot — no glow box-shadow */}
      <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {mode.toUpperCase()}
    </span>
  );
};

export const ArrowGlyph = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const BackGlyph = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const HeartGlyph = ({ size = 16, filled = false }: { size?: number; filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);
