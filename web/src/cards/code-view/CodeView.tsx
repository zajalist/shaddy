// CodeMirror-backed view of the compiled GLSL. Two key invariants:
//
//   1. Read-only by default (Q3). Opt-in edit toggle.
//   2. When editable, the //#card / //#end marker lines and the renderer
//      preamble lines are locked via a transactionFilter — the user can
//      type inside a card's span but can't accidentally delete or merge
//      a marker line. Markers are also visually styled (italic + dimmed)
//      so they read as decorations, not regular comments.
//
// Imperative API via ref:
//   scrollToSpan(cardId) — scroll the editor + flash-highlight the card's
//   span (Q8 — used by the wildcard's "→ Edit code" affordance).

import { cpp } from '@codemirror/lang-cpp';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import {
  Compartment,
  EditorState,
  type Range,
  StateEffect,
  StateField,
  type Extension,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
  type DecorationSet,
} from '@codemirror/view';
import { useEffect, useImperativeHandle, useRef } from 'react';

import { END_MARKER, MARKER_PREFIX } from '../markers';
import type { Span } from '../types';

const PREAMBLE_LINE_CLASS = 'cv-preamble';
const MARKER_LINE_CLASS = 'cv-marker';
const FLASH_LINE_CLASS = 'cv-flash';

export interface CodeViewHandle {
  scrollToSpan(cardId: string): void;
}

export interface CodeViewProps {
  /** Full source string shown in the editor (renderer preamble + compiled body). */
  source: string;
  /** Spans in the COMPILED BODY's coordinate system (1-based, body-relative). */
  spans: Span[];
  /** Number of preamble lines prefixed by the renderer — added to span line
   *  numbers when computing positions in the visible source. */
  preambleLineCount: number;
  editMode: boolean;
  syntaxPending: boolean;
  onChange?: (next: string) => void;
  ref?: React.Ref<CodeViewHandle>;
}

const BASE_THEME = EditorView.theme({
  '&': { height: '100%', backgroundColor: '#0a0a0a', color: '#e4e4e7' },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '12.5px',
    lineHeight: '1.55',
  },
  '.cm-gutters': { backgroundColor: '#0a0a0a', color: '#3f3f46', border: 'none' },
  '.cm-activeLine': { backgroundColor: '#18181b' },
  '.cm-activeLineGutter': { backgroundColor: '#18181b' },
  [`.${PREAMBLE_LINE_CLASS}`]: { color: '#52525b', fontStyle: 'italic' },
  [`.${MARKER_LINE_CLASS}`]: { color: '#fb923c', fontStyle: 'italic' },
  [`.${FLASH_LINE_CLASS}`]: {
    backgroundColor: 'rgba(251, 146, 60, 0.18)',
    transition: 'background-color 0.6s ease-out',
  },
});

// ─── Decorations: highlight preamble + marker lines ─────────────────────

function buildLineDecorations(state: EditorState, preambleLines: number): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  for (let lineNum = 1; lineNum <= state.doc.lines; lineNum++) {
    const line = state.doc.line(lineNum);
    if (lineNum <= preambleLines) {
      ranges.push(Decoration.line({ class: PREAMBLE_LINE_CLASS }).range(line.from));
      continue;
    }
    const text = line.text.trimStart();
    if (text.startsWith(MARKER_PREFIX) || text.trim() === END_MARKER) {
      ranges.push(Decoration.line({ class: MARKER_LINE_CLASS }).range(line.from));
    }
  }
  return Decoration.set(ranges, true);
}

function lineDecorationsField(preambleLines: number): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildLineDecorations(state, preambleLines);
    },
    update(value, tr) {
      if (!tr.docChanged) return value;
      return buildLineDecorations(tr.state, preambleLines);
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}

// ─── Flash highlight effect ─────────────────────────────────────────────

const setFlashRange = StateEffect.define<{ from: number; to: number } | null>();

