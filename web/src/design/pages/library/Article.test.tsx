import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Article } from './Article';
import { SCROLL_MARGIN_TOP } from './style';

describe('library/Article', () => {
  it('renders eyebrow group, heading, and body with a stable anchor id', () => {
    const { container } = render(
      <Article id="what-is-a-shader" group="Fundamentals" title="What IS a shader?">
        <p>runs once per pixel</p>
      </Article>,
    );
    const section = container.querySelector('section');
    expect(section?.id).toBe('what-is-a-shader');
    expect(section?.getAttribute('data-article-id')).toBe('what-is-a-shader');
    expect(container.querySelector('h2')?.textContent).toBe('What IS a shader?');
    expect(container.textContent).toContain('Fundamentals');
    expect(container.textContent).toContain('runs once per pixel');
  });

  it('applies the named scroll-margin offset', () => {
    const { container } = render(
      <Article id="x" group="G" title="T">
        <span />
      </Article>,
    );
    const section = container.querySelector('section') as HTMLElement;
    expect(section.style.scrollMarginTop).toBe(`${SCROLL_MARGIN_TOP}px`);
  });

  it('matches a stable snapshot', () => {
    const { container } = render(
      <Article id="x" group="G" title="T">
        <p>body</p>
      </Article>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
