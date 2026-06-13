// DiagramFrame — the cream ink-card <figure> + optional <figcaption> that
// wraps every diagram SVG. Was the old Diagram component's return + the
// `wrap`/`cap` style pair.

import type { CSSProperties, ReactNode } from 'react';
import { SHADE } from '../../../tokens';
import { inkCard, LIB_TYPE, BLOCK_GAP } from '../style';
import { DIA_FONT_MONO } from './shared';

const wrap: CSSProperties = inkCard({
  position: 'relative',
  padding: 14,
  margin: `${BLOCK_GAP}px 0`,
  display: 'block',
});

const cap: CSSProperties = {
  margin: '8px 2px 0',
  fontFamily: `"${DIA_FONT_MONO}", ui-monospace, monospace`,
  fontSize: LIB_TYPE.caption.fontSize,
  letterSpacing: LIB_TYPE.caption.letterSpacing,
  color: SHADE.textFaint,
};

export const DiagramFrame = ({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: string;
}) => (
  <figure style={{ margin: `${BLOCK_GAP}px 0` }}>
    <div style={wrap}>{children}</div>
    {caption && <figcaption style={cap}>{caption}</figcaption>}
  </figure>
);
