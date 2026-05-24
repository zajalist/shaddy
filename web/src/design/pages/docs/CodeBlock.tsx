// Flat-readable monospace block for non-GLSL snippets (TS, JSON, table-like
// formulas). Sits on the dark warm-charcoal surface so it visually pairs with
// the GlslHighlight component used elsewhere. No syntax colouring — just
// cream-on-charcoal Geist Mono with stable line wrapping.

import type { CSSProperties } from 'react';
import { SHADE, TYPE } from '@/design/tokens';

export type CodeBlockProps = {
  source: string;
  /** Free-form language tag rendered as a tiny eyebrow label in the upper
   *  right of the block. Cosmetic only — no actual highlighter switching. */
  language?: 'ts' | 'json' | 'glsl' | 'text';
};

export const CodeBlock = ({ source, language }: CodeBlockProps) => {
  const wrap: CSSProperties = {
    position: 'relative',
    background: SHADE.surface4,
    border: `1px solid ${SHADE.inkLine}`,
    borderRadius: 4,
    padding: '14px 16px 14px 16px',
    margin: '14px 0',
    overflowX: 'auto',
  };
  const pre: CSSProperties = {
    margin: 0,
    font: `13px/1.55 ${TYPE.bodyMono}`,
    color: SHADE.cream,
    whiteSpace: 'pre',
    tabSize: 2,
  };
  const tag: CSSProperties = {
    position: 'absolute',
    top: 6,
    right: 10,
    font: `600 9.5px ${TYPE.bodyMono}`,
    letterSpacing: TYPE.trackEyebrow,
    color: SHADE.topbarDim,
    textTransform: 'uppercase',
  };
  return (
    <div style={wrap}>
      {language ? <span style={tag}>{language}</span> : null}
      <pre style={pre}>{source}</pre>
    </div>
  );
};
