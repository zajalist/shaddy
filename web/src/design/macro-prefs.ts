// User macro registry — saved "function" blocks, persisted to localStorage so
// they show up in the palette's Macros group across sessions. Mirrors the
// palette-prefs subscription pattern. Keyed by macro name (names are unique).

import { useSyncExternalStore } from 'react';
import type { MacroDef } from '@/cards';

const KEY = 'shaddy:macros';
let version = 0;
const listeners = new Set<() => void>();
const bump = (): void => { version += 1; listeners.forEach((l) => l()); };

function read(): MacroDef[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MacroDef[]) : [];
  } catch { return []; }
}
function write(list: MacroDef[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore quota */ }
  bump();
}

export function getMacros(): MacroDef[] { return read(); }

/** Save (or overwrite by name) a macro definition. */
export function saveMacro(def: MacroDef): void {
  const list = read();
  const i = list.findIndex((m) => m.name === def.name);
  if (i >= 0) list[i] = def; else list.push(def);
  write(list);
}

export function deleteMacro(name: string): void {
  write(read().filter((m) => m.name !== name));
}

export function renameMacro(oldName: string, newName: string): void {
  if (!newName.trim() || oldName === newName) return;
  write(read().map((m) => (m.name === oldName ? { ...m, name: newName } : m)));
}

/** Toggle the byte-identical GLSL compression flag for a saved macro. */
export function setMacroCompress(name: string, compress: boolean): void {
  write(read().map((m) => (m.name === name ? { ...m, compress } : m)));
}

/** Subscribe a component to macro-registry changes. */
export function useMacroVersion(): number {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => version,
    () => version,
  );
}
