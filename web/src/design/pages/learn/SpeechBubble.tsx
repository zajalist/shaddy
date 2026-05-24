// Chunky cream speech bubble with a tail pointing at the mascot.
//
// Renders Bricolage Grotesque text inside a rounded panel with the same
// hand-drawn 1.5px ink outline used elsewhere in the design system. The tail
// is a single triangle that sticks off whichever edge the caller asks for.

import type { CSSProperties, ReactNode } from 'react';

import { SHADE, TYPE } from '../../tokens';

export type SpeechBubbleProps = {
  children: ReactNode;
  /** Which side the tail sticks out of. Defaults to 'top' so the bubble
   *  reads as "spoken from above" — the mascot is above it. */
  tail?: 'top' | 'left' | 'bottom' | 'right' | 'none';
  /** Visual emphasis — used for cheer/sad reactions. */
  tone?: 'neutral' | 'good' | 'bad' | 'hint';
  style?: CSSProperties;
};

export const SpeechBubble = ({ children, tail = 'top', tone = 'neutral', style }: SpeechBubbleProps) => {
  const toneAccent: Record<NonNullable<SpeechBubbleProps['tone']>, string> = {
    neutral: SHADE.cream,
    good:    '#D8EAB6', // mint cream
    bad:     '#F2C9B6', // peach cream
    hint:    '#F3E2B5', // warm cream
  };
  const fill = toneAccent[tone];

  return (
    <div
      style={{
        position: 'relative',
        background: fill,
        border: `1.5px solid ${SHADE.inkLine}`,
        borderRadius: 14,
        padding: '14px 18px',
        boxShadow: `0 3px 0 ${SHADE.inkLine}`,
        font: `500 16px/1.45 ${TYPE.body}`,
        letterSpacing: TYPE.trackTight,
        color: SHADE.text,
        ...style,
      }}
    >
      {children}
      {tail !== 'none' && <Tail side={tail} fill={fill} />}
    </div>
  );
};

const Tail = ({ side, fill }: { side: 'top' | 'left' | 'bottom' | 'right'; fill: string }) => {
  // The tail is two overlapping triangles — the outer one is the ink-line
  // colour (slightly larger), the inner one is the fill — so the silhouette
  // reads as a single continuous outline with the bubble body.
  const size = 14;
  const inkSize = size + 3;

  // Anchored ~25% from the bubble's nearest edge so the tail isn't dead
  // centre — feels more comic-book.
  const offset = '25%';

  const common: CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    pointerEvents: 'none',
  };

  if (side === 'top') {
    return (
      <>
        <div
          style={{
            ...common,
            top: -inkSize,
            left: offset,
            borderLeft: `${inkSize}px solid transparent`,
            borderRight: `${inkSize}px solid transparent`,
            borderBottom: `${inkSize}px solid ${SHADE.inkLine}`,
          }}
        />
        <div
          style={{
            ...common,
            top: -size + 1,
            left: `calc(${offset} + 3px)`,
            borderLeft: `${size}px solid transparent`,
            borderRight: `${size}px solid transparent`,
            borderBottom: `${size}px solid ${fill}`,
          }}
        />
      </>
    );
  }

  if (side === 'bottom') {
    return (
      <>
        <div
          style={{
            ...common,
            bottom: -inkSize,
            left: offset,
            borderLeft: `${inkSize}px solid transparent`,
            borderRight: `${inkSize}px solid transparent`,
            borderTop: `${inkSize}px solid ${SHADE.inkLine}`,
          }}
        />
        <div
          style={{
            ...common,
            bottom: -size + 1,
            left: `calc(${offset} + 3px)`,
            borderLeft: `${size}px solid transparent`,
            borderRight: `${size}px solid transparent`,
            borderTop: `${size}px solid ${fill}`,
          }}
        />
      </>
    );
  }

  if (side === 'left') {
    return (
      <>
        <div
          style={{
            ...common,
            top: offset,
            left: -inkSize,
            borderTop: `${inkSize}px solid transparent`,
            borderBottom: `${inkSize}px solid transparent`,
            borderRight: `${inkSize}px solid ${SHADE.inkLine}`,
          }}
        />
        <div
          style={{
            ...common,
            top: `calc(${offset} + 3px)`,
            left: -size + 1,
            borderTop: `${size}px solid transparent`,
            borderBottom: `${size}px solid transparent`,
            borderRight: `${size}px solid ${fill}`,
          }}
        />
      </>
    );
  }

  // right
  return (
    <>
      <div
        style={{
          ...common,
          top: offset,
          right: -inkSize,
          borderTop: `${inkSize}px solid transparent`,
          borderBottom: `${inkSize}px solid transparent`,
          borderLeft: `${inkSize}px solid ${SHADE.inkLine}`,
        }}
      />
      <div
        style={{
          ...common,
          top: `calc(${offset} + 3px)`,
          right: -size + 1,
          borderTop: `${size}px solid transparent`,
          borderBottom: `${size}px solid transparent`,
          borderLeft: `${size}px solid ${fill}`,
        }}
      />
    </>
  );
};
