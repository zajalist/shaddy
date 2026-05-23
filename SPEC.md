# Shade — Master Spec

> A learning environment for shader art. Code and canvas are the same surface — drag the canvas to edit the code, edit the code to move the canvas. Drop in a photo and watch a shader gradient-descend toward it. One responsive web app, works on phone and desktop.

---

## ⚠️ Status update (2026-05-23): photo-match deferred, product is frontend-only

The **Photo → shader (gradient descent)** feature — the FastAPI / PyTorch backend, the `POST /optimize` endpoint, the WebSocket streaming, the differentiable PyTorch templates — is **deferred / out of scope for the current build**. Reasons + reversal path live in [`docs/decisions/2026-05-23-frontend-only.md`](./docs/decisions/2026-05-23-frontend-only.md).

What is still in scope: everything in §4 Tier 1, plus the **Lens stack** from Tier 2. The product is a pure WebGL/React playground that runs entirely in the browser.

The sections below that describe the backend (especially §3 architecture, §5 backend stack, §7 photo→shader impl, §10 ML role, §11 risks tied to GPU) are kept as **historical product context** so a future iteration can pick them up. Each such section is annotated below with a `🚫 DEFERRED` marker.

---

## 1. The pitch (60 seconds)

Shadertoy is the most distinctive native art form the GPU has produced — but it has no on-ramp. Blender and Unreal are built for production pipelines, not for the pure-math, single-fragment-shader aesthetic that defines Shadertoy culture.

**Shade is the bridge.** A creative tool where:

1. **The canvas and the code are the same thing.** Drag a shape on the canvas, the GLSL updates. Edit the GLSL, the canvas updates. Hover over `length(uv)` and see what that subexpression renders as. Users ramp from direct manipulation to writing shaders without noticing the transition.
2. **A "show the steps" mode** exposes every intermediate stage of the shader as a stack of thumbnails, making the invisible math visible.
3. **Photo → shader** via gradient descent. Upload an image; the GPU optimizes a procedural shader to match it. The output is a parameterized, infinitely-zoomable, animatable version of your photo — and you can crack open the generated GLSL.
4. **Works on your phone.** Single responsive web app. Touch gestures map to direct manipulation. Make a shader on the bus, share a URL.

The 30-second demo: judge takes the phone, drags a circle larger, sees the code change. Types a `sin(` in the code, sees the canvas ripple. Takes a photo of the room with their camera, taps "match," watches a shader morph into a procedural impression of what they just photographed. Hits share, gets a URL.

---

## 2. Why this stands out

- **Real product wedge.** Nobody owns "learning Shadertoy." Existing tools are either too production-heavy (Blender, TouchDesigner, Unreal) or too raw (Shadertoy itself, GLSL Sandbox).
- **Real technical depth.** Bidirectional code↔canvas binding is a non-trivial parsing problem. Gradient-descent-to-shader is genuine differentiable rendering. Not an API wrapper.
- **Real demo moment.** Phone-in-hand, photo-to-shader, hit share. Visceral.
- **Coherent vision.** One sentence: *"shaders should be as easy to learn as Scratch and as expressive as Shadertoy."*

---

