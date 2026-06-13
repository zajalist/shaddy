import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Landing } from './index';
import { REPO_URL } from './constants';

// Mock WebGL components to avoid JSDOM errors
vi.mock('../RDHero', () => ({
  RDHero: () => <div data-testid="rd-hero" />
}));
vi.mock('../FractalEntity', () => ({
  FractalEntity: () => <div data-testid="fractal-entity" />
}));
vi.mock('../ShadeCanvas', () => ({
  ShadeCanvas: () => <div data-testid="shade-canvas" />
}));
vi.mock('../Starfield', () => ({
  Starfield: () => <div data-testid="starfield" />
}));

beforeAll(() => {
  globalThis.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof IntersectionObserver;
});

describe('Landing page', () => {
  it('has no dead links (href="#")', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    const anchors = container.querySelectorAll('a');
    anchors.forEach(a => {
      expect(a.getAttribute('href')).not.toBe('#');
    });
  });

  it('has GitHub links pointing to the real REPO_URL', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    const githubLinks = Array.from(container.querySelectorAll('a'))
      .filter(a => a.getAttribute('href')?.includes('github.com'));
    
    expect(githubLinks.length).toBeGreaterThan(0);
    githubLinks.forEach(a => {
      const href = a.getAttribute('href')!;
      expect(href).toContain(REPO_URL);
      // Ensure it's not the bare org root
      const path = href.split('github.com/')[1];
      expect(path && path.length > 0).toBe(true);
    });
  });

  it('surfaces the gallery in nav and CTA', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    const galleryLinks = container.querySelectorAll('a[href="/gallery"]');
    expect(galleryLinks.length).toBeGreaterThan(0);
  });

  it('contains a Docs link', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    const docsLinks = container.querySelectorAll('a[href="/docs"]');
    expect(docsLinks.length).toBeGreaterThan(0);
  });

  it('does not contain "work in progress" copy', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    expect(container.textContent).not.toMatch(/work in progress/i);
  });

  it('renders sign-in button reachable from nav', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    // SignInButton default signed-out text is "Sign in"
    expect(container.textContent).toMatch(/Sign in/i);
  });

  it('carries target="_blank" and rel="noreferrer" for external links', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    const externalLinks = Array.from(container.querySelectorAll('a'))
      .filter(a => a.getAttribute('href')?.startsWith('http'));
    
    expect(externalLinks.length).toBeGreaterThan(0);
    externalLinks.forEach(a => {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noreferrer');
    });
  });
});
