// CodeMirror 6 mounted in a React component. Uses @codemirror/lang-cpp for
// GLSL syntax highlighting (GLSL is a C-derivative; cpp's keyword set + comment
// rules cover ~95% of what we need for the demo). We can swap to a real GLSL
// grammar later without changing the public API.

import { cpp } from '@codemirror/lang-cpp';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { useEffect, useRef } from 'react';

import type { EditorProps } from '../index';

const _BASE_EXTENSIONS = [
  lineNumbers(),
  highlightActiveLine(),
  history(),
  cpp(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  EditorView.theme({
    '&': { height: '100%', backgroundColor: '#0a0a0a', color: '#e4e4e7' },
    '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '13px' },
    '.cm-gutters': { backgroundColor: '#0a0a0a', color: '#52525b', border: 'none' },
    '.cm-activeLine': { backgroundColor: '#18181b' },
    '.cm-activeLineGutter': { backgroundColor: '#18181b' },
  }),
];

export function CodeMirrorPane({ source, onSourceChange, errors }: EditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Mount once.
  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: source,
        extensions: [
          ..._BASE_EXTENSIONS,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onSourceChange(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external source changes (e.g. template-load, optimize-done) into the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== source) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: source },
      });
    }
  }, [source]);

  return (
    <div className="w-full h-full flex flex-col">
      {errors && errors.length > 0 && (
        <div className="bg-red-900 text-red-100 text-xs px-2 py-1 font-mono shrink-0">
          {errors.slice(0, 3).map((e, i) => (
            <div key={i}>
              line {e.line}:{e.column} — {e.message}
            </div>
          ))}
        </div>
      )}
      <div ref={hostRef} className="flex-1 w-full overflow-hidden" />
    </div>
  );
}
