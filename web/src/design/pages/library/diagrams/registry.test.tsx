import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { DIAGRAMS } from './registry';
import type { DiagramKind } from './registry';
import { Diagram } from './index';

// Every kind the union declares. If a kind is added to DiagramKind without a
// registry entry, the Record<DiagramKind, ...> type fails `tsc` — this list
// keeps the runtime check honest too.
const ALL_KINDS: DiagramKind[] = [
  'pipeline', 'gpuGrid', 'uvGrid', 'uvCentred', 'trigWave', 'dotProduct',
  'smoothstepCurve', 'noiseStack', 'fbmOctaves', 'sdfRings', 'sdfPrimitives2D',
  'sdfPrimitives3D', 'sdfBoolean', 'sdfSmoothUnion', 'domainRepeat', 'raymarch',
  'lambert', 'fresnelCurve', 'aoSamples', 'gammaCurve', 'tonemapCurves',
  'cosinePalette', 'hsvWheel', 'mandelbrot', 'julia', 'burningShip',
  'ifsTriangle', 'voronoiF1F2', 'domainWarp', 'reactionDiffusion', 'plasma',
];

describe('library/diagrams registry', () => {
  it('is exhaustive over the DiagramKind union (no extra/missing keys)', () => {
    const registryKeys = Object.keys(DIAGRAMS).sort();
    expect(registryKeys).toEqual([...ALL_KINDS].sort());
    expect(registryKeys).toHaveLength(31);
  });

  it('every registry entry renders a non-empty <svg>', () => {
    for (const kind of ALL_KINDS) {
      const { container, unmount } = render(<Diagram kind={kind} />);
      const svg = container.querySelector('svg');
      expect(svg, `kind=${kind}`).not.toBeNull();
      // SVG should have actual content (shapes/text), not be empty.
      expect(svg?.childElementCount, `kind=${kind}`).toBeGreaterThan(0);
      unmount();
    }
  });

  it('renders inside a <figure> frame and shows the caption', () => {
    const { container } = render(<Diagram kind="pipeline" caption="vertex → fragment" />);
    expect(container.querySelector('figure')).not.toBeNull();
    expect(container.querySelector('figcaption')?.textContent).toBe('vertex → fragment');
  });
});
