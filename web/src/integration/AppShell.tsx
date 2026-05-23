// Placeholder integration shell. Mounts the renderer so the dev server
// gives a live picture of whatever the renderer currently produces (the
// debug shader until #6, then user-compiled shaders). The real AppShell
// composition (renderer + editor + ux) lands once those tracks exist
// (see CONTRACTS.md §5).

import { useEffect, useRef } from 'react';
import { createRenderer } from '@/renderer';

export function AppShell() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = createRenderer();
    renderer.mount(host);
    // Teardown is handled internally on the next mount() call. Strict-mode
    // double-mount in dev is harmless: the host element is the same, so
    // mount() short-circuits.
  }, []);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 p-8">
      <header className="text-center">
        <h1 className="text-5xl font-semibold tracking-tight">Shaddy</h1>
        <p className="text-neutral-400 mt-2">a learning environment for shader art</p>
      </header>
      <div
        ref={hostRef}
        className="w-full max-w-3xl aspect-square rounded-xl overflow-hidden ring-1 ring-neutral-800 shadow-2xl"
      />
    </main>
  );
}
