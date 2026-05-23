import { describe, expect, it } from 'vitest';

import { useEditorStore } from './state';

describe('useEditorStore', () => {
  it('starts with empty source', () => {
    // Reset for test isolation
    useEditorStore.setState({ source: '' });
    expect(useEditorStore.getState().source).toBe('');
  });

  it('setSource updates the source', () => {
    useEditorStore.setState({ source: '' });
    useEditorStore.getState().setSource('void main() {}');
    expect(useEditorStore.getState().source).toBe('void main() {}');
  });

  it('subscribers are notified on change', () => {
    useEditorStore.setState({ source: '' });
    const seen: string[] = [];
    const unsub = useEditorStore.subscribe((s) => seen.push(s.source));
    useEditorStore.getState().setSource('a');
    useEditorStore.getState().setSource('b');
    unsub();
    useEditorStore.getState().setSource('c'); // shouldn't be seen
    expect(seen).toEqual(['a', 'b']);
  });
});
