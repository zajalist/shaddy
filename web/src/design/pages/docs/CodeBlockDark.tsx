// Dark-theme code block for the /docs route — distinct from the warm
// /docs section primitives' CodeBlock which targets the existing light
// "section" reference. Includes a copy-to-clipboard button in the upper
// right and a small language tag. GLSL sources delegate to GlslHighlight
// so the syntax colours stay consistent with the editor; TS / JSON / text
// render flat in mono cream.

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { GlslHighlight } from '@/design/GlslHighlight';
import { DOC, TYPE } from './theme';

export type CodeBlockDarkProps = {
  source: string;
  language?: 'ts' | 'tsx' | 'json' | 'glsl' | 'bash' | 'text';
};

export const CodeBlockDark = ({ source, language = 'text' }: CodeBlockDarkProps) => {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    void navigator.clipboard.writeText(source).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      },
      () => {
        // Clipboard can fail in insecure contexts. Silently no-op — the
        // button reverts and the source is still selectable.
      },
    );
  };

  const wrap: CSSProperties = {
    position: 'relative',
    background: DOC.codeBg,
    border: `1px solid ${DOC.border}`,
    borderRadius: 8,
    padding: '18px 18px 16px 18px',
    margin: '20px 0',
    overflowX: 'auto',
  };
  const pre: CSSProperties = {
    margin: 0,
    font: `13px/1.6 ${TYPE.bodyMono}`,
    color: DOC.textBody,
    whiteSpace: 'pre',
    tabSize: 2,
  };
  const tag: CSSProperties = {
    position: 'absolute',
    top: 10,
    left: 14,
    font: `600 9.5px ${TYPE.bodyMono}`,
    letterSpacing: TYPE.trackEyebrow,
    color: DOC.textFaint,
    textTransform: 'uppercase',
    pointerEvents: 'none',
  };
  const copyBtn: CSSProperties = {
    position: 'absolute',
    top: 6,
    right: 6,
    font: `600 10.5px ${TYPE.bodyMono}`,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: copied ? DOC.accent : DOC.textSecondary,
    background: copied ? DOC.accentSoft : DOC.surfaceRaised,
    border: `1px solid ${copied ? DOC.accentLine : DOC.border}`,
    padding: '4px 9px',
    borderRadius: 5,
    cursor: 'pointer',
    transition: 'color 140ms ease, background 140ms ease, border-color 140ms ease',
  };
  // Pad the top of the pre when we have a language tag so it doesn't run
  // under the eyebrow.
  if (language) pre.paddingTop = 10;
  return (
    <div style={wrap}>
      <span style={tag}>{language}</span>
      <button type="button" onClick={onCopy} style={copyBtn} title="copy">
        {copied ? 'copied' : 'copy'}
      </button>
      <pre style={pre}>
        {language === 'glsl' ? <GlslHighlight source={source} /> : source}
      </pre>
    </div>
  );
};

// Re-export under the conventional name the spec used.
export { CodeBlockDark as CodeBlock };
export type { CodeBlockDarkProps as CodeBlockProps };

// Small ReactNode passthrough so call sites can compose mixed content
// (e.g. `<Pre><Highlighted/></Pre>`) without going through the source-only
// API above. Kept tiny on purpose.
export const Pre = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    margin: '20px 0',
    background: DOC.codeBg,
    border: `1px solid ${DOC.border}`,
    borderRadius: 8,
    padding: '14px 18px',
    font: `13px/1.6 ${TYPE.bodyMono}`,
    color: DOC.textBody,
    whiteSpace: 'pre',
    overflowX: 'auto',
  };
  return <pre style={style}>{children}</pre>;
};
