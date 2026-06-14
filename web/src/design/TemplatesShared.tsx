import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { SHADE, TYPE } from './tokens';

// ONE WebGL context for all 12 template tiles. Each tile is a regular CSS
// grid item (transparent bg, just borders + labels); the canvas behind them
// renders all 12 shaders into the corresponding viewport region per frame.
// Replaces the previous per-tile-canvas approach which spun up too many
// WebGL contexts and Chromium killed them all.

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0., 1.); }
`;

export type TemplateVariant =
  | 'terrain' | 'nebula' | 'dna' | 'ocean' | 'lava' | 'molecule'
  | 'galaxy' | 'aurora' | 'fire' | 'crystals' | 'wormhole' | 'raymarch';

const BODY: Record<TemplateVariant, string> = {
  // procedural terrain — fbm heightfield with sun hill-shading + sky
  terrain: `
    vec2 p = uv*1.6 + vec2(T*0.035, 0.0);
    float e = 0.012;
    float h  = fbm(p*1.7);
    float hx = fbm((p + vec2(e, 0.0))*1.7);
    float hy = fbm((p + vec2(0.0, e))*1.7);
    vec3 nor = normalize(vec3(h - hx, e*2.2, h - hy));
    vec3 sun = normalize(vec3(-0.55, 0.6, -0.35));
    float dif = clamp(dot(nor, sun), 0.0, 1.0);
    float sky = clamp(0.5 + 0.5*nor.y, 0.0, 1.0);
    vec3 c = mix(vec3(0.03,0.20,0.46), vec3(0.80,0.71,0.46), smoothstep(0.42,0.47,h));
    c = mix(c, vec3(0.16,0.43,0.18), smoothstep(0.47,0.57,h));
    c = mix(c, vec3(0.40,0.34,0.30), smoothstep(0.64,0.74,h));
    c = mix(c, vec3(0.95,0.96,1.00), smoothstep(0.80,0.88,h));
    col = c * (0.25*sky + 1.05*dif) + vec3(0.04,0.05,0.08)*sky;
  `,
  // interstellar gas cloud + sprinkled stars
  nebula: `
    vec2 p = uv*1.2;
    float n = fbm(p*2.0 + vec2(T*0.04, 0.0));
    n = fbm(p*3.0 + n*1.6 + T*0.02);
    col = mix(vec3(0.05,0.02,0.12), vec3(0.48,0.10,0.58), smoothstep(0.30,0.70,n));
    col = mix(col, vec3(0.13,0.34,0.88), smoothstep(0.52,0.92,n));
    col += vec3(0.95) * pow(max(0.0, hash(floor(uv*130.0)) - 0.985)*60.0, 2.0);
  `,
  // double helix — lightweight procedural strands + base-pair rungs.
  // (A full molecular DNA raymarcher is gorgeous but far too heavy to run as
  // one of 12 always-on preview tiles — it belongs in the composer at full
  // size. This reads clearly as a helix and renders for free.)
  dna: `
    float t = T*0.9;
    float ph = uv.y*9.0 + t;
    float x1 = 0.34*sin(ph);
    float x2 = 0.34*sin(ph + 3.14159);
    float d1 = cos(ph)*0.5 + 0.5;
    float d2 = cos(ph + 3.14159)*0.5 + 0.5;
    col = vec3(0.02,0.03,0.07);
    float bar = smoothstep(0.035, 0.0, abs(fract(uv.y*4.5 + t*0.16) - 0.5));
    float between = step(min(x1,x2), uv.x) * step(uv.x, max(x1,x2));
    col += vec3(0.92,0.86,0.55) * bar * between * 0.55;
    col += vec3(0.10,0.95,0.85) * (0.35 + 0.65*d1) * smoothstep(0.055, 0.0, abs(uv.x - x1));
    col += vec3(0.98,0.26,0.66) * (0.35 + 0.65*d2) * smoothstep(0.055, 0.0, abs(uv.x - x2));
  `,
  // open water — the real Seascape raymarcher (see PRE.ocean)
  ocean: `
    float time = T*0.3;
    vec3 ang = vec3(sin(time*3.0)*0.06, sin(time)*0.12 + 0.06, time);
    vec3 ori = vec3(0.0, 2.2, time*5.0);
    vec2 suv = uv*2.0;
    vec3 dir = normalize(vec3(suv, -1.7)); dir.z += length(suv)*0.14;
    dir = normalize(dir) * oc_euler(ang);
    vec3 p;
    oc_trace(ori, dir, p);
    vec3 dist = p - ori;
    vec3 n = oc_normal(p, dot(dist,dist) * (0.1 / R.x));
    vec3 light = normalize(vec3(0.0, 1.0, 0.8));
    col = mix(oc_sky(dir), oc_sea(p, n, light, dir, dist), pow(smoothstep(0.0, -0.02, dir.y), 0.2));
    col = pow(col, vec3(0.65));
  `,
  // molten rock — turbulent flow with hot cracks
  lava: `
    vec2 p = uv*1.6;
    float f = fbm(p*2.0 + vec2(0.0, T*0.15));
    float cracks = fbm(p*4.0 - T*0.1);
    col = mix(vec3(0.06,0.01,0.0), vec3(0.62,0.05,0.0), smoothstep(0.30,0.55,f));
    col = mix(col, vec3(1.0,0.50,0.0), smoothstep(0.55,0.75,f));
    col = mix(col, vec3(1.0,0.95,0.55), pow(smoothstep(0.70,0.86,f), 2.0));
    col *= 0.65 + 0.7*cracks;
  `,
  // molecule — metaball atoms orbiting, glowing bonds
  molecule: `
    float t = T*0.7;
    float m = 0.0;
    for (int k = 0; k < 5; k++) {
      float fk = float(k);
      vec2 c = 0.55*vec2(sin(t + fk*1.3), cos(t*0.8 + fk*2.1));
      m += 0.055 / (dot(uv-c, uv-c) + 0.02);
    }
    col = mix(vec3(0.02,0.04,0.10), vec3(0.20,0.70,0.96), smoothstep(0.6,1.4,m));
    col += vec3(0.85,0.96,1.0) * pow(smoothstep(1.6,2.7,m), 2.0);
  `,
  // spiral galaxy — bright core, sweeping arms, stars
  galaxy: `
    float t = T*0.2;
    float a = atan(uv.y, uv.x);
    float r = length(uv);
    float arms = sin(a*2.0 + r*9.0 - t*4.0)*0.5 + 0.5;
    col = mix(vec3(0.03,0.02,0.08), vec3(0.50,0.22,0.66), arms*smoothstep(1.2,0.1,r));
    col += vec3(1.0,0.86,0.52) * pow(max(0.0, 1.0 - r*1.7), 3.0);
    col += vec3(0.9) * step(0.975, hash(floor(uv*110.0))) * 0.6;
  `,
  // aurora — drifting light curtains over a starfield
  aurora: `
    float t = T*0.4;
    float curtain = fbm(vec2(uv.x*2.0 + t*0.3, t*0.1));
    float mid = (curtain - 0.5)*1.2;
    col = vec3(0.02,0.03,0.08);
    col += vec3(0.10,0.92,0.52) * smoothstep(0.26, 0.0, abs(uv.y - mid));
    col += vec3(0.42,0.20,0.92) * smoothstep(0.40, 0.0, abs(uv.y - mid - 0.22)) * 0.55;
    col += vec3(0.9) * step(0.985, hash(floor(uv*95.0))) * 0.5;
  `,
  // fire — turbulent flame shaped by an envelope so it reads as a flame
  fire: `
    vec2 p = uv*vec2(1.3, 1.0);
    float n  = fbm(p*3.0 + vec2(0.0, -T*1.6));
    n += 0.5 * fbm(p*6.0 - vec2(0.0, T*2.4));
    float env = 1.0 - smoothstep(0.0, 1.05, length(vec2(uv.x*1.7, uv.y + 0.55)));
    float fl = clamp(n * env * 1.7, 0.0, 1.0);
    col = vec3(0.03,0.01,0.0);
    col = mix(col, vec3(0.85,0.10,0.0), smoothstep(0.12,0.40,fl));
    col = mix(col, vec3(1.0,0.55,0.0),  smoothstep(0.40,0.66,fl));
    col = mix(col, vec3(1.0,0.95,0.62), smoothstep(0.72,0.95,fl));
  `,
  // crystals — voronoi cells, each a different gem colour
  crystals: `
    vec2 q = uv*3.0; vec2 vi = floor(q); vec2 vf = fract(q);
    float md = 8.0; vec2 mc = vec2(0.0);
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
      vec2 g = vec2(float(x), float(y));
      vec2 hh = fract(sin(vec2(dot(vi+g, vec2(127.1,311.7)), dot(vi+g, vec2(269.5,183.3)))) * 43758.5);
      vec2 rr = g + (0.5 + 0.5*sin(T + 6.2831*hh)) - vf;
      float d = dot(rr, rr);
      if (d < md) { md = d; mc = vi + g; }
    }
    float ch = fract(sin(dot(mc, vec2(12.9, 78.2))) * 43758.5);
    vec3 gem = 0.55 + 0.45*cos(6.2831*(ch + vec3(0.0, 0.33, 0.66)));
    col = gem * (0.35 + 0.65*smoothstep(0.0, 0.42, sqrt(md)));
  `,
  // wormhole — rainbow polar tunnel rushing inward
  wormhole: `
    float t = T*0.4;
    float a = atan(uv.y, uv.x);
    float rr = length(uv) + 0.001;
    float depth = 1.0 / rr;
    col = 0.5 + 0.5*cos(depth*0.6 + a*3.0 + vec3(0.0, 2.0, 4.0) + t);
    col *= smoothstep(0.0, 0.06, rr);
  `,
  // raymarched 3D ball — lambert + specular, the "game graphics" door
  raymarch: `
    vec3 ro = vec3(0.0, 0.0, -2.6);
    vec3 rd = normalize(vec3(uv, 1.5));
    float b = dot(ro, rd);
    float c = dot(ro, ro) - 1.0;
    float disc = b*b - c;
    col = mix(vec3(0.04,0.05,0.09), vec3(0.10,0.12,0.22), 0.5 + 0.5*uv.y);
    if (disc > 0.0) {
      float tHit = -b - sqrt(disc);
      vec3 pos = ro + rd*tHit;
      vec3 nor = normalize(pos);
      vec3 ld = normalize(vec3(sin(T), 0.7, -0.6));
      float dif = max(dot(nor, ld), 0.0);
      float spec = pow(max(dot(reflect(-ld, nor), -rd), 0.0), 32.0);
      vec3 base = vec3(0.97,0.46,0.16);
      col = base*(0.14 + 0.95*dif) + spec*vec3(1.0);
    }
  `,
};

// Global-scope helper functions some variants need (defined before main()).
const PRE: Partial<Record<TemplateVariant, string>> = {
  // Adapted from "Seascape" by Alexander Alekseev / TDM (CC BY-NC-SA 3.0).
  // Trimmed iteration counts; reuses the shared hash(). Renders at tile size,
  // so full quality is cheap.
  ocean: `
    float oc_noise(vec2 p){
      vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
      return -1.0+2.0*mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }
    mat3 oc_euler(vec3 a){
      vec2 a1=vec2(sin(a.x),cos(a.x)),a2=vec2(sin(a.y),cos(a.y)),a3=vec2(sin(a.z),cos(a.z));
      mat3 m;
      m[0]=vec3(a1.y*a3.y+a1.x*a2.x*a3.x,a1.y*a2.x*a3.x+a3.y*a1.x,-a2.y*a3.x);
      m[1]=vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
      m[2]=vec3(a3.y*a1.x*a2.x+a1.y*a3.x,a1.x*a3.x-a1.y*a3.y*a2.x,a2.y*a3.y);
      return m;
    }
    float oc_diffuse(vec3 n,vec3 l,float p){ return pow(dot(n,l)*0.4+0.6,p); }
    float oc_specular(vec3 n,vec3 l,vec3 e,float s){ float nrm=(s+8.0)/(3.141592*8.0); return pow(max(dot(reflect(e,n),l),0.0),s)*nrm; }
    vec3 oc_sky(vec3 e){ e.y=(max(e.y,0.0)*0.8+0.2)*0.8; return vec3(pow(1.0-e.y,2.0),1.0-e.y,0.6+(1.0-e.y)*0.4)*1.1; }
    float oc_oct(vec2 uv,float choppy){ uv+=oc_noise(uv); vec2 wv=1.0-abs(sin(uv)); vec2 swv=abs(cos(uv)); wv=mix(wv,swv,wv); return pow(1.0-pow(wv.x*wv.y,0.65),choppy); }
    float oc_map(vec3 p){
      float freq=0.16,amp=0.6,choppy=4.0; float st=1.0+T*0.8; vec2 uv=p.xz; uv.x*=0.75;
      float d,h=0.0; mat2 m=mat2(1.6,1.2,-1.2,1.6);
      for(int i=0;i<2;i++){ d=oc_oct((uv+st)*freq,choppy); d+=oc_oct((uv-st)*freq,choppy); h+=d*amp; uv*=m; freq*=1.9; amp*=0.22; choppy=mix(choppy,1.0,0.2); }
      return p.y-h;
    }
    float oc_mapD(vec3 p){
      float freq=0.16,amp=0.6,choppy=4.0; float st=1.0+T*0.8; vec2 uv=p.xz; uv.x*=0.75;
      float d,h=0.0; mat2 m=mat2(1.6,1.2,-1.2,1.6);
      for(int i=0;i<4;i++){ d=oc_oct((uv+st)*freq,choppy); d+=oc_oct((uv-st)*freq,choppy); h+=d*amp; uv*=m; freq*=1.9; amp*=0.22; choppy=mix(choppy,1.0,0.2); }
      return p.y-h;
    }
    vec3 oc_sea(vec3 p,vec3 n,vec3 l,vec3 eye,vec3 dist){
      float fr=clamp(1.0-dot(n,-eye),0.0,1.0); fr=min(fr*fr*fr,0.5);
      vec3 refl=oc_sky(reflect(eye,n));
      vec3 refr=vec3(0.0,0.09,0.18)+oc_diffuse(n,l,80.0)*vec3(0.48,0.54,0.36)*0.12;
      vec3 c=mix(refr,refl,fr);
      float att=max(1.0-dot(dist,dist)*0.001,0.0);
      c+=vec3(0.48,0.54,0.36)*(p.y-0.6)*0.18*att;
      c+=oc_specular(n,l,eye,60.0);
      return c;
    }
    vec3 oc_normal(vec3 p,float eps){ vec3 n; n.y=oc_mapD(p); n.x=oc_mapD(vec3(p.x+eps,p.y,p.z))-n.y; n.z=oc_mapD(vec3(p.x,p.y,p.z+eps))-n.y; n.y=eps; return normalize(n); }
    float oc_trace(vec3 ori,vec3 dir,out vec3 p){
      float tm=0.0,tx=1000.0; float hx=oc_map(ori+dir*tx);
      if(hx>0.0){ p=ori+dir*tx; return tx; }
      float hm=oc_map(ori);
      for(int i=0;i<8;i++){ float tmid=mix(tm,tx,hm/(hm-hx)); p=ori+dir*tmid; float hmid=oc_map(p); if(hmid<0.0){tx=tmid;hx=hmid;}else{tm=tmid;hm=hmid;} }
      return mix(tm,tx,hm/(hm-hx));
    }
  `,
};

// Hover-to-play: heavy "hero" shaders rendered ONLY for the tile under the
// cursor (one at a time), so the full-quality raymarchers never run ×12. Each
// has an optional preamble (HERO_PRE, global functions) + a main body (HERO).
const HERO_PRE: Partial<Record<TemplateVariant, string>> = {
  // Full molecular DNA — adapted from "Splitting DNA" by BigWings (CC BY-NC-SA).
  dna: `
    #define DNA_STEPS 70
    #define DNA_MIND 0.1
    #define DNA_MAXD 1000.
    #define DNA_PREC 0.1
    #define HS(x,y,z) smoothstep(x,y,z)
    #define hsat(x) clamp(x,0.,1.)
    float dsmth = .6;
    float dhr = 1.0, dnr = 2.264, dcr = 2.674, dor = 2.102, dpr = 3.453;
    vec3 dhc = vec3(1.);
    vec3 dnc = vec3(.1,.1,1.);
    vec3 dcc = vec3(.1);
    vec3 doc = vec3(1.,.1,.1);
    vec3 dpc = vec3(1.,.75,.3);
    float dtwopi = 6.283185307179586;
    vec3 dbg = vec3(.1,.5,1.);
    vec3 d_up = vec3(0.,1.,0.);
    float dN1(float x){ return fract(sin(x)*5346.1764); }
    float dN2(float x,float y){ return dN1(x + y*23414.324); }
    float dN3(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    struct dray { vec3 o; vec3 d; };
    struct dcam_t { vec3 p; vec3 forward; vec3 left; vec3 up; vec3 center; vec3 i; dray r; vec3 lookAt; float zoom; };
    struct drc { vec3 id; vec3 h; vec3 p; vec3 c; };
    struct dde { float d; float m; vec3 col; vec3 id; float spread; vec3 pos; vec3 nor; };
    dcam_t dcam;
    drc dRepeat(vec3 pos, vec3 size){ drc o; o.h=size*.5; o.id=floor(pos/size); o.p=mod(pos,size)-o.h; o.c=o.id*size+o.h; return o; }
    void dCameraSetup(vec2 uv, vec3 position, vec3 lookAt, float zoom){
      dcam.p=position; dcam.lookAt=lookAt; dcam.forward=normalize(dcam.lookAt-dcam.p);
      dcam.left=cross(d_up,dcam.forward); dcam.up=cross(dcam.forward,dcam.left); dcam.zoom=zoom;
      dcam.center=dcam.p+dcam.forward*dcam.zoom; dcam.i=dcam.center+dcam.left*uv.x+dcam.up*uv.y;
      dcam.r.o=dcam.p; dcam.r.d=normalize(dcam.i-dcam.p);
    }
    float dsmin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
    vec2 dsmin2(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return vec2(mix(b,a,h)-k*h*(1.-h),h); }
    float dsmax(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(a,b,h)+k*h*(1.-h); }
    float dSph(vec3 p,vec3 pos,float s){ return (length(p-pos)-s)*.9; }
    vec3 dBack(vec3 r){ float y=3.14159*0.5-acos(r.y); return dbg*(1.+y); }
    vec4 dAdenine(vec3 p){
      float b=dSph(p,vec3(29.52,6.64,3.04),11.019); if(b>0.) return vec4(dbg,b+1.);
      float h=dSph(p,vec3(22.44,13.63,3.04),dhr); h=min(h,dSph(p,vec3(21.93,0.28,3.04),dhr)); h=min(h,dSph(p,vec3(26.08,-1.19,3.04),dhr)); h=min(h,dSph(p,vec3(39.04,3.98,3.04),dhr));
      float n=dSph(p,vec3(23.18,7.49,3.04),dnr); n=min(n,dSph(p,vec3(28.39,11.95,3.04),dnr)); n=min(n,dSph(p,vec3(24.43,0.75,3.04),dnr)); n=min(n,dSph(p,vec3(32.79,2.79,3.04),dnr)); n=min(n,dSph(p,vec3(34.93,8.83,3.04),dnr));
      float c=dSph(p,vec3(24.50,11.22,3.04),dcr); c=min(c,dSph(p,vec3(25.75,4.47,3.04),dcr)); c=min(c,dSph(p,vec3(29.65,5.2,3.04),dcr)); c=min(c,dSph(p,vec3(30.97,8.93,3.04),dcr)); c=min(c,dSph(p,vec3(36.06,5.03,3.04),dcr));
      vec2 i=dsmin2(h,n,dsmth); vec3 col=mix(dnc,dhc,i.y); i=dsmin2(i.x,c,dsmth); col=mix(dcc,col,i.y); return vec4(col,i.x);
    }
    vec4 dThymine(vec3 p){
      float b=dSph(p,vec3(12.96,5.55,3.04),10.466); if(b>0.) return vec4(dbg,b+1.);
      float o=dSph(p,vec3(18.171,-.019,3.04),dor); o=min(o,dSph(p,vec3(15.369,13.419,3.04),dor));
      float h=dSph(p,vec3(19.253,7.218,3.04),dhr); h=min(h,dSph(p,vec3(12.54,-3.449,4.534),dhr)); h=min(h,dSph(p,vec3(7.625,-1.831,4.533),dhr)); h=min(h,dSph(p,vec3(10.083,-2.64,0.052),dhr));
      float n=dSph(p,vec3(16.77,6.7,3.04),dnr); n=min(n,dSph(p,vec3(10.251,8.846,3.04),dnr));
      float c=dSph(p,vec3(10.541,-1.636,3.04),dcr); c=min(c,dSph(p,vec3(11.652,2.127,3.04),dcr)); c=min(c,dSph(p,vec3(15.531,2.936,3.04),dcr)); c=min(c,dSph(p,vec3(9.012,5.082,3.04),dcr)); c=min(c,dSph(p,vec3(14.13,9.655,3.04),dcr));
      vec2 i=dsmin2(h,n,dsmth); vec3 col=mix(dnc,dhc,i.y); i=dsmin2(i.x,c,dsmth); col=mix(dcc,col,i.y); i=dsmin2(i.x,o,dsmth); col=mix(doc,col,i.y); return vec4(col,i.x);
    }
    vec4 dCytosine(vec3 p){
      float b=dSph(p,vec3(14.556,5.484,3.227),10.060); if(b>0.) return vec4(dbg,b+1.);
      float c=dSph(p,vec3(11.689,1.946,3.067),dcr); c=min(c,dSph(p,vec3(15.577,2.755,3.067),dcr)); c=min(c,dSph(p,vec3(14.176,9.474,3.067),dcr)); c=min(c,dSph(p,vec3(9.058,4.9,3.067),dcr));
      float n=dSph(p,vec3(18.412,0.342,3.067),dnr); n=min(n,dSph(p,vec3(16.816,6.519,3.067),dnr)); n=min(n,dSph(p,vec3(10.297,8.665,3.067),dnr));
      float h=dSph(p,vec3(6.526,3.015,3.067),dhr); h=min(h,dSph(p,vec3(10.61,-1.045,3.067),dhr)); h=min(h,dSph(p,vec3(18.805,-2.297,3.067),dhr)); h=min(h,dSph(p,vec3(20.95,0.584,3.067),dhr));
      float o=dSph(p,vec3(15.415,13.237,3.067),dor);
      vec2 i=dsmin2(c,n,dsmth); vec3 col=mix(dnc,dcc,i.y); i=dsmin2(i.x,h,dsmth); col=mix(dhc,col,i.y); i=dsmin2(i.x,o,dsmth); col=mix(doc,col,i.y); return vec4(col,i.x);
    }
    vec4 dGuanine(vec3 p){
      float b=dSph(p,vec3(29.389,8.944,3.227),12.067); if(b>0.) return vec4(dbg,b+1.);
      float c=dSph(p,vec3(24.642,11.602,3.067),dcr); c=min(c,dSph(p,vec3(31.111,9.311,3.067),dcr)); c=min(c,dSph(p,vec3(29.79,5.576,3.067),dcr)); c=min(c,dSph(p,vec3(25.893,4.854,3.067),dcr)); c=min(c,dSph(p,vec3(36.19,5.409,3.067),dcr));
      float n=dSph(p,vec3(22.56,14.31,3.067),dnr); n=min(n,dSph(p,vec3(23.32,7.867,3.067),dnr)); n=min(n,dSph(p,vec3(28.538,12.325,3.067),dnr)); n=min(n,dSph(p,vec3(32.934,3.164,3.067),dnr)); n=min(n,dSph(p,vec3(35.07,9.209,3.067),dnr));
      float h=dSph(p,vec3(20.044,14.723,3.04),dhr); h=min(h,dSph(p,vec3(22.852,16.965,3.04),dhr)); h=min(h,dSph(p,vec3(20.856,7.404,3.067),dhr)); h=min(h,dSph(p,vec3(39.187,4.352,3.067),dhr));
      float o=dSph(p,vec3(24.7,1.893,3.067),dor);
      vec2 i=dsmin2(c,n,dsmth); vec3 col=mix(dnc,dcc,i.y); i=dsmin2(i.x,h,dsmth); col=mix(dhc,col,i.y); i=dsmin2(i.x,o,dsmth); col=mix(doc,col,i.y); return vec4(col,i.x);
    }
    vec4 dBackbone(vec3 p){
      float b=dSph(p,vec3(0.,7.03,0.),10.572); if(b>0.) return vec4(dbg,b+1.);
      float c=dSph(p,vec3(1.391,8.476,-0.708),dcr); c=min(c,dSph(p,vec3(5.173,9.661,-0.708),dcr)); c=min(c,dSph(p,vec3(6.342,10.028,3.061),dcr)); c=min(c,dSph(p,vec3(0.222,8.109,3.061),dcr)); c=min(c,dSph(p,vec3(0.658,4.4,4.8871),dcr));
      float h=dSph(p,vec3(-5.853,0.,2.213),dhr); h=min(h,dSph(p,vec3(5.4512,12.437,-2.216),dhr)); h=min(h,dSph(p,vec3(6.986,7.541,-2.216),dhr)); h=min(h,dSph(p,vec3(-1.726,10.517,4.39),dhr)); h=min(h,dSph(p,vec3(3.203,2.519,4.691),dhr)); h=min(h,dSph(p,vec3(-1.619,3.162,3.063),dhr));
      float o=dSph(p,vec3(-4.918,1.599,0.344),dor); o=min(o,dSph(p,vec3(-1.471,0.995,-5.1),dor)); o=min(o,dSph(p,vec3(-0.836,6.288,-1.438),dor)); o=min(o,dSph(p,vec3(3.282,9.068,5.391),dor)); o=min(o,dSph(p,vec3(-6.286,5.299,-4.775),dor));
      float ph=dSph(p,vec3(-3.377,3.544,-2.742),dpr);
      o=min(o,dSph(p,vec3(-6.286,5.299,6.558),dor)); ph=min(ph,dSph(p,vec3(-3.377,3.544,8.592),dpr));
      vec2 i=dsmin2(c,h,dsmth); vec3 col=mix(dhc,dcc,i.y); i=dsmin2(i.x,o,dsmth); col=mix(doc,col,i.y); i=dsmin2(i.x,ph,dsmth); col=mix(dpc,col,i.y); return vec4(col,i.x);
    }
    vec4 dmap(vec3 p, vec3 id, float spread, float getColor){
      p.z+=2.4; vec4 col; vec3 bp=p; bp.x=22.5-bp.x; float side=sign(bp.x); bp.x=22.5-abs(bp.x)+spread; bp.z=bp.z*side-min(0.,side)*5.;
      vec4 b=dBackbone(bp);
      vec4 c=vec4(1000.); vec4 g=vec4(1000.); vec3 cp=p; vec3 gp=p;
      float n=dN3(id);
      if(n<.5){ cp.xz=-cp.xz+vec2(46.,6.); gp.xz=-gp.xz+vec2(46.,6.); }
      cp.x+=spread; gp.x-=spread;
      if(mod(floor(n*4.),2.)==0.){ c=dCytosine(cp); g=dGuanine(gp); } else { g=dAdenine(gp); c=dThymine(cp); }
      col.a=min(b.a,min(c.a,g.a));
      if(getColor!=0.){ if(col.a==b.a) col.rgb=b.rgb; else if(col.a==c.a) col.rgb=c.rgb; else col.rgb=g.rgb; }
      return col;
    }
    dde dCast(dray r){
      float t=T*.3; dde o; o.m=-1.0; vec3 p=vec3(0.); float d=DNA_MIND; drc q;
      vec3 center=vec3(19.12,7.09,3.09); float spread; vec3 grid=vec3(180.,180.,11.331);
      for(int i=0;i<DNA_STEPS;i++){
        p=r.o+r.d*d; float oz=p.z;
        q=dRepeat(p,grid); float sd=length(q.c.xy-center.xy);
        p.z+=t*200.*HS(800.,100.,sd); float n=dN2(q.id.x,q.id.y);
        p.y+=sin(n*dtwopi+p.z*.003+t)*50.*HS(300.,500.,sd);
        q=dRepeat(p,grid);
        float z2=dsmax(0.,abs(oz*.03)-6.,2.); float s=sin(z2); float cc2=cos(z2);
        oz*=.012; spread=max(0.,6.-oz*oz); spread*=spread; spread*=HS(250.,1.,length(q.id.xy*grid.xy+q.h.xy-r.o.xy));
        vec3 rC=((2.*step(0.,r.d)-1.)*q.h-q.p)/r.d; float dC=min(min(rC.x,rC.y),rC.z)+.01;
        float dS=DNA_MAXD;
        vec2 bla=q.p.xy-center.xy;
        if(dot(bla,r.d.xy)>0. && length(bla)>50.){ dC=min(rC.x,rC.y)+1.; }
        else { q.p-=center; mat2 m=mat2(cc2,-s,s,cc2); q.p.xy*=m; q.p+=center; dC=rC.z+.01; dS=dmap(q.p,q.id,spread,0.).a; }
        if(dS<DNA_PREC||d>DNA_MAXD) break;
        d+=min(dS,dC);
      }
      if(d<DNA_MAXD){ o.m=1.; o.d=d; o.id=q.id; o.spread=spread; o.pos=q.p; }
      return o;
    }
    vec4 dnmap(dde o, vec3 offs){ return dmap(o.pos+offs,o.id,o.spread,0.); }
    dde dProps(dde o){
      vec3 eps=vec3(.001,0.,0.); vec3 p=o.pos-eps.yyx; vec4 c=dmap(p,o.id,o.spread,1.); o.col=c.rgb;
      vec3 nor=vec3(dnmap(o,eps.xyy).a-dnmap(o,-eps.xyy).a, dnmap(o,eps.yxy).a-dnmap(o,-eps.yxy).a, dnmap(o,eps.yyx).a-c.a);
      o.nor=normalize(nor); return o;
    }
    vec3 dAtomMat(dde o, vec3 rd){
      o=dProps(o); vec3 R2=reflect(dcam.r.d,o.nor); vec3 ref=dBack(R2);
      float dif=dot(d_up,o.nor)*.5+.5; dif=mix(.3,1.,dif); vec3 col=o.col*dif;
      float fres=1.-hsat(dot(o.nor,-rd)); fres=pow(fres,.5);
      float upd=dot(rd,vec3(0.,1.,0.));
      col=mix(col,ref,fres*.5*HS(.8,.0,upd)); col*=HS(.9,.2,upd);
      col=mix(col,dbg,HS(0.,1000.,o.d)); return col;
    }
    vec3 dRender(vec2 uv2, dray camRay){
      dbg=dBack(dcam.r.d); vec3 col=dbg; dde o=dCast(camRay);
      if(o.m>0.) col=dAtomMat(o,dcam.r.d);
      return col;
    }
  `,
};

const HERO: Partial<Record<TemplateVariant, string>> = {
  dna: `
    vec2 duv = uv * 0.92;
    float tt = T * 0.2;
    vec3 camPos = vec3(-60.0 + sin(tt)*180.0, -80.0 + sin(tt*0.5)*250.0, 0.0);
    vec3 hpos = vec3(-cos(tt)*3.0, -cos(tt*0.5)*3.0, -4.0);
    dCameraSetup(duv, camPos + hpos, camPos, 1.0);
    col = dRender(duv, dcam.r);
  `,
};

const fragSrc = (variant: TemplateVariant, hero = false) => `
precision highp float;
uniform vec2 R;
uniform vec2 O;   // viewport origin in canvas pixels (this tile's bottom-left)
uniform float T;

// shared helpers — value noise + 5-octave fbm (used by terrain/nebula/ocean/…)
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a*vnoise(p); p *= 2.02; a *= 0.5; }
  return v;
}

