// Centre column for the /docs route. Renders a doc page's {title, body}
// inside a max-width reading column, with shared H1/H2/H3/P/UL primitives
// each page imports from this file. Headings get id'd anchors so the
// right-rail <OnThisPage/> table-of-contents can scroll to them.

import type { CSSProperties, ReactNode } from 'react';
import { DOC, TYPE } from './theme';
import type { DocPage } from './pages/registry';

// ─── shared building blocks every page uses ────────────────────────────

export const H1 = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    margin: '0 0 16px 0',
    font: `700 42px/1.05 ${TYPE.display}`,
    letterSpacing: TYPE.trackTighter,
    color: DOC.textPrimary,
  };
  return <h1 style={style}>{children}</h1>;
};

export const Lede = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    font: `400 18px/1.55 ${TYPE.body}`,
    color: DOC.textSecondary,
    margin: '0 0 28px 0',
    letterSpacing: '-0.005em',
    maxWidth: 640,
  };
  return <p style={style}>{children}</p>;
};

// Make a deterministic slug from a heading's children. Stable so the
// right-rail TOC can target it via getElementById.
export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const headingShared: CSSProperties = {
  position: 'relative',
  color: DOC.textPrimary,
  scrollMarginTop: 88, // account for any sticky chrome on jump
};

export const H2 = ({ children, id }: { children: string; id?: string }) => {
  const slug = id ?? slugify(children);
  const style: CSSProperties = {
    ...headingShared,
    margin: '44px 0 14px 0',
    font: `700 26px/1.2 ${TYPE.display}`,
    letterSpacing: TYPE.trackTight,
    paddingTop: 8,
    borderTop: `1px solid ${DOC.border}`,
  };
  return <h2 id={slug} data-toc="h2" style={style}>{children}<AnchorLink slug={slug} /></h2>;
};

export const H3 = ({ children, id }: { children: string; id?: string }) => {
  const slug = id ?? slugify(children);
  const style: CSSProperties = {
    ...headingShared,
    margin: '28px 0 8px 0',
    font: `600 17.5px/1.3 ${TYPE.display}`,
    letterSpacing: TYPE.trackTight,
  };
  return <h3 id={slug} data-toc="h3" style={style}>{children}<AnchorLink slug={slug} /></h3>;
};

const AnchorLink = ({ slug }: { slug: string }) => (
  <a
    href={`#${slug}`}
    aria-label={`Permalink to ${slug}`}
    onClick={(e) => {
      // Don't rebuild the page hash — that's the active-doc selector.
      // Push a sub-anchor by appending after a slash. We use the
      // browser's native scroll-into-view for the actual jump.
      e.preventDefault();
      const el = document.getElementById(slug);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }}
    style={{
      opacity: 0,
      marginLeft: 8,
      color: DOC.accent,
      textDecoration: 'none',
      font: `500 0.7em ${TYPE.bodyMono}`,
      verticalAlign: 'middle',
      transition: 'opacity 120ms ease',
    }}
    className="doc-anchor"
  >
    #
  </a>
);

export const P = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    font: `400 16px/1.75 ${TYPE.body}`,
    color: DOC.textBody,
    margin: '0 0 16px 0',
    letterSpacing: '-0.003em',
  };
  return <p style={style}>{children}</p>;
};

export const UL = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    margin: '0 0 18px 0',
    paddingLeft: 22,
    font: `400 15.5px/1.7 ${TYPE.body}`,
    color: DOC.textBody,
  };
  return <ul style={style}>{children}</ul>;
};

export const OL = ({ children }: { children: ReactNode }) => {
  const style: CSSProperties = {
    margin: '0 0 18px 0',
    paddingLeft: 22,
    font: `400 15.5px/1.7 ${TYPE.body}`,
    color: DOC.textBody,
  };
  return <ol style={style}>{children}</ol>;
};

export const LI = ({ children }: { children: ReactNode }) => (
  <li style={{ margin: '6px 0' }}>{children}</li>
);