## 3. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│                  SHADE WEB APP (responsive)                  │
│  - Same codebase on phone + desktop, layout adapts          │
│  - React + TypeScript + Vite                                │
│  - WebGL2 for shader rendering (works everywhere)           │
│                                                             │
│  Modules (folder-isolated, contracts in CONTRACTS.md):      │
│    renderer/    — shader compile, fullscreen quad, FBO      │
│    editor/      — CodeMirror, GLSL parsing, bindings        │
│    ux/          — layout, gestures, share URL               │
│    integration/ — wires them together (App.tsx, main.tsx)   │
│                                                             │
│  Nothing leaves the browser. URL-hash sharing only.         │
└─────────────────────────────────────────────────────────────┘
```

**Why one responsive web app instead of separate native phone app:** a native app doubles scope, and WebGL2 works on iOS Safari and Android Chrome. Touch events give us all the gestures we need. We get phone + desktop for the price of one codebase. The only thing we lose is App Store presence — irrelevant for a hackathon demo.

**Why no backend:** 🚫 DEFERRED. The original spec called for a FastAPI + PyTorch backend that ran gradient descent against differentiable shaders for the photo-match feature. That track has been cut for the current build (see the status callout at the top of this file). If/when it returns, the architecture below is the intended shape:

> **Why Python backend for gradient descent:** PyTorch on a server with CUDA is dramatically simpler than wrangling WebGPU compute shaders or ONNX in the browser, and a hackathon GPU instance (Modal, Replicate, RunPod, or a teammate's gaming desktop with ngrok) is enough.

---

## 4. Feature scope by tier

### Tier 1 — Must demo (the hero loop)

These are the non-negotiables. If any of these don't work, the demo collapses.

- **WebGL2 fragment shader renderer.** Single fullscreen quad, fragment shader hot-reloads on code change. Target 60fps on a mid-range phone.
- **Code editor pane.** Monaco or CodeMirror 6 with GLSL syntax highlighting. Compile errors shown inline.
- **Bidirectional binding — minimum viable.** Specific interactions only (don't try to make it fully general):
  - Numeric literals in the code are draggable: tap-and-hold on a number, drag to scrub. Slider appears.
  - Color literals (`vec3(r,g,b)`) get a color swatch in the gutter; tap to open color picker.
  - Canvas-side: a small set of recognized shapes can be dragged. v1 supports dragging the *center* of a `length(uv - vec2(X, Y))` pattern to update X and Y.
- **A starter library of ~12 templates.** Each is a 20–40-line shader that produces a recognizable aesthetic: circle, gradient, stripes, plasma, noise field, voronoi cells, simple raymarch sphere, etc. User picks one as a starting point.
- **Share via URL.** Entire shader source + parameters encoded in URL hash. No backend needed. Open URL on any device, see the same shader.

### Tier 2 — Strongly desired (the "whoa")

These are what take the demo from "neat tool" to "memorable." Pick at least one of (lens stack, photo→shader) to ship — both if time permits.

- **Lens stack view.** A side panel showing the shader as a vertical sequence of named operations, each with a live thumbnail of what the output looks like *at that step*. Implemented by re-running the shader N times with `discard` after line K. Toggleable.
- **Photo → shader (gradient descent).** 🚫 DEFERRED (server required; current build is frontend-only).
  - User uploads or captures a photo.
  - Client sends image + chosen template to Python backend.
  - Backend runs PyTorch optimization (Adam, ~500 iterations, perceptual loss via small pretrained VGG) on the template's exposed parameters.
  - Backend streams intermediate frames back via WebSocket so user watches it converge.
  - Final result: parameter values populate the template; user can keep editing.
- **Touch gestures on phone.** Pinch-to-zoom the canvas. Two-finger rotate. Long-press a number to scrub.

### Tier 3 — Nice to have (skip if behind)

- Account-free gallery: shares posted to a homepage feed. (Backend + DB needed — skip unless ahead of schedule.)
- "Remix" button on shared shaders.
- Animation timeline (`u_time` is already passed in, but a recorder that exports to GIF/MP4 is extra polish).
- Audio reactivity (`u_audio` uniform from mic FFT).
- SDF playground mode (the third paradigm from earlier — full mode-switch is too big for v1).

### Explicitly out of scope for v1

- HLSL support (browser doesn't run it natively; would need transpilation). GLSL only.
- Multi-pass shaders / render targets.
- Raymarching templates beyond one simple example.
- Native iOS/Android apps.
- User accounts, auth, social features.
- Vertex shader editing.
- 3D mesh import.

---

## 5. Tech stack

### Frontend (web app)

| Concern | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Team familiarity; ecosystem |
| Build | Vite | Fast dev loop, simple PWA support |
| Renderer | Raw WebGL2 (no Three.js) | Three.js is overkill for fullscreen-quad shaders; raw WebGL gives full control and smaller bundle |
| Editor | CodeMirror 6 | Lighter than Monaco on mobile; good touch support |
| GLSL parsing | `glsl-parser` (npm) | Needed for bidirectional binding — locate numeric literals, identify shape patterns |
| State | Zustand | Light, no boilerplate |
| Styling | Tailwind | Fast iteration |
| Mobile detection | CSS media queries + `pointer: coarse` | Touch vs mouse via standard APIs |

### Backend (gradient descent only) — 🚫 DEFERRED

Frozen for reference. Not built in the current iteration.

| Concern | Choice | Why |
|---|---|---|
| Server | FastAPI + WebSockets | Clean async, easy to deploy |
| ML | PyTorch | Mature autodiff, every example is in PyTorch |
| Loss | LPIPS (perceptual) + MSE blend | LPIPS captures style; MSE anchors color. Pure MSE produces blur. |
| Optimizer | Adam, lr=0.02, 500 iters | Standard, converges fast |
| Hosting | Modal or Replicate for demo day; local CUDA box during dev | Modal has generous free tier and serverless GPU |

### Differentiable shader implementation — 🚫 DEFERRED

If/when photo-match returns, the template shaders for photo-matching would be implemented **twice**:
1. As GLSL for the live renderer.
2. As a PyTorch function with identical math, so gradients flow.

(Today: only the GLSL side exists — see `web/src/renderer/templates/`. The 12 templates already cover plasma, voronoi-cells, and gradient-noise; a photo-match reimplementation would need to mirror their math in a differentiable form, ideally on the frontend via WebGL2 + manual gradients or TensorFlow.js to stay frontend-only.)

---

## 6. The bidirectional editor — implementation notes

This is the technically hardest part. Approach:

1. **Parse the GLSL on every change** using `glsl-parser`. Cache the AST.
2. **Decorate numeric literals** in the editor: every `float` or `int` literal gets a CodeMirror widget that responds to drag gestures. On drag, we mutate the source text in place at the literal's location.
3. **Pattern-match known idioms** in the AST to expose canvas-side handles:
   - `length(uv - vec2(X, Y)) - R` → draggable center + radius.
   - `vec3(R, G, B)` at the end of `main()` → color swatch.
   - `smoothstep(A, B, x)` → two threshold handles on a 1D strip overlay.
4. **Handle the inverse direction** by mutating the AST: when the user drags a handle, locate the literal node in the source, replace the text, re-render.

**Critical:** keep the source as the source of truth. Never store handle positions separately. The code IS the model. This is what makes the abstraction feel honest and what teaches users that they're editing GLSL.

**v1 cheat:** only support 3-4 specific recognized patterns. Anything else just shows as text. Users learn that recognized patterns get magic handles, which incentivizes them to write code in those idioms.

---

## 7. Photo → shader — implementation notes (🚫 DEFERRED)

```
[user uploads photo] → POST /optimize {template_id, image_base64}
                            ↓
                    server downsamples to 256x256
                            ↓
            instantiate PyTorch version of template
                with random initial parameters
                            ↓
            for step in 500:
                rendered = template(params)
                loss = lpips(rendered, target) + 0.1*mse(rendered, target)
                loss.backward()
                optimizer.step()
                every 25 steps:
                    websocket.send(current_params, preview_thumbnail)
                            ↓
            return final_params + generated GLSL with literals filled in
