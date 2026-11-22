# Contract — Background & Ambient API (`@neshel-ui/animations/ambient`, B01–B10)

Family `ambient`; opt-in stylesheet `@neshel-ui/animations/ambient.css`. Every ambient effect is
**decorative**: its layers/canvases are package-owned, `aria-hidden="true"`, `pointer-events: none`, never
focusable, never duplicate accessible content, and are removed on destroy.

## §1 Lifecycle (shared by every ambient effect)

```ts
type AmbientState = "idle" | "running" | "paused" | "completed";
interface AmbientControl {
  readonly state: AmbientState;
  /** Why the effect is not moving right now (empty when running). */
  readonly blocked: ReadonlyArray<"offscreen" | "hidden" | "reduced" | "toggle" | "paused">;
  play(): void;
  pause(): void;
  stop(): void;
  destroy(): void;
}
interface AmbientOptions {
  /** ms of motion before resting (100–600000, default 5000) or Infinity (explicit; WCAG 2.2.2). */
  duration?: number;
  reducedMotion?: "user" | "always" | "never";
  /** "mount" (default) or "manual". */
  trigger?: "mount" | "manual";
}
```

- Moves only while: wanted (`play`), on screen (one **shared** `IntersectionObserver`), page visible (one shared
  `visibilitychange` listener), not reduced (live), not paused by the page switch, and time remains. Any other
  state costs zero scheduler tasks (JS effects) or `animation-play-state: paused` (CSS effects).
- CSS layers are paused by default in `ambient.css`; the engine sets `data-neshel-ambient="running"` on the
  package layer to run them — no-JS/SSR markup shows a static decoration.
- Page switch: `ambientMotion.pause()`, `.resume()`, `.paused`, `.subscribe(fn)`; `<AmbientMotionToggle>`
  renders a native `<button aria-pressed>` ("Pause background motion" by default) bound to it; it is the user
  mechanism when `duration: Infinity`. A development warning is logged once when an infinite effect starts and
  no toggle is mounted.
- Reduced (catalogue `static` for B01–B10): decoration shown still (CSS layers at their rest frame, canvases
  draw one static frame).

## §2 Canvas surface (internal `src/core/surface.ts`, B04/B05, M09)

```ts
interface CanvasSurface {
  readonly canvas: HTMLCanvasElement | undefined; readonly context: CanvasRenderingContext2D | undefined;
  readonly width: number; readonly height: number; readonly dpr: number; readonly lost: boolean;
  ensure(): CanvasRenderingContext2D | undefined;   // lazy creation
  onResize(fn): void; onRestore(fn): void;
  release(): void;                                    // width = height = 0, removed, observers disconnected
}
createCanvasSurface(container, { maxDpr = 2, className })
```

Size from `ResizeObserver` content boxes (no layout read), applied in the scheduler's write phase; DPR capped;
`contextlost` → drawing stops; `contextrestored` → full redraw; counters `surfaces`, `contexts`. One canvas per
effect; none while released.

## §3 Effects

| Id  | Engine                               | Key options (defaults; hard bounds)                                                                                                                                              | Technique                                                      |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| B01 | `createGradientShift(container, o)`  | `colors` 2–6, `angle` 0–360 (120), `speed` (cycle ms 4000–60000; 14000)                                                                                                          | oversized gradient layer, `transform` keyframes                |
| B02 | `createAurora(container, o)`         | `colors` 1–5, `blobs` 2–5 (3), `intensity` 0–1 (0.6), `speed` (cycle 8000–60000; 18000)                                                                                          | radial-gradient blobs, `transform` keyframes, no blur filter   |
| B03 | `createGrain(container, o)`          | `opacity` 0–0.3 (0.08), `scale` 0.5–4 (1), `jitter` false, `blend` (`overlay`)                                                                                                   | shared static SVG turbulence texture; jitter `steps()` ≤ 8 Hz  |
| B04 | `createParticles(container, o)`      | `density` per 100 000 px² 0–40 (8), `max` ≤ 400 (120), `size` 0.5–6 (1.6), `speed` 0–120 px/s (18), `color`, `links` false (≤ 150 particles), `seed`, `fps` 15–60 (60), `maxDpr` | Canvas 2D surface, seeded, wrap-around                         |
| B05 | `createStarfield(container, o)`      | `density` 0–80 (20), `max` ≤ 800 (360), `mode: "drift" \| "warp"`, `speed` 0–1 (0.25), `twinkle` 0–1 (0.3), `color`, `seed`, `fps`, `maxDpr`                                     | Canvas 2D surface, depth layers                                |
| B06 | `createGridPattern(container, o)`    | `pattern: "grid" \| "dots"`, `cell` 8–160 px (32), `lineWidth` 0.5–4, `color`, `direction` (`diagonal`), `speed` cell/s 0–2 (0.15), `fade` (radial mask)                         | pattern layer, seamless one-cell `transform` loop              |
| B07 | `createMeshGradient(container, o)`   | `colors` 3–6 (base + points), `speed` (cycle 10000–90000; 24000), `amplitude` 0–0.3 (0.12)                                                                                       | 4–5 radial-gradient point layers, `transform` keyframes        |
| B08 | `createFloatingShapes(container, o)` | `amplitude` 0–40 px (12), `rotate` 0–30° (6), `period` 2000–30000 (7000), `max` children ≤ 24                                                                                    | one loop task → host transform layer per child                 |
| B09 | `createPointerGlow(container, o)`    | `size` 80–1200 px (360), `color`, `intensity` 0–1 (0.35), `smoothing` 0–0.95 (0.2), `pointerTypes`                                                                               | core pointer tracker; one property pair per frame on the layer |
| B10 | `createWaves(container, o)`          | `layers` 1–4 (3), `amplitude` 4–80 px (18), `wavelength` 80–1600 px (600), `speed` (cycle 4000–60000; 12000), `colors`, `position` (`bottom`)                                    | package SVG paths (generated once), seamless `transform` loop  |

React: `GradientShift`, `Aurora`, `Grain`, `Particles`, `Starfield`, `GridPattern`, `MeshGradient`,
`FloatingShapes` (children are the shapes), `PointerGlow`, `Waves` — each renders `div.neshel-ambient`
(`position: relative; isolation: isolate`) around optional `children` (content stays above the decoration and
fully interactive) — plus `AmbientMotionToggle`. Engines append their layer to the container you pass and
require it to be a positioned box (documented; React components provide it).

## §4 Bounds and degradation

Option values outside bounds fail validation in development (clamped in production, ADR 0024 validator).
`fps` 30 and halved density under `low-power` hints (`navigator.hardwareConcurrency ≤ 4` or
`prefers-reduced-data`; best-effort, documented as heuristic). Hard caps are enforced, never configurable
past.