export const Em = ({ children }: { children: ReactNode }) => (
  <em style={{ fontStyle: 'italic', color: DOC.textSecondary }}>{children}</em>
);

export const Strong = ({ children }: { children: ReactNode }) => (
  <strong style={{ color: DOC.textPrimary, fontWeight: 600 }}>{children}</strong>
);

export const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    target={href.startsWith('http') ? '_blank' : undefined}
    rel={href.startsWith('http') ? 'noreferrer noopener' : undefined}
    style={{
      color: DOC.accent,
      textDecoration: 'underline',
      textDecorationColor: DOC.accentLine,
      textUnderlineOffset: 3,
    }}
  >
    {children}
  </a>
);

// Subtle gold-bordered "note" / "caveat" box, used sparingly.
export const Callout = ({
  kind = 'note',
  children,
}: {
  kind?: 'note' | 'warn';
  children: ReactNode;
}) => {
  const accent = kind === 'warn' ? '#e07b5b' : DOC.accent;
  const style: CSSProperties = {
    margin: '20px 0',
    padding: '14px 16px',
    background: 'rgba(252, 180, 39, 0.04)',
    border: `1px solid ${DOC.border}`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: 6,
    font: `400 14.5px/1.6 ${TYPE.body}`,
    color: DOC.textBody,
  };
  const label: CSSProperties = {
    display: 'block',
    font: `700 10px ${TYPE.bodyMono}`,
    letterSpacing: TYPE.trackEyebrow,
    textTransform: 'uppercase',
    color: accent,
    marginBottom: 6,
  };
  return (
    <aside style={style}>
      <span style={label}>{kind === 'warn' ? 'caveat' : 'note'}</span>
      {children}
    </aside>
  );
};

// 2-column key/value table for shortcut lists and blend formulas.
export type TableRow = { key: ReactNode; value: ReactNode };
export const KvTable = ({
  rows,
  headers = ['key', 'meaning'],
}: {
  rows: TableRow[];
  headers?: [string, string];
}) => {
  const tbl: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '18px 0',
    font: `14.5px/1.55 ${TYPE.body}`,
  };
  const th: CSSProperties = {
    textAlign: 'left',
    padding: '8px 14px',
    font: `600 10px ${TYPE.bodyMono}`,
    letterSpacing: TYPE.trackEyebrow,
    color: DOC.textFaint,
    textTransform: 'uppercase',
    borderBottom: `1px solid ${DOC.borderStrong}`,
  };
  const td: CSSProperties = {
    padding: '11px 14px',
    borderBottom: `1px solid ${DOC.border}`,
    color: DOC.textBody,
    verticalAlign: 'top',
  };
  const tdKey: CSSProperties = {
    ...td,
    font: `500 13px ${TYPE.bodyMono}`,
    color: DOC.textPrimary,
    whiteSpace: 'nowrap',
    width: '34%',
  };
  return (
    <table style={tbl}>
      <thead>
        <tr>
          <th style={th}>{headers[0]}</th>
          <th style={th}>{headers[1]}</th>
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

// ─── the outer container that wraps a DocPage's body ───────────────────

export const PageContent = ({ page }: { page: DocPage }) => {
  const main: CSSProperties = {
    minWidth: 0,
    padding: 'clamp(28px, 6vw, 56px) clamp(18px, 5vw, 56px) clamp(64px, 12vw, 96px)',
    maxWidth: 760,
    width: '100%',
    boxSizing: 'border-box',
  };
  const eyebrow: CSSProperties = {
    font: `600 11px ${TYPE.bodyMono}`,
    letterSpacing: TYPE.trackEyebrow,
    color: DOC.accentDeep,
    textTransform: 'uppercase',
    marginBottom: 10,
  };
  return (
    <article style={main} data-doc-id={page.id}>
      <div style={eyebrow}>{page.groupLabel}</div>
      <H1>{page.title}</H1>
      {page.lede ? <Lede>{page.lede}</Lede> : null}
      {page.body}
    </article>
  );
};
