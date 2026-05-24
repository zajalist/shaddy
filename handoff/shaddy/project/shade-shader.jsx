// shade-shader.jsx — Tiny live shader canvas used as the "main canvas" preview.
// Real GLSL via WebGL; one shared GL context per <ShadeCanvas/> instance.
// Cheap plasma + ripple + palette so all 7 screens can run side-by-side.

const ShadeCanvas = ({ variant = 'plasma', className = '', style }) => {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;

    const vsrc = `
      attribute vec2 p;
      void main(){ gl_Position = vec4(p,0.,1.); }
    `;

    // variant -> small fragment program. All output to gl_FragColor.
    const fsByVariant = {
      plasma: `
        precision highp float;
        uniform vec2 R; uniform float T;
        void main(){
          vec2 uv = (gl_FragCoord.xy - 0.5*R) / R.y;
          float t = T * 0.35;
          float v = 0.0;
          v += sin(uv.x*3.5 + t);
          v += sin(uv.y*4.2 - t*1.1);
          v += sin((uv.x+uv.y)*2.8 + t*0.7);
          v += sin(length(uv*1.6 + vec2(sin(t*0.5), cos(t*0.4)))*5.0 - t);
          v *= 0.25;
          vec3 a = vec3(0.05, 0.02, 0.18);
          vec3 b = vec3(0.85, 0.25, 0.55);
          vec3 c = vec3(0.20, 0.85, 0.95);
          vec3 d = vec3(0.95, 0.75, 0.20);
          vec3 col = mix(a,b, 0.5+0.5*sin(v*3.14));
          col = mix(col, c, 0.5+0.5*sin(v*2.0 + 1.2));
          col = mix(col, d, 0.20*(0.5+0.5*sin(v*1.6 + t*0.3)));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      ripple: `
        precision highp float;
        uniform vec2 R; uniform float T;
        void main(){
          vec2 uv = (gl_FragCoord.xy - 0.5*R) / R.y;
          float t = T*0.6;
          float r = length(uv);
          float a = atan(uv.y, uv.x);
          float w = sin(r*16.0 - t*2.0) * 0.5 + 0.5;
          float w2 = sin(a*5.0 + r*8.0 - t*1.3) * 0.5 + 0.5;
          vec3 c1 = vec3(0.08, 0.04, 0.22);
          vec3 c2 = vec3(0.95, 0.4, 0.65);
          vec3 c3 = vec3(0.3, 0.9, 1.0);
          vec3 col = mix(c1, c2, w);
          col = mix(col, c3, w2*0.55);
          col *= 1.0 - r*0.6;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      swirl: `
        precision highp float;
        uniform vec2 R; uniform float T;
        void main(){
          vec2 uv = (gl_FragCoord.xy - 0.5*R) / R.y;
          float t = T * 0.4;
          float r = length(uv);
          float a = atan(uv.y, uv.x) + r*3.0 - t;
          vec2 q = vec2(cos(a), sin(a)) * r;
          float v = sin(q.x*6.0 + t) + sin(q.y*7.0 - t*1.2);
          v *= 0.5;
          vec3 c1 = vec3(0.78, 0.18, 0.45);
          vec3 c2 = vec3(0.95, 0.78, 0.25);
          vec3 c3 = vec3(0.12, 0.05, 0.25);
          vec3 col = mix(c3, c1, 0.5+0.5*sin(v*3.14));
          col = mix(col, c2, 0.35*(0.5+0.5*cos(v*2.0+t*0.5)));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    };

    const fsrc = fsByVariant[variant] || fsByVariant.plasma;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, vsrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const ploc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(ploc);
    gl.vertexAttribPointer(ploc, 2, gl.FLOAT, false, 0, 0);

    const Rloc = gl.getUniformLocation(prog, 'R');
    const Tloc = gl.getUniformLocation(prog, 'T');

    let raf;
    const start = performance.now();
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(Rloc, w, h);
      }
    };
    const tick = () => {
      resize();
      gl.uniform1f(Tloc, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [variant]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  );
};

window.ShadeCanvas = ShadeCanvas;
