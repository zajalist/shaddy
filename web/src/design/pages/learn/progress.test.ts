import { beforeEach, describe, expect, it } from 'vitest';

import {
  LEGACY_KEY,
  STORAGE_KEY,
  loadProgress,
  saveProgress,
} from './progress';

beforeEach(() => {
  localStorage.clear();
});

describe('loadProgress', () => {
  it('returns an empty set when both keys are empty', () => {
    expect(loadProgress()).toEqual(new Set());
  });

  it('reads the current key when present', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['uv', 'grad']));
    expect(loadProgress()).toEqual(new Set(['uv', 'grad']));
  });

  it('migrates from the legacy key: writes new key, removes legacy, returns set', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(['uv', 'circle']));

    const result = loadProgress();

    expect(result).toEqual(new Set(['uv', 'circle']));
    // new key written forward
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(['uv', 'circle']);
    // legacy key removed
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('prefers the new key over the legacy key (no migration when current exists)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['new']));
    localStorage.setItem(LEGACY_KEY, JSON.stringify(['old']));

    expect(loadProgress()).toEqual(new Set(['new']));
    // legacy left untouched since no migration ran
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
  });

  it('survives a corrupt current blob (returns empty)', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(loadProgress()).toEqual(new Set());
  });

  it('falls back to legacy when current blob is corrupt but legacy is valid', () => {
    localStorage.setItem(STORAGE_KEY, 'nope');
    localStorage.setItem(LEGACY_KEY, JSON.stringify(['uv']));
    expect(loadProgress()).toEqual(new Set(['uv']));
  });

  it('ignores non-array stored shapes', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(loadProgress()).toEqual(new Set());
  });

  it('filters non-string entries out of a stored array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['uv', 3, null, 'grad']));
    expect(loadProgress()).toEqual(new Set(['uv', 'grad']));
  });
});

describe('saveProgress', () => {
  it('writes only the new key', () => {
    saveProgress(new Set(['uv', 'grad']));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(['uv', 'grad']);
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });
});
