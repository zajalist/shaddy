import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { useLibrarySearch } from './useLibrarySearch';

const SEARCH_TEXT = {
  fresnel: 'fresnel schlick grazing reflection f0',
  lambert: 'lambert diffuse dot n l',
  plasma: 'plasma demoscene sine waves',
};

// A tiny harness that surfaces the hook's output + the live ?q= value.
function Harness() {
  const { raw, setRaw, q, visibleIds } = useLibrarySearch(SEARCH_TEXT);
  const [params] = useSearchParams();
  return (
    <div>
      <input data-testid="input" value={raw} onChange={(e) => setRaw(e.target.value)} />
      <span data-testid="q">{q}</span>
      <span data-testid="urlq">{params.get('q') ?? ''}</span>
      <span data-testid="visible">{[...visibleIds].sort().join(',')}</span>
    </div>
  );
}

const renderAt = (initial: string) =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Harness />
    </MemoryRouter>,
  );

describe('useLibrarySearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces typing then narrows visibleIds and writes ?q=', () => {
    const { getByTestId } = renderAt('/library');
    // All visible initially.
    expect(getByTestId('visible').textContent).toBe('fresnel,lambert,plasma');

    act(() => {
      getByTestId('input').setAttribute('value', 'fresnel');
      // fire a real change
    });
    // Use the input's onChange via fireEvent equivalent.
    const input = getByTestId('input') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, 'fresnel');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Before the debounce elapses, nothing has changed.
    expect(getByTestId('q').textContent).toBe('');

    act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(getByTestId('q').textContent).toBe('fresnel');
    expect(getByTestId('visible').textContent).toBe('fresnel');
    expect(getByTestId('urlq').textContent).toBe('fresnel');
  });

  it('pre-filters and pre-fills the input when loaded at ?q=fresnel', () => {
    const { getByTestId } = renderAt('/library?q=fresnel');
    expect((getByTestId('input') as HTMLInputElement).value).toBe('fresnel');
    act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(getByTestId('visible').textContent).toBe('fresnel');
  });

  it('removes the ?q= param when the query is cleared', () => {
    const { getByTestId } = renderAt('/library?q=plasma');
    const input = getByTestId('input') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(getByTestId('urlq').textContent).toBe('');
    expect(getByTestId('visible').textContent).toBe('fresnel,lambert,plasma');
  });
});
