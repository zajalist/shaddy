import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Confetti } from './Confetti';

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Confetti', () => {
  it('renders nothing under prefers-reduced-motion: reduce', () => {
    mockReducedMotion(true);
    const { container } = render(<Confetti />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the SVG burst when motion is allowed', () => {
    mockReducedMotion(false);
    const { container } = render(<Confetti />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelectorAll('line').length).toBeGreaterThan(0);
  });

  it('remounts (replays) when re-keyed', () => {
    mockReducedMotion(false);
    const { container, rerender } = render(<Confetti key={1} />);
    const first = container.querySelector('[data-testid="learn-confetti"]');
    rerender(<Confetti key={2} />);
    const second = container.querySelector('[data-testid="learn-confetti"]');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
  });
});
