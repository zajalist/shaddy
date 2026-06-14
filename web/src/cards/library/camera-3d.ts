// 3D Camera — sets the ray origin (eye), look-at target and focal length for
// the raymarcher. Without it the scene uses the editor's orbit camera; add it
// to frame a fixed shot (e.g. looking across an ocean toward the horizon).

import type { CardDef } from '../types';

export const CAMERA_3D: CardDef = {
  type: 'camera_3d',
  category: 'distortion',
  friendlyName: 'Camera (3D)',
  description: 'Set eye position, look-at target and focal length.',
  icon: '🎥',
  mode: '3d',
  params: {
    eye_x: { kind: 'float', label: 'eye x', default: 0, min: -10, max: 10, step: 0.1 },
    eye_y: { kind: 'float', label: 'eye y', default: 3, min: -10, max: 20, step: 0.1 },
    eye_z: { kind: 'float', label: 'eye z', default: 0, min: -10, max: 10, step: 0.1 },
    tgt_x: { kind: 'float', label: 'target x', default: 0, min: -10, max: 10, step: 0.1 },
    tgt_y: { kind: 'float', label: 'target y', default: 1.4, min: -10, max: 20, step: 0.1 },
    tgt_z: { kind: 'float', label: 'target z', default: -6, min: -20, max: 10, step: 0.1 },
    fov: { kind: 'float', label: 'focal', default: 1.6, min: 0.4, max: 4, step: 0.05 },
  },
  snippetTemplate: '// camera_3d (3D) eye=({{eye_x}},{{eye_y}},{{eye_z}}) target=({{tgt_x}},{{tgt_y}},{{tgt_z}}) fov={{fov}}',
  contribution3d: {
    camEye: 'vec3({{eye_x}}, {{eye_y}}, {{eye_z}})',
    camTarget: 'vec3({{tgt_x}}, {{tgt_y}}, {{tgt_z}})',
    camFov: '{{fov}}',
  },
};
