import { EditorPane } from '@/editor';
import type { GLSLError, RendererAPI } from '@/renderer';
import { createRenderer, TEMPLATES } from '@/renderer';
import { useEffect, useRef, useState } from 'react';

const DEFAULT_SOURCE = (TEMPLATES.find((t) => t.id === 'plasma') ?? TEMPLATES[0])?.source?.trim() ?? '';

export function ShaderView() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [errors, setErrors] = useState<GLSLError[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAPI | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = createRenderer();
    renderer.mount(host);
    renderer.compile(source);
    const unsub = renderer.onCompile((result) => {
      setErrors(result.ok ? [] : result.errors);
    });
    rendererRef.current = renderer;
    return unsub;
  }, []);

  function handleSourceChange(src: string) {
    setSource(src);
    rendererRef.current?.compile(src);
  }

  return (
    <div className="flex h-dvh bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-center w-[40%] border-r border-zinc-800 p-6">
        <div
          ref={hostRef}
          className="w-full aspect-video rounded-lg overflow-hidden ring-1 ring-zinc-800 shadow-2xl"
        />
      </div>
      <div className="flex-1 h-full min-w-0">
        <EditorPane source={source} onSourceChange={handleSourceChange} errors={errors} />
      </div>
    </div>
  );
}
