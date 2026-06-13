import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Library from '../Library';

// GLSL highlighter is irrelevant to content-preservation; render text as-is.
vi.mock('../../GlslHighlight', () => ({
  GlslHighlight: ({ source }: { source: string }) => <span>{source}</span>,
}));

beforeAll(() => {
  globalThis.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(),
  })) as unknown as typeof IntersectionObserver;
});

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

const renderLibrary = (initial = '/library') =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Library />
    </MemoryRouter>,
  );

describe('Library page (content-preservation guard)', () => {
  it('renders every registered article as a section with data-article-id', () => {
    const { container } = renderLibrary();
    const articles = container.querySelectorAll('[data-article-id]');
    // The article registry currently holds 36 entries across 7 groups.
    expect(articles).toHaveLength(36);
  });

  it('lists all 7 group labels in the TOC', () => {
    const { container } = renderLibrary();
    const text = container.textContent ?? '';
    for (const label of [
      'Fundamentals',
      'Math you need',
      'SDFs',
      'Lighting',
      'Color',
      'Fractals',
      'Recipes',
    ]) {
      expect(text).toContain(label);
    }
  });

  it('preserves a known prose sentence', () => {
    const { container } = renderLibrary();
    expect(container.textContent).toContain('runs once per pixel');
  });

  it('renders the responsive grid shell', () => {
    const { container } = renderLibrary();
    expect(container.querySelector('.lib-shell')).not.toBeNull();
    expect(container.querySelector('.lib-article')).not.toBeNull();
  });
});
