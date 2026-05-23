#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 fragColor;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution * /*PARAM:cells*/;
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    float d = 1.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            vec2 p = g + hash21(i + g) * vec2(1.0);
            d = min(d, length(g + p - f));
        }
    }
    vec3 c = mix(/*PARAM:color_a*/, /*PARAM:color_b*/, d);
    fragColor = vec4(c, 1.0);
}
