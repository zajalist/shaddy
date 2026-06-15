// Volume camera (3D) — sets the ray for a volumetric march: direction from uv
// (zoom) and a fly-through origin that advances with time (speed). Pairs with a
// density-field block + a Volume march block. Use in a 'volume' recipe.

import type { CardDef } from '../types';

export const VOLUME_CAMERA_3D: CardDef = {
  type: 'volume_camera_3d',
  category: 'shape',
  friendlyName: 'Volume camera',
  description: 'Ray + fly-through origin for a volumetric raymarch.',
  icon: '🎥',
  params: {
    zoom: { kind: 'float', label: 'zoom', default: 0.8, min: 0.2, max: 2, step: 0.01 },
    speed: { kind: 'float', label: 'speed', default: 0.02, min: 0, max: 0.2, step: 0.001 },
  },
  snippetTemplate: '// volume_camera zoom={{zoom}} speed={{speed}}',
  contribution3d: {
    volCam: 'vDir = vec3(uv * 0.5 * {{zoom}}, 1.0); vTime = u_time * {{speed}} + 0.25; vFrom = vec3(1.0, 0.5, 0.5) + vec3(vTime * 2.0, vTime, -2.0);',
  },
};
