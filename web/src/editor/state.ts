// Single source of truth for the editor's source string.
// Per CONTRACTS.md §2: there is NO separate "handle state". Every interaction
// (drag-to-scrub, color-pick, pattern-handle drag) mutates the source string
// via replaceLiteral() and re-emits.

import { create } from 'zustand';

export type EditorState = {
  source: string;
  setSource: (next: string) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  source: '',
  setSource: (next) => set({ source: next }),
}));
