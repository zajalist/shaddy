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
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import {
  Annotation,
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
  '&': { height: '100%', backgroundColor: 'transparent', color: '#e6ddc7' },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: '13px',
    lineHeight: '1.7',
    padding: '10px 0',
  },
  '.cm-content': { padding: '0 6px' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: '#564f43',
    border: 'none',
    paddingLeft: '14px',
    paddingRight: '10px',
  },
  '.cm-lineNumbers .cm-gutterElement': { fontSize: '11px', paddingTop: '1px' },
  '.cm-activeLine': { backgroundColor: 'rgba(255, 248, 227, 0.04)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#c8bca4' },
  [`.${PREAMBLE_LINE_CLASS}`]: { color: '#6b6258', fontStyle: 'italic' },
  [`.${MARKER_LINE_CLASS}`]: { color: '#ffb627', fontStyle: 'italic', opacity: '0.95' },
  [`.${FLASH_LINE_CLASS}`]: {
    backgroundColor: 'rgba(255, 182, 39, 0.20)',
    transition: 'background-color 0.6s ease-out',
  },
});

// Palette-tuned syntax — numbers mustard, strings mint, keywords cobalt,
// types coral. Subdued background, no italics on operators (cleaner).
const RISO_SYNTAX = HighlightStyle.define([
  { tag: t.keyword, color: '#8aa6ff', fontWeight: '600' },
  { tag: [t.controlKeyword, t.moduleKeyword], color: '#8aa6ff', fontWeight: '600' },
  { tag: t.number, color: '#ffb627' },
  { tag: t.string, color: '#5cdb95' },
  { tag: t.comment, color: '#6b6258', fontStyle: 'italic' },
  { tag: [t.typeName, t.className], color: '#ff8a87' },
  { tag: t.function(t.variableName), color: '#e2b9ff' },
  { tag: t.variableName, color: '#e6ddc7' },
  { tag: [t.operator, t.punctuation], color: '#a39a8b' },
  { tag: [t.bool, t.null], color: '#ffb627', fontWeight: '600' },
  { tag: t.atom, color: '#ffb627' },
  { tag: t.macroName, color: '#e2b9ff' },
]);

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

// Annotation we set on programmatic dispatches so the locked-line filter
// lets them through. User typing has no such annotation, so the filter still
// protects the preamble + marker lines from manual edits.
const PROGRAMMATIC_DISPATCH = Annotation.define<true>();

function lockedLineFilter(preambleLines: number): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || tr.changes.empty) return tr;
    if (tr.annotation(PROGRAMMATIC_DISPATCH)) return tr;
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
          syntaxHighlighting(RISO_SYNTAX, { fallback: true }),
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
    view.dispatch({
      changes: { from: 0, to: current.length, insert: source },
      annotations: PROGRAMMATIC_DISPATCH.of(true),
    });
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
        <div className="absolute top-2 right-3 z-10 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono font-bold text-ink bg-coral border-2 border-ink px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-ink dot-live" />
          syntax pending
        </div>
      )}
      <div ref={hostRef} className="flex-1 w-full overflow-hidden scroll-ghost" />
    </div>
  );
}
