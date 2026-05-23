// Placeholder integration shell. Mounts the renderer and compiles a small
// demo shader that exercises u_time, u_resolution, and u_mouse — so the
// dev server gives quick visual proof that the renderer plumbing works.
// The real AppShell composition (renderer + editor + ux) lands once those
// tracks exist (see CONTRACTS.md §5).

import { useEffect, useRef } from 'react';
import { createRenderer } from '@/renderer';

const DEMO_SHADER = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float d = distance(uv, u_mouse);
  float pulse = 0.5 + 0.5 * sin(u_time * 1.5);
  float ring = smoothstep(0.40, 0.36, abs(d - 0.18 - pulse * 0.05));
  vec3 bg = mix(vec3(0.07, 0.09, 0.14), vec3(0.13, 0.10, 0.22), uv.y);
  vec3 ink = vec3(1.0, 0.55, 0.28);
  fragColor = vec4(mix(bg, ink, ring), 1.0);
}
`;

export function AppShell() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = createRenderer();
    renderer.mount(host);
    renderer.compile(DEMO_SHADER);
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
      <p className="text-neutral-500 text-sm">move the cursor over the canvas</p>
    </main>
  );
}
