// Drop-in mock EditorPane (no CodeMirror) for renderer/ux teams that don't
// want to pay the CodeMirror bundle cost in their unit tests. Same public
// surface as the real EditorPane.

import { useEffect, useRef } from 'react';
import type { EditorProps } from '../index';

export function EditorPane({ source, onSourceChange, errors }: EditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.value !== source) {
      ref.current.value = source;
    }
  }, [source]);

  return (
    <div className="w-full h-full flex flex-col">
      {errors && errors.length > 0 && (
        <div className="bg-red-900 text-red-100 text-xs px-2 py-1 font-mono">
          {errors.map((e, i) => (
            <div key={i}>
              line {e.line}:{e.column} — {e.message}
            </div>
          ))}
        </div>
      )}
      <textarea
        ref={ref}
        defaultValue={source}
        onChange={(e) => onSourceChange(e.target.value)}
        spellCheck={false}
        className="flex-1 w-full p-3 font-mono text-sm bg-zinc-950 text-zinc-100 outline-none resize-none"
      />
    </div>
  );
}
