import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use the WebGL-free mock renderer (CONTRACTS.md test-harness clause).
vi.mock('@/renderer', async () => {
  const mock = await vi.importActual<typeof import('@/renderer/__mocks__/renderer')>(
    '@/renderer/__mocks__/renderer',
  );
  const actual = await vi.importActual<typeof import('@/renderer')>('@/renderer');
  return { ...actual, createRenderer: mock.createRenderer };
});

import { Learn } from './Learn';
import { LESSONS, STORAGE_KEY } from './learn/lessons';

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

beforeEach(() => {
  localStorage.clear();
  setViewport(1200);
  // jsdom doesn't implement scrollIntoView; onStart calls it via rAF.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Learn page flow', () => {
  it('clicking Start reveals the workspace', () => {
    render(<Learn />);
    fireEvent.click(screen.getByRole('button', { name: /start lesson 1/i }));
    expect(document.getElementById('learn-workspace')).not.toBeNull();
  });

  it('passing a lesson cheers, persists under the new key, bumps progress, mounts confetti', async () => {
    // Stub the first lesson's check to pass.
    const checkSpy = vi.spyOn(LESSONS[0]!, 'check').mockResolvedValue({ pass: true });

    render(<Learn />);
    fireEvent.click(screen.getByRole('button', { name: /start lesson 1/i }));

    const checkBtn = await screen.findByRole('button', { name: /^check$/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      // Persisted under the NEW key.
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toContain(LESSONS[0]!.id);
    });

    // Progress badge incremented (1 of 8 appears in hero + workspace inline).
    expect(screen.getAllByText(/1 of 8 lessons complete/).length).toBeGreaterThan(0);

    // Confetti mounted.
    expect(document.querySelector('[data-testid="learn-confetti"]')).not.toBeNull();

    checkSpy.mockRestore();
  });

  it('failing a lesson shows the hint and does not change progress', async () => {
    vi.spyOn(LESSONS[0]!, 'check').mockResolvedValue({ pass: false, reason: 'Nope.' });

    render(<Learn />);
    fireEvent.click(screen.getByRole('button', { name: /start lesson 1/i }));

    const checkBtn = await screen.findByRole('button', { name: /^check$/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(new RegExp('Nope\\.'))).not.toBeNull();
    });

    // No progress written.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(document.querySelector('[data-testid="learn-confetti"]')).toBeNull();
  });
});

describe('no-token-blob regression', () => {
  it('injects a keyframe sheet with NO box-shadow hover rule', () => {
    render(<Learn />);
    const style = document.getElementById('shade-learn-keyframes');
    expect(style).not.toBeNull();
    const css = style!.textContent ?? '';
    expect(css).toContain('@keyframes learnFadeUp');
    expect(css).toContain('@keyframes learnConfetti');
    // No selector hover rules, no box-shadow lift baked into the blob.
    expect(css).not.toContain('box-shadow');
    expect(css).not.toContain(':hover');
  });
});
