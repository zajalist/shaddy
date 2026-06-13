// Article — section wrapper used by every encyclopedia entry on the
// Library page. Renders a top eyebrow with the group name, a chunky gold
// underline, the article heading, and the body content. Every article
// gets a stable DOM id (passed in as `id`) so the sticky TOC sidebar can
// scroll-into-view and IntersectionObserver can track the active section.

import type { CSSProperties, ReactNode } from 'react';
import { SHADE } from '../../tokens';
import { LIB_TYPE, SCROLL_MARGIN_TOP } from './style';

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
    scrollMarginTop: SCROLL_MARGIN_TOP,
  };
  const eyebrow: CSSProperties = {
    display: 'inline-block',
    ...LIB_TYPE.eyebrow,
    color: colour,
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
    ...LIB_TYPE.display,
    fontSize: LIB_TYPE.h2.fontSize,
    color: SHADE.text,
    lineHeight: LIB_TYPE.h2.lineHeight,
  };
  const body: CSSProperties = {
    marginTop: 14,
    ...LIB_TYPE.body,
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
