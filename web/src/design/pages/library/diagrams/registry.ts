// registry — maps every DiagramKind to its renderer. Typed as an exhaustive
// Record<DiagramKind, () => ReactNode> so adding a kind to the union without
// a renderer fails `tsc` (fixing the silent-drift risk the old switch's
// `default: null` hid).
//
// Plain `.ts` (no JSX) — renderers are referenced as components and built
// with createElement so the registry stays a thin data table.

import { createElement } from 'react';
import type { ReactNode } from 'react';
import { Pipeline, GpuGrid, UvGrid } from './fundamentals';
import { TrigWave, DotProduct, SmoothstepCurve, NoiseStack, FbmOctaves } from './math';
import {
  SdfRings, SdfPrimitives2D, SdfPrimitives3D, SdfBoolean, SdfSmoothUnion,
  DomainRepeat, Raymarch,
} from './sdf';
import { Lambert, FresnelCurve, AoSamples } from './lighting';
import { GammaCurve, TonemapCurves, CosinePalette, HsvWheel } from './color';
import { Mandelbrot, Julia, BurningShip, IfsTriangle } from './fractals';
import { VoronoiF1F2, DomainWarp, ReactionDiffusion, Plasma } from './recipes';

export type DiagramKind =
  | 'pipeline'           // vertex → raster → fragment
  | 'gpuGrid'            // many tiny worker dots
  | 'uvGrid'             // normalised UV with origin marker
  | 'uvCentred'          // centred -1..1 UV with origin marker
  | 'trigWave'           // sin curve from -1..1
  | 'dotProduct'         // two vectors + dot meaning
  | 'smoothstepCurve'    // cubic ramp shape
  | 'noiseStack'         // value vs fbm
  | 'fbmOctaves'         // 4 octaves stacking
  | 'sdfRings'           // signed distance rings
  | 'sdfPrimitives2D'    // circle/box/triangle outlines
  | 'sdfPrimitives3D'    // sphere/box/torus iso outlines
  | 'sdfBoolean'         // union / intersection / subtract
  | 'sdfSmoothUnion'     // smooth-min comparison
  | 'domainRepeat'       // tiled domain
  | 'raymarch'           // sphere tracing steps
  | 'lambert'            // light dot normal hemisphere
  | 'fresnelCurve'       // Schlick approximation curve
  | 'aoSamples'          // 5 tap AO short rays
  | 'gammaCurve'         // linear vs sRGB curve
  | 'tonemapCurves'      // reinhard / aces / filmic
  | 'cosinePalette'      // 4 bands a/b/c/d
  | 'hsvWheel'           // colour wheel
  | 'mandelbrot'         // tiny rendering of the set
  | 'julia'              // Julia outline
  | 'burningShip'        // ship silhouette
  | 'ifsTriangle'        // Sierpinski triangle
  | 'voronoiF1F2'        // F1 cells vs F2 edges
  | 'domainWarp'         // wavy domain
  | 'reactionDiffusion'  // Gray-Scott spots
  | 'plasma';            // sinusoidal interference

export const DIAGRAMS: Record<DiagramKind, () => ReactNode> = {
  pipeline: () => createElement(Pipeline),
  gpuGrid: () => createElement(GpuGrid),
  uvGrid: () => createElement(UvGrid, { centred: false }),
  uvCentred: () => createElement(UvGrid, { centred: true }),
  trigWave: () => createElement(TrigWave),
  dotProduct: () => createElement(DotProduct),
  smoothstepCurve: () => createElement(SmoothstepCurve),
  noiseStack: () => createElement(NoiseStack),
  fbmOctaves: () => createElement(FbmOctaves),
  sdfRings: () => createElement(SdfRings),
  sdfPrimitives2D: () => createElement(SdfPrimitives2D),
  sdfPrimitives3D: () => createElement(SdfPrimitives3D),
  sdfBoolean: () => createElement(SdfBoolean),
  sdfSmoothUnion: () => createElement(SdfSmoothUnion),
  domainRepeat: () => createElement(DomainRepeat),
  raymarch: () => createElement(Raymarch),
  lambert: () => createElement(Lambert),
  fresnelCurve: () => createElement(FresnelCurve),
  aoSamples: () => createElement(AoSamples),
  gammaCurve: () => createElement(GammaCurve),
  tonemapCurves: () => createElement(TonemapCurves),
  cosinePalette: () => createElement(CosinePalette),
  hsvWheel: () => createElement(HsvWheel),
  mandelbrot: () => createElement(Mandelbrot),
  julia: () => createElement(Julia),
  burningShip: () => createElement(BurningShip),
  ifsTriangle: () => createElement(IfsTriangle),
  voronoiF1F2: () => createElement(VoronoiF1F2),
  domainWarp: () => createElement(DomainWarp),
  reactionDiffusion: () => createElement(ReactionDiffusion),
  plasma: () => createElement(Plasma),
};