// Per-variant global helper functions (Seascape etc. need real functions, which
// can't live inside main()). Hero (hover) variant uses its own preamble.
${(hero ? HERO_PRE[variant] : undefined) ?? PRE[variant] ?? ''}

void main(){
  // gl_FragCoord is framebuffer-absolute. Subtract the viewport origin so the
  // tile's center maps to uv=0 instead of the canvas center.
  vec2 uv = (gl_FragCoord.xy - O - 0.5 * R) / R.y;
  vec3 col = vec3(0.0);
  ${(hero ? HERO[variant] : undefined) ?? BODY[variant]}
  // gentle edge fade only — keep the tile bright and readable
  col *= 1.0 - 0.30 * smoothstep(0.55, 1.5, length(uv));
  gl_FragColor = vec4(col, 1.0);
}
`;

export type Template = {
  name: string;
  hint: string;
  variant: TemplateVariant;
};

export const TemplatesShared = ({
  templates,
  style,
}: { templates: Template[]; style?: CSSProperties }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<Array<HTMLDivElement | null>>([]);
  // index of the tile under the cursor — its hero (heavy) shader renders live.
  const hoveredRef = useRef<number | null>(null);

  // lazy mount the WebGL context only when the section is near the viewport
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e) setActive(e.isIntersecting);
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      // keep the drawn frame readable so screenshots/thumbnails don't capture
      // blank between frames (negligible cost for a small preview grid).
      preserveDrawingBuffer: true,
    });
    if (!gl) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);

    const compile = (type: number, src: string, name: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn(`TemplatesShared ${name} compile:`, gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT, 'vertex');
    if (!vs) return;

    type ProgEntry = {
      prog: WebGLProgram;
      Rloc: WebGLUniformLocation | null;
      Tloc: WebGLUniformLocation | null;
      Oloc: WebGLUniformLocation | null;
    };
    const buildProgram = (src: string, name: string): ProgEntry | null => {
      const fs = compile(gl.FRAGMENT_SHADER, src, name);
      if (!fs) return null;
      const prog = gl.createProgram();
      if (!prog) return null;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, 'p');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn(`TemplatesShared link ${name}:`, gl.getProgramInfoLog(prog));
        return null;
      }
      return {
        prog,
        Rloc: gl.getUniformLocation(prog, 'R'),
        Tloc: gl.getUniformLocation(prog, 'T'),
        Oloc: gl.getUniformLocation(prog, 'O'),
      };
    };

    const programs: Partial<Record<TemplateVariant, ProgEntry>> = {};
    const variants = new Set<TemplateVariant>(templates.map((t) => t.variant));
    for (const v of variants) {
      const p = buildProgram(fragSrc(v), `fragment ${v}`);
      if (p) programs[v] = p;
    }

    // Hero (heavy) programs compiled lazily the first time a tile is hovered —
    // keeps page load cheap and only one hero ever runs at a time.
    const heroPrograms: Partial<Record<TemplateVariant, ProgEntry | null>> = {};
    const getHero = (v: TemplateVariant): ProgEntry | null => {
      if (!HERO[v]) return null;
      if (heroPrograms[v] === undefined) {
        heroPrograms[v] = buildProgram(fragSrc(v, true), `hero ${v}`);
      }
      return heroPrograms[v] ?? null;
    };

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    let stopped = false;
    let raf = 0;
    const start = performance.now();
    const STATIC_T = 14.0; // frozen "nice frame" time for un-hovered tiles
    let prevW = 0;
    let prevH = 0;
    let prevHovered: number | null = null;
    // Tiles needing a one-off static (re)paint. Seeded with all of them; a tile
    // is re-added when the canvas resizes or when the cursor leaves it.
    const dirty = new Set<number>();
    for (let i = 0; i < templates.length; i++) dirty.add(i);

    // Draw one tile into its own scissor region at time `t`. Each tile owns the
    // best shader available (hero if defined, else the light variant); hero
    // programs compile lazily here on first paint.
    const drawTile = (i: number, t: number): void => {
      const tile = tileRefs.current[i];
      const tpl = templates[i];
      if (!tile || !tpl) return;
      const r = tile.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const wr = wrapper.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const localX = r.left - wr.left;
      const localTop = r.top - wr.top;
      const tileH = r.height;
      const localBottom = wr.height - localTop - tileH;
      const x = Math.floor(localX * dpr);
      const y = Math.floor(localBottom * dpr);
      const w = Math.max(1, Math.floor(r.width * dpr));
      const h = Math.max(1, Math.floor(tileH * dpr));
      const p = getHero(tpl.variant) ?? programs[tpl.variant];
      if (!p) return;
      // clear + draw ONLY this tile's region; everything else keeps its frame
      // (preserveDrawingBuffer is on), so static tiles cost nothing.
      gl.viewport(x, y, w, h);
      gl.scissor(x, y, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(p.prog);
      if (p.Rloc) gl.uniform2f(p.Rloc, w, h);
      if (p.Oloc) gl.uniform2f(p.Oloc, x, y);
      if (p.Tloc) gl.uniform1f(p.Tloc, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const tick = () => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);

      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const wrapperRect = wrapper.getBoundingClientRect();
      const W = Math.max(1, Math.floor(wrapperRect.width * dpr));
      const H = Math.max(1, Math.floor(wrapperRect.height * dpr));
      if (canvas.width !== W || canvas.height !== H || W !== prevW || H !== prevH) {
        canvas.width = W;
        canvas.height = H;
        prevW = W;
        prevH = H;
        // a resize blows away the preserved buffer → repaint every tile
        gl.viewport(0, 0, W, H);
        gl.scissor(0, 0, W, H);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (let i = 0; i < templates.length; i++) dirty.add(i);
      }

      const time = (performance.now() - start) / 1000;
      const hov = hoveredRef.current;

      // when the cursor leaves a tile, freeze it back to a clean static frame
      if (prevHovered !== null && prevHovered !== hov) dirty.add(prevHovered);
      prevHovered = hov;

      if (hov !== null) {
        // animate ONLY the hovered tile — at most one heavy shader per frame
        drawTile(hov, time);
      } else if (dirty.size > 0) {
        // progressive static paint: a couple of tiles per frame so the initial
        // render never fires a dozen heavy shaders in one frame
        let n = 0;
        for (const i of dirty) {
          drawTile(i, STATIC_T);
          dirty.delete(i);
          if (++n >= 2) break;
        }
      }
      // idle (no hover, nothing dirty) → no draws at all; tiles stay frozen.
    };
    tick();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      // No loseContext — see FractalEntity for why. DOM removal frees it.
    };
  }, [active, templates]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        maxWidth: 1180, margin: '4rem auto 0', padding: '0 2rem',
        ...style,
      }}
    >
      {/* shared canvas behind all tiles — covers full wrapper so its
          coordinate system matches getBoundingClientRect math below. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        ref={gridRef}
        style={{
          position: 'relative', zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        {templates.map((t, i) => (
          <div
            key={t.name}
            ref={(el) => { tileRefs.current[i] = el; }}
            onMouseEnter={() => { hoveredRef.current = i; }}
            onMouseLeave={() => { if (hoveredRef.current === i) hoveredRef.current = null; }}
            title="Hover to animate"
            style={{
              position: 'relative',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 3,
              overflow: 'hidden',
              aspectRatio: '4 / 3',
              cursor: 'pointer',
              transition: 'border-color 0.25s',
            }}
          >
            {/* scrim for label legibility */}
            <div
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(11,12,14,0.0) 50%, rgba(11,12,14,0.78) 100%)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute', left: 12, top: 12,
                font: `700 9px ${TYPE.bodyMono}`,
                color: 'rgba(254,231,199,0.65)',
                letterSpacing: '0.22em', textTransform: 'uppercase',
                mixBlendMode: 'difference',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>
            <div
              style={{
                position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 1,
              }}
            >
              <div style={{ font: `700 15px ${TYPE.display}`, color: SHADE.cream, letterSpacing: '-0.01em' }}>
                {t.name}
              </div>
              <div
                style={{
                  font: `500 10.5px ${TYPE.bodyMono}`,
                  color: 'rgba(254,231,199,0.7)',
                  letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 3,
                }}
              >
                {t.hint}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
