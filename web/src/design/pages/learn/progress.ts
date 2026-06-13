// Lesson progress persistence (localStorage).
//
// Extracted out of lessons.ts so the data file stays purely lesson data.
// lessons.ts re-exports `loadProgress` / `saveProgress` for backwards
// compatibility, so existing imports (`from './lessons'`) keep working.
//
// Stored shape: a JSON array of completed lesson ids, e.g. `["uv","grad"]`.
//
// Key migration (06-learn-ui.md task 1): progress used to live under
// `shade.learn.completed.v1`. It now lives under `shaddy.lessons.progress.v1`.
// `loadProgress` performs a one-time forward migration: if the new key is
// absent but the legacy key exists, it copies the value forward and deletes
// the legacy key. A clean cut — we do not keep writing the legacy key.

export const STORAGE_KEY = 'shaddy.lessons.progress.v1';
export const LEGACY_KEY = 'shade.learn.completed.v1';

const hasLocalStorage = (): boolean => typeof localStorage !== 'undefined';

function parseStored(raw: string | null): Set<string> | null {
  if (!raw) return null;
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return null;
  }
}

export function loadProgress(): Set<string> {
  try {
    if (!hasLocalStorage()) return new Set();

    const current = parseStored(localStorage.getItem(STORAGE_KEY));
    if (current) return current;

    // New key absent (or corrupt) — try the legacy key and migrate forward.
    const legacy = parseStored(localStorage.getItem(LEGACY_KEY));
    if (legacy) {
      // One-time forward migration: write under the new key, drop the old one.
      saveProgress(legacy);
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        // best-effort
      }
      return legacy;
    }

    return new Set();
  } catch {
    return new Set();
  }
}

export function saveProgress(done: Set<string>): void {
  try {
    if (hasLocalStorage()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]));
    }
  } catch {
    // best-effort; nothing else to do
  }
}
