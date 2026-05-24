// Tests for the AskClaude popover. We mock global `fetch` to keep the
// suite hermetic — the real plugin shells out to `claude -p`, which we
// never want to run from CI/tests.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup, act } from '@testing-library/react';

import { AskClaude } from './AskClaude';

const SAMPLE_GLSL = '#version 300 es\nprecision highp float;\nvoid main(){ fragColor = vec4(1.0); }';

beforeEach(() => {
  // Fresh fetch mock for every test.
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AskClaude', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <AskClaude open={false} glsl={SAMPLE_GLSL} onClose={() => {}} onReplace={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the popover when open', () => {
    render(
      <AskClaude open glsl={SAMPLE_GLSL} onClose={() => {}} onReplace={() => {}} />,
    );
    expect(screen.getByTestId('ask-claude-popover')).toBeTruthy();
    expect(screen.getByText('Ask Claude')).toBeTruthy();
    expect(screen.getByPlaceholderText(/make the colors more vibrant/i)).toBeTruthy();
  });

  it('submits the request, calls fetch with the prompt, and surfaces the response', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const claudeResponse = '#version 300 es\nprecision highp float;\nvoid main(){ fragColor = vec4(0.0); }';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ result: claudeResponse }),
    });

    render(
      <AskClaude open glsl={SAMPLE_GLSL} onClose={() => {}} onReplace={() => {}} />,
    );

    const textarea = screen.getByPlaceholderText(/make the colors more vibrant/i);
    fireEvent.change(textarea, { target: { value: 'make it darker' } });

    fireEvent.click(screen.getByTestId('ask-claude-submit'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/__claude_ask');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string) as { prompt: string };
    expect(body.prompt).toContain('make it darker');
    expect(body.prompt).toContain(SAMPLE_GLSL);

    await waitFor(() => {
      expect(screen.getByTestId('ask-claude-preview')).toBeTruthy();
    });
    expect(screen.getByText(/vec4\(0\.0\)/)).toBeTruthy();
  });

  it('calls onReplace and closes when Apply is clicked', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const claudeResponse = '#version 300 es\nvoid main(){ fragColor = vec4(0.5); }';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ result: claudeResponse }),
    });

    const onReplace = vi.fn();
    const onClose = vi.fn();
    render(<AskClaude open glsl={SAMPLE_GLSL} onClose={onClose} onReplace={onReplace} />);

    fireEvent.change(screen.getByPlaceholderText(/make the colors more vibrant/i), {
      target: { value: 'go darker' },
    });
    fireEvent.click(screen.getByTestId('ask-claude-submit'));

    await waitFor(() => screen.getByTestId('ask-claude-apply'));
    fireEvent.click(screen.getByTestId('ask-claude-apply'));

    expect(onReplace).toHaveBeenCalledWith(claudeResponse);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('strips ```glsl code fences if Claude wraps the response', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const wrapped = '```glsl\n#version 300 es\nvoid main(){ fragColor = vec4(0.0); }\n```';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ result: wrapped }),
    });

    const onReplace = vi.fn();
    render(<AskClaude open glsl={SAMPLE_GLSL} onClose={() => {}} onReplace={onReplace} />);

    fireEvent.change(screen.getByPlaceholderText(/make the colors more vibrant/i), {
      target: { value: 'do a thing' },
    });
    fireEvent.click(screen.getByTestId('ask-claude-submit'));

    await waitFor(() => screen.getByTestId('ask-claude-apply'));
    fireEvent.click(screen.getByTestId('ask-claude-apply'));

    const passed = onReplace.mock.calls[0]?.[0] as string;
    expect(passed.startsWith('```')).toBe(false);
    expect(passed.endsWith('```')).toBe(false);
    expect(passed).toContain('#version 300 es');
  });

  it('surfaces an error message when the server returns a non-OK response', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => JSON.stringify({ error: 'claude exited 1', stderr: 'boom' }),
    });

    render(<AskClaude open glsl={SAMPLE_GLSL} onClose={() => {}} onReplace={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/make the colors more vibrant/i), {
      target: { value: 'whatever' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('ask-claude-submit'));
    });

    const errorBox = await screen.findByTestId('ask-claude-error');
    expect(errorBox.textContent).toMatch(/claude exited 1/);
  });

  it('does not submit when the textarea is empty', () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    render(<AskClaude open glsl={SAMPLE_GLSL} onClose={() => {}} onReplace={() => {}} />);
    const submitBtn = screen.getByTestId('ask-claude-submit') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    fireEvent.click(submitBtn);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
