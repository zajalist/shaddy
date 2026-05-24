// CodeSnippet — small dark code block used throughout the Library encyclopedia.
//
// For GLSL we delegate to <GlslHighlight/> from @/design/GlslHighlight so the
// snippets read with the same colour roles as the composer's code drawer.
// For everything else (TS pseudo-code, ASCII diagrams, plain math) we render
// a flat cream-on-charcoal <pre>. Cosmetic only — no live execution.
//
// Visual: dark warm-charcoal SHADE.surface4 background, cream text, chunky
// 1.5px ink outline + a 3px drop shadow to match the rest of the page's
// hand-drawn block language.

import type { CSSProperties } from 'react';
import { SHADE, TYPE } from '../../tokens';
import { GlslHighlight } from '../../GlslHighlight';

export type CodeSnippetLang = 'glsl' | 'ts' | 'text' | 'math';

export type CodeSnippetProps = {
  source: string;
  lang?: CodeSnippetLang;
  /** Optional tiny caption shown below the block (e.g. "iq's smin"). */
  caption?: string;
};

export const CodeSnippet = ({ source, lang = 'text', caption }: CodeSnippetProps) => {
  const wrap: CSSProperties = {
    position: 'relative',
    background: SHADE.surface4,
    border: `1.5px solid ${SHADE.inkLine}`,
    borderRadius: 8,
    boxShadow: `0 3px 0 ${SHADE.inkLine}`,
    padding: '14px 16px 14px 16px',
    margin: '18px 0',
    overflowX: 'auto',
  };
  const pre: CSSProperties = {
    margin: 0,
    font: `13px/1.6 ${TYPE.bodyMono}`,
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
  const cap: CSSProperties = {
    margin: '6px 2px 0',
    font: `500 11.5px ${TYPE.bodyMono}`,
    letterSpacing: '0.04em',
    color: SHADE.textFaint,
  };

  return (
    <figure style={{ margin: '18px 0' }}>
      <div style={wrap}>
        <span style={tag}>{lang}</span>
        <pre style={pre}>
          {lang === 'glsl' ? <GlslHighlight source={source} /> : source}
        </pre>
      </div>
      {caption && <figcaption style={cap}>{caption}</figcaption>}
    </figure>
  );
};

export default CodeSnippet;
