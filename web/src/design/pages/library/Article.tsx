// Article — section wrapper used by every encyclopedia entry on the
// Library page. Renders a top eyebrow with the group name, a chunky gold
// underline, the article heading, and the body content. Every article
// gets a stable DOM id (passed in as `id`) so the sticky TOC sidebar can
// scroll-into-view and IntersectionObserver can track the active section.

import type { CSSProperties, ReactNode } from 'react';
import { SHADE, TYPE } from '../../tokens';

export type ArticleProps = {
  id: string;
  /** Group label rendered as a tiny eyebrow above the title. */
  group: string;
  /** Group accent colour — gold by default. */
  groupColor?: string;
  title: string;
  children: ReactNode;
};

export const Article = ({ id, group, groupColor, title, children }: ArticleProps) => {
  const colour = groupColor ?? SHADE.gold;

  const wrap: CSSProperties = {
    padding: '36px 0 28px',
    borderBottom: `1.5px dashed ${SHADE.border}`,
    scrollMarginTop: 96,
  };
  const eyebrow: CSSProperties = {
    display: 'inline-block',
    fontFamily: TYPE.bodyMono,
    fontSize: 10.5,
    fontWeight: 600,
    color: colour,
    letterSpacing: TYPE.trackEyebrow,
    textTransform: 'uppercase',
    marginBottom: 8,
  };
  const underline: CSSProperties = {
    width: 64,
    height: 5,
    background: colour,
    border: `1.5px solid ${SHADE.inkLine}`,
    borderRadius: 3,
    boxShadow: `0 2px 0 ${SHADE.inkLine}`,
    marginTop: 6,
    marginBottom: 14,
  };
  const heading: CSSProperties = {
    margin: 0,
    fontFamily: TYPE.display,
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: TYPE.trackTight,
    color: SHADE.text,
    lineHeight: 1.1,
  };
  const body: CSSProperties = {
    marginTop: 14,
    fontFamily: TYPE.body,
    fontSize: 16,
    lineHeight: 1.7,
    letterSpacing: '-0.005em',
    color: SHADE.text,
  };

  return (
    <section id={id} data-article-id={id} style={wrap}>
      <span style={eyebrow}>{group}</span>
      <h2 style={heading}>{title}</h2>
      <div style={underline} />
      <div style={body}>{children}</div>
    </section>
  );
};

export default Article;
