// diagrams — public surface. Exports the `Diagram` component (registry-driven)
// and the `DiagramKind` union. The old 31-arm switch is gone: `Diagram` looks
// up the renderer in DIAGRAMS and wraps it in the shared frame.

import { DiagramFrame } from './frame';
import { DIAGRAMS } from './registry';
import type { DiagramKind } from './registry';

export type { DiagramKind } from './registry';

export type DiagramProps = {
  kind: DiagramKind;
  /** Optional caption rendered beneath the SVG (small monospace label). */
  caption?: string;
  /** Aspect-ratio override. Defaults to 16:9. */
  height?: number;
};

export const Diagram = ({ kind, caption }: DiagramProps) => {
  const render = DIAGRAMS[kind];
  return <DiagramFrame caption={caption}>{render ? render() : null}</DiagramFrame>;
};

export default Diagram;
