// Small dark pill for inline `code` inside body copy. Matches the
// dark-theme `<CodeBlock>` so the two read as one family.

import type { CSSProperties, ReactNode } from 'react';
import { DOC, TYPE } from './theme';

export const InlineCode = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    font: `500 13px ${TYPE.bodyMono}`,
    background: DOC.inlineBg,
    border: `1px solid ${DOC.inlineBorder}`,
    color: DOC.textPrimary,
    padding: '1.5px 6px',
    borderRadius: 4,
    whiteSpace: 'nowrap',
    letterSpacing: '-0.005em',
  };
  return <code style={style}>{children}</code>;
};

// A tiny in-body emphasised keyword (used for words like "recipe", "card",
// "compiler" where italic alone is too quiet). Sand-coloured, not gold —
// gold is reserved for active state.
export const Term = ({ children }: { children: ReactNode }) => (
  <span style={{ color: DOC.textPrimary, fontWeight: 600 }}>{children}</span>
);
