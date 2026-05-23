// Default fragment shader used until the caller calls compile() with their
// own source. Animated three-channel gradient — proves the pipeline is
// wired (context, attributes, uniforms, frame loop).

export const DEBUG_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in  vec2 v_uv;
out vec4 fragColor;

uniform float u_time;

void main() {
  vec3 c = 0.5 + 0.5 * cos(u_time + v_uv.xyx * 3.14159 + vec3(0.0, 2.0, 4.0));
  fragColor = vec4(c, 1.0);
}
`;
