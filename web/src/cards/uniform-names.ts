// The single authority on the NAMES of compiler-generated uniforms.
//
// Every uniform the 2D/3D compiler emits for a card's parameters is named by an
// encoder here, and the one recognizer regex is kept in lockstep with them — so
// the reverse parser's literal-bake and the dangling-uniform guard can never
// drift from the scheme the compiler actually emits. Before this module the
// `u_card{i}_…` convention was re-stated in four places (uniformNameFor,
// attrUniformNameFor, anim's local `u()`, and the guard regex); changing it
// meant moving four things in lockstep. Now there is one place.
//
// Variants — `cardIndex` is the card's position in its pass:
//   param  u_card{i}_{key}             a plain card parameter
//   attr   u_card{i}_a{n}_{key}        a scoped-attribute parameter (attr n)
//   anim   u_card{i}_{key}_{suffix}    an animated param's endpoint (min/max/…)

/** Name the uniform for a plain card parameter. */
export function encodeParam(cardIndex: number, paramKey: string): string {
  return `u_card${cardIndex}_${paramKey}`;
}

/** Name the uniform for a scoped-attribute parameter. */
export function encodeAttr(cardIndex: number, attrIndex: number, paramKey: string): string {
  return `u_card${cardIndex}_a${attrIndex}_${paramKey}`;
}

/** Name an animated parameter's endpoint uniform (suffix = min/max/speed/…). */
export function encodeAnim(cardIndex: number, paramKey: string, suffix: string): string {
  return `u_card${cardIndex}_${paramKey}_${suffix}`;
}

/** Matches any compiler-generated card / attr / anim uniform OR a multi-pass
 *  buffer sampler (`u_buffer_a..d`). The dangling-uniform guard uses this to
 *  find references a wildcard body makes that the build may not declare. Kept
 *  in sync with the encoders above — the uniform-names round-trip test asserts
 *  every encoder's output is recognized by this pattern.
 *
 *  NOTE: `encodeAnim`'s `_{suffix}` is absorbed by the `_[A-Za-z0-9_]+` tail
 *  (it's shaped like a param whose key is `{key}_{suffix}`), so one alternation
 *  covers both param and anim. */
export const UNIFORM_REF_RE = /\bu_(?:card\d+(?:_a\d+)?_[A-Za-z0-9_]+|buffer_[a-d])\b/g;
