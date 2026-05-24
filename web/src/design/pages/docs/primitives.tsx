// Shared content primitives for the Docs page sections — H2 anchors,
// paragraphs, inline code, tables, and small "field-list" rows that recur
// across most sections. Keeps each section file readable + visually
// consistent without dragging in a markdown processor.

import type { CSSProperties, ReactNode } from 'react';
import { SHADE, TYPE } from '@/design/tokens';

export type SectionId =
  | 'recipe'
  | 'paramdef'
  | 'carddef'
  | 'compiler'
  | 'helpers'
  | 'blending'
  | 'camera'
  | 'oauth'
  | 'ai'
  | 'shortcuts';

export type SectionMeta = {
  id: SectionId;
  number: number;
  title: string;
  /** Short eyebrow shown above the H2 in the body and used as the TOC
   *  secondary line. */
  kicker: string;
};

export const SECTIONS: readonly SectionMeta[] = [
  { id: 'recipe',    number: 1,  title: 'The Recipe model',     kicker: 'data model' },
  { id: 'paramdef',  number: 2,  title: 'ParamDef kinds',       kicker: 'parameter schema' },
  { id: 'carddef',   number: 3,  title: 'Card definition',      kicker: 'CardDef contract' },
  { id: 'compiler',  number: 4,  title: 'The compiler',         kicker: '2D + 3D code paths' },
  { id: 'helpers',   number: 5,  title: 'GLSL helpers',         kicker: 'reusable functions' },
  { id: 'blending',  number: 6,  title: 'Blending + alpha',     kicker: 'composition' },
  { id: 'camera',    number: 7,  title: '3D camera',            kicker: 'raymarch viewport' },
  { id: 'oauth',     number: 8,  title: 'OAuth integration',    kicker: 'sign-in via OIDC' },
  { id: 'ai',        number: 9,  title: 'AI integration',       kicker: 'Ask Claude pipeline' },
  { id: 'shortcuts', number: 10, title: 'Keyboard shortcuts',   kicker: 'editor bindings' },
] as const;

// ── H2 anchor ──────────────────────────────────────────────────────────
export const SectionHeader = ({ meta }: { meta: SectionMeta }) => {
  const eyebrow: CSSProperties = {
    font: `600 11px ${TYPE.bodyMono}`,
    letterSpacing: TYPE.trackEyebrow,
    textTransform: 'uppercase',
    color: SHADE.goldDeep,
    marginBottom: 6,
  };
  const h2: CSSProperties = {
    margin: 0,
    font: `600 30px/1.15 ${TYPE.display}`,
    letterSpacing: TYPE.trackTighter,
    color: SHADE.text,
  };
  const num: CSSProperties = {
    color: SHADE.textFaint,
    marginRight: 14,
    font: `500 24px ${TYPE.bodyMono}`,
    letterSpacing: TYPE.trackTight,
    verticalAlign: 'baseline',
  };
  return (
    <header style={{ marginTop: 8, marginBottom: 18 }}>
      <div style={eyebrow}>§{meta.number} · {meta.kicker}</div>
      <h2 id={meta.id} style={h2}>
        <span style={num}>{String(meta.number).padStart(2, '0')}</span>
        {meta.title}
      </h2>
    </header>
  );
};

// ── Body text ──────────────────────────────────────────────────────────
export const P = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    font: `400 15.5px/1.65 ${TYPE.body}`,
    color: SHADE.text,
    margin: '0 0 14px 0',
  };
  return <p style={style}>{children}</p>;
};

export const Em = ({ children }: { children: ReactNode }) => (
  <em style={{ fontStyle: 'italic', color: SHADE.textDim }}>{children}</em>
);

// ── Inline code ────────────────────────────────────────────────────────
export const Code = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    font: `500 13.5px ${TYPE.bodyMono}`,
    background: 'rgba(43, 42, 37, 0.08)',
    border: `1px solid ${SHADE.border}`,
    color: SHADE.text,
    padding: '1px 6px',
    borderRadius: 3,
    whiteSpace: 'nowrap',
  };
  return <code style={style}>{children}</code>;
};

// ── Mini section subheading ────────────────────────────────────────────
export const H3 = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    font: `600 16.5px ${TYPE.display}`,
    letterSpacing: TYPE.trackTight,
    color: SHADE.text,
    margin: '20px 0 8px 0',
  };
  return <h3 style={style}>{children}</h3>;
};

// ── Field row — used by ParamDef, CardDef field reference, etc. ────────
export type FieldRowProps = {
  name: string;
  type?: string;
  children: ReactNode;
};

export const FieldRow = ({ name, type, children }: FieldRowProps) => {
  const wrap: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '180px 1fr',
    gap: 12,
    padding: '10px 0',
    borderTop: `1px solid ${SHADE.border}`,
    alignItems: 'baseline',
  };
  const left: CSSProperties = {
    font: `600 13.5px ${TYPE.bodyMono}`,
    color: SHADE.text,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };
  const tag: CSSProperties = {
    font: `400 10.5px ${TYPE.bodyMono}`,
    color: SHADE.textFaint,
    letterSpacing: TYPE.trackTight,
  };
  const right: CSSProperties = {
    font: `400 14px/1.55 ${TYPE.body}`,
    color: SHADE.textDim,
  };
  return (
    <div style={wrap}>
      <div style={left}>
        <span>{name}</span>
        {type ? <span style={tag}>{type}</span> : null}
      </div>
      <div style={right}>{children}</div>
    </div>
  );
};

// ── Two-column key-value table (shortcuts, blend formulas, ...) ────────
export type KvTableRow = { key: ReactNode; value: ReactNode };

export const KvTable = ({ rows }: { rows: KvTableRow[] }) => {
  const wrap: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '12px 0',
    font: `14px/1.5 ${TYPE.body}`,
  };
  const th: CSSProperties = {
    textAlign: 'left',
    padding: '8px 12px',
    font: `600 10.5px ${TYPE.bodyMono}`,
    letterSpacing: TYPE.trackEyebrow,
    color: SHADE.textFaint,
    textTransform: 'uppercase',
    borderBottom: `1.5px solid ${SHADE.inkLine}`,
  };
  const td: CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${SHADE.border}`,
    color: SHADE.textDim,
    verticalAlign: 'top',
  };
  const tdKey: CSSProperties = {
    ...td,
    font: `500 13px ${TYPE.bodyMono}`,
    color: SHADE.text,
    whiteSpace: 'nowrap',
    width: '34%',
  };
  return (
    <table style={wrap}>
      <thead>
        <tr>
          <th style={th}>key</th>
          <th style={th}>action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={tdKey}>{r.key}</td>
            <td style={td}>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ── Unordered list — uses ink-line bullet to feel hand-drawn ───────────
export const UL = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    margin: '0 0 14px 0',
    paddingLeft: 22,
    font: `400 15px/1.65 ${TYPE.body}`,
    color: SHADE.text,
  };
  return <ul style={style}>{children}</ul>;
};

export const LI = ({ children }: { children: ReactNode }) => (
  <li style={{ margin: '4px 0' }}>{children}</li>
);

// ── Callout — used sparingly for "gotcha" boxes ────────────────────────
export const Callout = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    margin: '16px 0',
    padding: '12px 14px',
    background: SHADE.cream,
    border: `1px solid ${SHADE.gold}`,
    borderLeft: `4px solid ${SHADE.gold}`,
    borderRadius: 3,
    font: `400 14px/1.55 ${TYPE.body}`,
    color: SHADE.text,
  };
  return <aside style={style}>{children}</aside>;
};
