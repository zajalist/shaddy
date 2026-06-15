import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { REPO_URL } from './constants';
import { Landing } from './index';

// Mock WebGL components to avoid JSDOM errors
vi.mock('../RDHero', () => ({
  RDHero: () => <div data-testid="rd-hero" />,
}));
vi.mock('../FractalEntity', () => ({
  FractalEntity: () => <div data-testid="fractal-entity" />,
}));
vi.mock('../ShadeCanvas', () => ({
  ShadeCanvas: () => <div data-testid="shade-canvas" />,
}));
vi.mock('../Starfield', () => ({
  Starfield: () => <div data-testid="starfield" />,
}));

let originalIO: typeof IntersectionObserver;

beforeAll(() => {
  originalIO = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof IntersectionObserver;
});

afterAll(() => {
  globalThis.IntersectionObserver = originalIO;
});

describe('Landing page', () => {
  it('has no dead links (href="#")', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    const anchors = container.querySelectorAll('a');
    expect(anchors.length).toBeGreaterThan(0);
    anchors.forEach((a) => {
      expect(a.getAttribute('href')).not.toBe('#');
    });
  });

  it('has GitHub links pointing to the real REPO_URL', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    const githubLinks = Array.from(container.querySelectorAll('a')).filter((a) =>
      a.getAttribute('href')?.includes('github.com'),
    );

    expect(githubLinks.length).toBeGreaterThan(0);
    githubLinks.forEach((a) => {
      const href = a.getAttribute('href')!;
      expect(href.startsWith(REPO_URL)).toBe(true);
    });
  });

  it('surfaces the gallery in nav and CTA', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    const galleryLinks = container.querySelectorAll('a[href="/gallery"]');
    expect(galleryLinks.length).toBeGreaterThan(0);
  });

  it('contains a Docs link', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    const docsLinks = container.querySelectorAll('a[href="/docs"]');
    expect(docsLinks.length).toBeGreaterThan(0);
  });

  it('does not contain "work in progress" copy', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(container.textContent).not.toMatch(/work in progress/i);
  });

  it('renders sign-in button reachable from nav', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    // SignInButton default signed-out text is "Sign in"
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeTruthy();
  });

  it('carries target="_blank" and rel="noreferrer" for external links', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    const externalLinks = Array.from(container.querySelectorAll('a')).filter((a) =>
      a.getAttribute('href')?.startsWith('http'),
    );

    expect(externalLinks.length).toBeGreaterThan(0);
    externalLinks.forEach((a) => {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noreferrer');
    });
  });
});