```

**Failure modes to design around:**
- **Local minima** producing muddy results: mitigate by running 3 random inits in parallel, returning the best by final loss.
- **Long convergence on bad hardware**: cap at 30 seconds wall-clock. Show progress bar.
- **No GPU available on demo day**: fallback to running on CPU at 64x64 — slower but still demoable.

---

## 8. UX layout

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│  Shade        [templates] [photo→]    [share]  [phone qr]  │
├──────────────────────────┬─────────────────────────────────┤
│                          │                                 │
│                          │   // fragment shader            │
│       LIVE CANVAS        │   void main() {                 │
│       (fullscreen        │     vec2 uv = ...               │
│        WebGL output)     │     float d = length(uv);       │
│                          │     gl_FragColor = ...           │
│                          │   }                              │
│                          │                                 │
│                          │   [lens stack toggle]            │
└──────────────────────────┴─────────────────────────────────┘
```

### Phone (<768px)

Canvas on top, editor below, swipe up on a handle to switch which fills the screen. Templates and photo-match in a bottom sheet.

```
┌──────────────────────┐
│   ☰  Shade      ⤴   │
├──────────────────────┤
│                      │
│    LIVE CANVAS       │
│                      │
│                      │
├──────────────────────┤   ← drag this handle up to expand editor
│  void main() {       │
│    ...               │
│  }                   │
├──────────────────────┤
│  [tmpl] [photo] [💾] │
└──────────────────────┘
```

