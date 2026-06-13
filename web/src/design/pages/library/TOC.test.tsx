import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { TOC } from './TOC';
import type { TocGroup } from './TOC';

const GROUPS: TocGroup[] = [
  {
    label: 'Fundamentals',
    color: '#000',
    entries: [
      { id: 'what-is-a-shader', title: 'What IS a shader?' },
      { id: 'fragment-pipeline', title: 'The fragment shader pipeline' },
    ],
  },
];

// Capture observe/disconnect counts so we can assert the observer is rebuilt.
let observeCount = 0;
let disconnectCount = 0;

beforeEach(() => {
  observeCount = 0;
  disconnectCount = 0;
  globalThis.IntersectionObserver = vi.fn(() => ({
    observe: () => {
      observeCount += 1;
    },
    unobserve: vi.fn(),
    disconnect: () => {
      disconnectCount += 1;
    },
    takeRecords: vi.fn(),
  })) as unknown as typeof IntersectionObserver;

  // jsdom doesn't implement scrollIntoView; stub it so click handlers run.
  Element.prototype.scrollIntoView = vi.fn();

  // Provide an article in the DOM so the observer effect attaches.
  document.body.innerHTML =
    '<section id="what-is-a-shader" data-article-id="what-is-a-shader"></section>' +
    '<section id="fragment-pipeline" data-article-id="fragment-pipeline"></section>';
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const matchMediaMock = (reduced: boolean) =>
  vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

describe('TOC scroll-spy + navigation', () => {
  it('rebuilds the IntersectionObserver when the filter changes', () => {
    window.matchMedia = matchMediaMock(false) as unknown as typeof window.matchMedia;
    const { rerender } = render(<TOC groups={GROUPS} filter="" />);
    const initialObserves = observeCount;
    const initialDisconnects = disconnectCount;
    expect(initialObserves).toBeGreaterThan(0);

    // Changing the filter must tear down + rebuild the observer.
    rerender(<TOC groups={GROUPS} filter="fragment" />);
    expect(disconnectCount).toBeGreaterThan(initialDisconnects);
    expect(observeCount).toBeGreaterThan(initialObserves);
  });

  it('calls onNavigate(id) when an entry is clicked', () => {
    window.matchMedia = matchMediaMock(false) as unknown as typeof window.matchMedia;
    const onNavigate = vi.fn();
    const { getByText } = render(<TOC groups={GROUPS} filter="" onNavigate={onNavigate} />);
    fireEvent.click(getByText('what is a shader?'));
    expect(onNavigate).toHaveBeenCalledWith('what-is-a-shader');
  });

  it('uses behavior:auto under prefers-reduced-motion on click', () => {
    window.matchMedia = matchMediaMock(true) as unknown as typeof window.matchMedia;
    const scrollSpy = vi.fn();
    const target = document.querySelector('[data-article-id="what-is-a-shader"]') as HTMLElement;
    target.scrollIntoView = scrollSpy;

    const { getByText } = render(<TOC groups={GROUPS} filter="" />);
    fireEvent.click(getByText('what is a shader?'));
    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' }),
    );
  });

  it('uses behavior:smooth when reduced motion is not preferred', () => {
    window.matchMedia = matchMediaMock(false) as unknown as typeof window.matchMedia;
    const scrollSpy = vi.fn();
    const target = document.querySelector('[data-article-id="what-is-a-shader"]') as HTMLElement;
    target.scrollIntoView = scrollSpy;

    const { getByText } = render(<TOC groups={GROUPS} filter="" />);
    fireEvent.click(getByText('what is a shader?'));
    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
  });
});
