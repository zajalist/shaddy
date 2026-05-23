import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createRenderer, type RendererAPI, TEMPLATES } from '@/renderer';

const HIGHLIGHTS = [
  {
    title: 'Code and canvas are one surface',
    description: 'Drag a visual handle, watch the GLSL update. Edit the GLSL, watch the image move.',
  },
  {
    title: 'Frontend-only, instant share',
    description: 'Everything runs in your browser. Share a shader as a URL - no sign-up, no server.',
  },
  {
    title: '12 starter templates',
    description: 'Jump from circles to plasma, noise fields, and raymarching in a single click.',
  },
];

const STEPS = [
  {
    title: 'Pick a template',
    description: 'Start from a short, readable shader that already looks good.',
  },
  {
    title: 'Drag the canvas',
    description: 'Direct manipulation surfaces the math behind the visuals.',
  },
  {
    title: 'Ship the share link',
    description: 'Send the URL hash and your shader rehydrates instantly.',
  },
];

const HERO_SOURCE = (TEMPLATES.find((t) => t.id === 'plasma') ?? TEMPLATES[0])?.source?.trim() ?? '';

export function AppShell() {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAPI | null>(null);
  const [heroError, setHeroError] = useState<string | null>(null);
  const templateNames = TEMPLATES.map((t) => t.name);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (typeof window !== 'undefined' && !('WebGL2RenderingContext' in window)) {
      setHeroError('WebGL2 is not available in this browser.');
      return;
    }

    const renderer = createRenderer();
    renderer.mount(host);
    renderer.compile(HERO_SOURCE);
    rendererRef.current = renderer;

    const resize = () => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      renderer.resize(host.clientWidth * dpr, host.clientHeight * dpr);
    };

    resize();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(host);
    }
    window.addEventListener('resize', resize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <main className="min-h-dvh bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">Shaddy</p>
            <p className="text-lg font-semibold">Will the real slim shader please stand up?</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <a href="#how" className="text-zinc-300 hover:text-white">
              How it works
            </a>
            <a href="#templates" className="text-zinc-300 hover:text-white">
              Templates
            </a>
            <Link
              to="/view"
              className="rounded-full border border-zinc-700 px-4 py-2 font-medium text-white transition hover:border-zinc-400"
            >
              Open playground
            </Link>
          </div>
        </nav>

        <section className="mt-16 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-zinc-300">
              frontend-only / live WebGL2
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Learn shaders by playing them.
            </h1>
            <p className="text-lg text-zinc-300">
              Shaddy makes GLSL tactile. The canvas and the code are the same surface - drag to edit
              literals, type to reshape the art, and share a URL that recreates the exact shader.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/view"
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
              >
                Launch the live editor
              </Link>
              <a
                href="#how"
                className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold text-white transition hover:border-zinc-400"
              >
                See the flow
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-fuchsia-500/20 via-indigo-500/10 to-cyan-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-2xl">
              {heroError ? (
                <div className="flex h-[360px] items-center justify-center px-8 text-center text-sm text-zinc-300">
                  {heroError}
                </div>
              ) : (
                <div ref={hostRef} className="h-[360px] w-full" />
              )}
              <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400">
                <span>Shader preview / move your cursor</span>
                <span>{TEMPLATES.length} templates ready</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6"
            >
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-zinc-300">{item.description}</p>
            </div>
          ))}
        </section>

        <section id="how" className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">How it works</p>
            <h2 className="text-3xl font-semibold tracking-tight">A shader lab that teaches itself.</h2>
            <p className="text-zinc-300">
              Start with a short, readable shader. The editor keeps the source as the single source
              of truth, and every drag gesture maps back into the GLSL literals so you learn the
              math by feel.
            </p>
          </div>
          <div className="space-y-4">
            {STEPS.map((step, idx) => (
              <div key={step.title} className="flex gap-4 rounded-2xl border border-zinc-800 p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-zinc-950">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-zinc-300">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="templates" className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">Template library</p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Start from a look you already love.
              </h2>
            </div>
            <Link to="/view" className="text-sm font-semibold text-white underline decoration-zinc-700">
              Explore them in the editor
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {templateNames.map((name) => (
              <div
                key={name}
                className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-200"
              >
                {name}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">
                Demo-ready on phone + desktop
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                One responsive app, zero installs.
              </h2>
              <p className="mt-3 text-zinc-300">
                Shaddy runs entirely in the browser. Open it on a phone, pinch and drag the canvas,
                and share the URL with your team in seconds.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-300">
              <p className="font-semibold text-white">Best demo flow</p>
              <p className="mt-3">1. Pick a template.</p>
              <p className="mt-2">2. Drag a handle; watch GLSL update.</p>
              <p className="mt-2">3. Copy the share link to replay it anywhere.</p>
            </div>
          </div>
        </section>

        <section className="mt-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to make your first shader?</h2>
          <p className="mt-3 text-zinc-300">
            Jump into the live editor and start dragging the math.
          </p>
          <Link
            to="/view"
            className="mt-6 inline-flex rounded-full bg-white px-6 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Open the playground
          </Link>
        </section>
      </div>
    </main>
  );
}