---

## 9. Hackathon timeline (assumes ~36 hours, team of 3–4)

### Hour 0–4: setup + skeleton
- Repo, Vite, Tailwind, CodeMirror integrated.
- Bare WebGL2 renderer running a hardcoded shader.
- Editor pane edits a string, recompiles shader on change. **End of hour 4: editing GLSL in the textarea updates the canvas live.**

### Hour 4–12: core editor + templates
- GLSL parsing wired in.
- Numeric-literal scrubbing (the simplest bidirectional interaction).
- 8–12 starter templates.
- URL-hash sharing.
- Responsive layout. **End of hour 12: feature-complete Tier 1.**

### Hour 12–24: pick your "whoa"
- **Track A (recommended):** photo→shader backend. One template at first (plasma). Get the full loop working end-to-end before adding the others. Show streaming preview frames.
- **Track B (parallel if you have the people):** lens stack visualizer.
- Touch gestures pass on phone.

### Hour 24–32: polish + the demo
- Three photo-match templates working reliably.
- A handful of pre-loaded "remix this" example shaders.
- Smooth out the worst friction points (whatever you noticed during dev).
- **Practice the demo.** Run through the 60-second pitch 10 times. The demo is a feature.

### Hour 32–36: buffer + record backup demo video
- Always shoot a backup video of the demo working, in case demo-day wifi or the backend goes down.

---

## 10. Team roles (assuming 3–4 people)

- **Renderer / WebGL person.** Owns shader compilation, the canvas, performance, the template library.
- **Editor / parser person.** Owns CodeMirror integration, GLSL parsing, the bidirectional binding logic. Hardest job.
- **ML / backend person.** 🚫 DEFERRED — no backend to own this build. If photo-match returns this role comes back.
- **UX / mobile / demo person.** Owns layout, responsive design, touch gestures, the share flow, and rehearsing the pitch. Floats to help wherever's behind.

With photo-match cut, the lens stack is the headline Tier-2 "whoa".

---

## 11. Risks and what to do about them

| Risk | Likelihood | Mitigation |
|---|---|---|
| Bidirectional binding is harder than expected | High | Ship with just 2 recognized patterns (numeric scrub + color swatch). Don't promise general code↔canvas equivalence. |
| Photo→shader produces ugly results | 🚫 DEFERRED | Three random inits, return the best. Curate which photos you demo with — high-contrast, clear color palette photos work best. |
| Phone performance is bad | Medium | Test on a real mid-range phone weekly during dev. Cap canvas resolution on mobile. |
| Backend GPU times out during demo | 🚫 DEFERRED | Pre-record the photo→shader demo as a backup video. Always. |
| Scope creep | Very high | Tier 3 features are *not* in v1. Write this on a sticky note and put it on the wall. |

---

## 12. The judge-facing one-liner

> **Shade — learn shaders the way you learn music: by playing them. Drag the canvas, the code changes. Take a photo, a shader becomes it. Make GPU art on your phone, share with a URL.**

---

## 13. Open questions to resolve before kickoff

- What's the actual hackathon time window? Adjust §9 timeline accordingly.
- Who on the team has PyTorch experience? If nobody, drop photo→shader to Tier 3 and lead with the lens stack instead.
- Do you have a GPU for the backend, or do we need to budget time for Modal/Replicate setup?
- Are you comfortable demoing live, or do we need to pre-record?
