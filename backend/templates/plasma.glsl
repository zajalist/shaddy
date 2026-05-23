#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float t = u_time * /*PARAM:time_scale*/;
    float v = sin(uv.x * /*PARAM:freq_x*/ + t)
            + sin(uv.y * /*PARAM:freq_y*/ + t + /*PARAM:phase*/);
    vec3 c = mix(/*PARAM:color_a*/, /*PARAM:color_b*/, 0.5 + 0.5 * sin(v));
    fragColor = vec4(c, 1.0);
}
