// GLSL-literal formatters for default values + ad-hoc emission.

import type { ParamValue } from './types';

export function glslFloat(n: number): string {
  const s = Number(n.toFixed(6)).toString();
  return s.includes('.') ? s : `${s}.0`;
}

export function glslLiteral(v: ParamValue): string {
  if (typeof v === 'number') return glslFloat(v);
  if (typeof v === 'string') return v; // for `custom` block raw code
  if (v.length === 2) return `vec2(${glslFloat(v[0])}, ${glslFloat(v[1])})`;
  return `vec3(${glslFloat(v[0])}, ${glslFloat(v[1])}, ${glslFloat(v[2])})`;
}

export function substitutePlaceholders(
  template: string,
  mapper: (paramName: string) => string,
): string {
  return template.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (_, key) => mapper(key as string));
}