const flashField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setFlashRange)) {
        next = e.value
          ? Decoration.set([
              Decoration.line({ class: FLASH_LINE_CLASS }).range(
                Math.max(0, Math.min(tr.newDoc.length, e.value.from)),
              ),
              ...rangeBetweenLines(tr.newDoc, e.value.from, e.value.to),
            ])
          : Decoration.none;
      }
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

function rangeBetweenLines(
  doc: EditorState['doc'],
  from: number,
  to: number,
): Range<Decoration>[] {
  const out: Range<Decoration>[] = [];
  const fromLine = doc.lineAt(from).number;
  const toLine = doc.lineAt(Math.min(doc.length, to)).number;
  for (let i = fromLine + 1; i <= toLine; i++) {
    out.push(Decoration.line({ class: FLASH_LINE_CLASS }).range(doc.line(i).from));
  }
  return out;
}

// ─── Read-only zone enforcement ─────────────────────────────────────────

function isLineLockedForEdit(text: string, lineNum: number, preambleLines: number): boolean {
  if (lineNum <= preambleLines) return true;
  const t = text.trimStart();
  if (t.startsWith(MARKER_PREFIX) || t.trim() === END_MARKER) return true;
  return false;
}

function lockedLineFilter(preambleLines: number): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || tr.changes.empty) return tr;
    let blocked = false;
    tr.changes.iterChanges((fromA, toA) => {
      if (blocked) return;
      const startLine = tr.startState.doc.lineAt(fromA).number;
      const endLine = tr.startState.doc.lineAt(Math.max(fromA, toA - 1)).number;
      for (let n = startLine; n <= endLine; n++) {
        const line = tr.startState.doc.line(n);
        if (isLineLockedForEdit(line.text, n, preambleLines)) {
          blocked = true;
          return;
        }
      }
    });
    return blocked ? [] : tr;
  });
}

// ─── Component ──────────────────────────────────────────────────────────

export function CodeView(props: CodeViewProps) {
  const { source, spans, preambleLineCount, editMode, onChange, ref } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Mount once.
  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: source,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          cpp(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          BASE_THEME,
          lineDecorationsField(preambleLineCount),
          flashField,
          lockedLineFilter(preambleLineCount),
          readOnlyCompartment.current.of(EditorState.readOnly.of(!editMode)),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [preambleLineCount]);

  // Sync external `source` changes (e.g. card mutated → recompile → new GLSL).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === source) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: source } });
  }, [source]);

  // Sync editMode toggle.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(!editMode)),
    });
  }, [editMode]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToSpan(cardId: string) {
        const view = viewRef.current;
        if (!view) return;
        const span = spans.find((s) => s.cardId === cardId);
        if (!span) return;
        const visibleStart = span.startLine + preambleLineCount;
        const visibleEnd = span.endLine + preambleLineCount;
        if (visibleStart < 1 || visibleStart > view.state.doc.lines) return;
        const line = view.state.doc.line(visibleStart);
        view.dispatch({
          selection: { anchor: line.from },
          effects: [
            EditorView.scrollIntoView(line.from, { y: 'center' }),
            setFlashRange.of({ from: line.from, to: view.state.doc.line(
              Math.min(visibleEnd, view.state.doc.lines),
            ).to }),
          ],
        });
        // Clear flash after 700ms.
        window.setTimeout(() => {
          const v = viewRef.current;
          if (!v) return;
          v.dispatch({ effects: setFlashRange.of(null) });
        }, 700);
      },
    }),
    [spans, preambleLineCount],
  );

  return (
    <div className="relative w-full h-full flex flex-col">
      {props.syntaxPending && (
        <div className="absolute top-1 right-2 z-10 text-[10px] uppercase tracking-wider text-amber-400/90 bg-amber-950/80 px-2 py-0.5 rounded">
          syntax pending
        </div>
      )}
      <div ref={hostRef} className="flex-1 w-full overflow-hidden" />
    </div>
  );
}
