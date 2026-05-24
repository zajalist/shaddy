// Locked contract types for the Shade compiler. See the handoff doc for
// rationale. Any change to these shapes is a breaking change for the
// editor team and the renderer team — coordinate before edit.

export type Recipe = {
  version: 1;
  blocks: Block[];
  globalTempo: number;
  canvasAspect: 'square' | 'portrait' | 'landscape';
};

export type Block = {
  id: string;
  type: BlockType;
  enabled: boolean;
  params: Record<string, Parameter>;
};

export type BlockType = string;

export type Parameter = {
  value: ParamValue;
  animation: Animation | null;
};

export type ParamValue =
  | number
  | readonly [number, number]
  | readonly [number, number, number]
  | string;

export type Animation =
  | { type: 'sine'; min: number; max: number; speed: number; phase: number; mode: 'hz' | 'bpm' }
  | { type: 'noise_wiggle'; min: number; max: number; speed: number; mode: 'hz' | 'bpm' }
  | { type: 'pulse'; min: number; max: number; speed: number; duty: number; mode: 'hz' | 'bpm' }
  | { type: 'mouse_follow'; min: number; max: number; axis: 'x' | 'y' }
  | {
      type: 'color_cycle';
      colorA: readonly [number, number, number];
      colorB: readonly [number, number, number];
      speed: number;
      mode: 'hz' | 'bpm';
    };

export type BlockDef = {
  type: BlockType;
  category: 'shape' | 'distortion' | 'color' | 'effect' | 'custom';
  friendlyName: string;
  icon: string;
  description: string;
  params: Record<string, ParamDef>;
  glsl: string;
  helpers?: string[];
};

export type ParamDef = {
  kind: 'number' | 'vec2' | 'color' | 'string';
  default: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  animatable: boolean;
};

export type CompileResult =
  | { ok: true; glsl: string; uniforms: UniformBinding[] }
  | { ok: false; error: CompileError; partialGlsl?: string };

export type UniformBinding = {
  name: string;
  type: 'float' | 'vec2' | 'vec3';
  source:
    | { kind: 'static'; blockId: string; paramName: string }
    | { kind: 'anim_min'; blockId: string; paramName: string }
    | { kind: 'anim_max'; blockId: string; paramName: string }
    | { kind: 'anim_speed'; blockId: string; paramName: string }
    | { kind: 'anim_phase'; blockId: string; paramName: string }
    | { kind: 'anim_duty'; blockId: string; paramName: string }
    | { kind: 'anim_color_a'; blockId: string; paramName: string }
    | { kind: 'anim_color_b'; blockId: string; paramName: string }
    | { kind: 'global_time' }
    | { kind: 'global_mouse' }
    | { kind: 'global_resolution' }
    | { kind: 'global_tempo_bps' };
};

export type CompileError = {
  code: 'unknown_block_type' | 'missing_param' | 'param_type_mismatch' | 'invalid_glsl';
  message: string;
  blockId?: string;
  paramName?: string;
};
