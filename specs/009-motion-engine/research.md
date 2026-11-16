# Research — Phase 009: Motion Engine

Decisions R1–R12. "Observed" = measured in this repository; "reported" = public documentation not yet
verified here (re-checked during implementation). Builds on 008.0 research R0–R14 and ADRs 0018–0020.

## R1 — Starting point (what 008.0 already proves)

Implemented and verified in 008.0: frame scheduler with read/update/write phases; spring integrator;
per-element transform composer (layers, one write per frame, restoration); reduced-motion policy;
Tilt3D as a controller + hook + component. Missing for a catalogue of 157 entries: a uniform effect
definition, channel claims beyond `transform`, conflict detection, a driver-independent controller,
tweens/easing, motion values, defaults, and a React bridge shared by all effect components. Each piece
below is the smallest generalisation of something Tilt3D already does by hand.

## R2 — Registry: global or explicit?

Options:

- (a) **Global, side-effectful registry** (`registerEffect()` at import time; look up by string id).
  Convenient for string APIs (`<Motion effect="fade-up">`), but every imported module becomes a side
  effect (breaks `sideEffects` tree-shaking), two copies of the package split the registry, and SSR
  requests share mutable state.
- (b) **Definitions are plain values; registries are explicit values.** `defineEffect()` returns a
  frozen definition object that is imported directly (tree-shakeable). A `createEffectRegistry([…])`
  builds a lookup only where an application wants string ids (presets in CMS-driven pages, devtools).
- (c) Class hierarchy (`class TiltEffect extends Effect`) — heavier, worse minification, no benefit.

Decision (ADR 0021): **(b)**. The registry is a data structure, not a hidden singleton. Effect ids
are namespaced `family/name` (e.g. `hover/tilt-3d`), matching the catalogue ids and family subpaths.

## R3 — What an effect definition must declare

Derived from the catalogue legend (driver, structure, reduced motion) and the composition contract:

| Field                           | Why                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `family`                  | lookup, diagnostics, docs generation                                                                                                                           |
| `channels`                      | conflict detection before anything is written (R4)                                                                                                             |
| `priority`                      | deterministic arbitration of exclusive channels (R5)                                                                                                           |
| `reducedMotion`                 | declared behaviour (`off`/`fade`/`instant`/`static`/`reduced`), enforced by the host                                                                           |
| `defaults` + `resolve(options)` | one validation path for TypeScript and JavaScript consumers (as Tilt3D)                                                                                        |
| `setup(context)`                | creates the instance: receives the element, resolved options, channel handles, scheduler, reduced-motion state; returns `{ update, pause?, resume?, destroy }` |

`structure` and `driver` stay catalogue metadata (docs) rather than runtime fields: the runtime only
needs what it enforces.

## R4 — Channels: modes and the ledger

Generalising ADR 0019: every effect instance claims channels through the element's **motion host**
(one per element, weakly held). Modes:

| Mode        | Channels (initial set)                                                                        | Combination                               |
| ----------- | --------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `compose`   | `transform`                                                                                   | layers through the transform composer     |
| `multiply`  | `opacity`                                                                                     | product of contributions, one write/frame |
| `exclusive` | `filter`, `clip-path`, `mask`, `translate`, `rotate`, `scale`, custom `--neshel-*` properties | one owner at a time (R5)                  |

The individual transform properties become **exclusive** channels claimed by CSS-driven effects
(presets add classes); two presets setting `translate` on one element were previously a silent
last-rule-wins case. Writes go only through channel handles, so the host knows every writer.
Reported: WAAPI `composite: "add"` lets keyframe animations add to `transform` natively in current
engines; useful for a future WAAPI layer driver, not required for 009.

## R5 — Conflict detection and arbitration

Options for two claims on one exclusive channel:

- (a) last attach wins silently — the bug this phase exists to remove;
- (b) throw — safe in tests, hostile in production (one decorative effect could crash a page);
- (c) **arbitrate deterministically and report**: higher `priority` owns the channel; on equal
  priority the earlier claim keeps it; the loser enters `suspended` (applies nothing) and resumes
  automatically when the channel frees. Report through a conflict policy: `"warn"` (development
  default: one `console.warn` naming both effect ids, the element and the channel), `"error"` (throws
  `NeshelAnimationsError`; for tests/CI), `"silent"` (production default).

Decision (ADR 0022): **(c)**. Policy is resolved per host from an explicit option or `NODE_ENV`; no
provider needed. `getMotionDebugInfo(element)` returns claims, owners, suspended instances and layer
counts (development and tests). Limitation documented: styles applied by consumers' own CSS cannot
be detected; inline `transform` replacement keeps the 008 warning.

## R6 — Motion controllers

One controller interface for every driver:

```ts
interface MotionControl {
  readonly state: "idle" | "running" | "paused" | "finished" | "cancelled";
  readonly finished: Promise<void>; // resolves on finish, rejects never; settles on cancel
  play(): void;
  pause(): void;
  reverse(): void;
  cancel(): void;
  finish(): void;
  seek?(progress: number): void; // tweens and timelines only
}
```

Drivers in 009: **JS** (scheduler; springs and tweens on motion values) and **WAAPI** (keyframes on
an element channel via the host). CSS presets (class toggles) arrive with the presets in 010 and
implement the same interface where meaningful. Springs are interruptible: retargeting keeps velocity
(008 behaviour); tweens interrupted by a new animation start from the current value.
`finished` resolves (not rejects) on cancel with `state === "cancelled"` to avoid unhandled
rejections in fire-and-forget usage; reported precedent: WAAPI rejects `finished` on cancel, which is
a common source of noise.

## R7 — Motion values

A `MotionValue<number>` (get, set, subscribe, velocity) lets controllers drive non-style targets (a
counter, a canvas, a WebGL uniform) and lets effects share a value (scroll progress in 011) without
React state. Writes are batched into the scheduler's write phase when bound to a channel. Only
numbers in 009; colours and unit-aware strings are deferred (interpolation of colours needs a colour
space decision, 015).

## R8 — Easing and interpolation

- Easings: `linear`, cubic-bézier (`cubicBezier(x1, y1, x2, y2)` solved by Newton + bisection),
  named presets (`standard`, `emphasized`, `decelerate`, `accelerate`) and `steps()`.
- `springEasing(options, { points? })` samples a spring into CSS `linear()` plus a duration (008
  research R4) so CSS and WAAPI drivers keep spring character; falls back to a cubic-bézier
  approximation when `linear()` is unsupported (reported universal in current engines; verified by
  the browser matrix in 009.5).
- Interpolation helpers: `clamp`, `mix`, `progress`, `mapRange` (pure, tiny).

## R9 — Motion defaults (D5)

Defaults live in Animations:

- Typed `motionDefaults` (durations `instant 0`, `fast 120ms`, `normal 200ms`, `slow 320ms`,
  `deliberate 500ms`; easings above; distances `sm 4px`, `md 8px`, `lg 16px`; spring presets
  `gentle`, `snappy`, `bouncy`).
- The same values as `--neshel-motion-*` custom properties. Declaring them on `:root` from the
  package stylesheet was rejected: library stylesheets add no global rules beyond documented opt-in
  styles (ADR 0008). Decision: effect rules read them with fallbacks
  (`var(--neshel-motion-duration-normal, 200ms)`), so effects work with no declaration at all, and
  applications (or the future generated Config stylesheet) override them on `:root` or any subtree.
- Future Config integration (additive, ADR 0024): `defineConfig({ motion: {...} })` as an optional new
  key that `neshel generate` turns into the same `--neshel-motion-*` properties in the generated
  stylesheet. No existing key, token, export or stylesheet changes; Animations never imports Config
  at runtime. Requires an owner-approved Config minor release, not part of 009.

## R10 — React bridge

`useMotionEffect(ref, definition, options)` attaches a definition to a ref with the 008 Tilt3D rules
(validate during render; create after mount; update on option value changes; destroy on unmount; no
per-frame state). `useMotionValue(initial)` returns a stable value; `useMotionValueEvent(value,
listener)` subscribes without re-rendering. Every effect component becomes a thin wrapper:
`Tilt3D = component(useMotionEffect(ref, tilt3D, props), asChild)`.

## R11 — Entry points in 009 (D3)

- `./core`: engine (framework-free) — adds registry, host/channels, controllers, motion values,
  easing, interpolation, defaults.
- `.`: React bindings of the engine (`useMotionEffect`, `useMotionValue`, `useMotionValueEvent`,
  `NeshelAnimationsError`).
- `./hover`: first family subpath (D3): `Tilt3D`, `useTilt3D`, `createTilt3D`, `tilt3D` definition.
  Tilt3D leaves the root entry (the package is private and unpublished, so there is no compatibility
  cost; the lab, Storybook and tests move with it).
- `./styles.css` unchanged in role; its rules read `--neshel-motion-*` with fallbacks and declare
  none globally.

## R12 — Verification additions

- Unit: registry, host ledger, arbitration (priorities, suspension/resume, policies), opacity
  multiplication, controllers per driver (state machine, finished semantics, reverse, retarget,
  cancel), easing accuracy (cubic-bézier vs reference samples), springEasing endpoints, motion values,
  React bridge lifecycles, Tilt3D unchanged behaviour (008 tests kept green).
- Browser: extend the lab with an engine page (conflict demo with lab-defined effects, controllers,
  WAAPI driver) and run it in **Chromium, Firefox and WebKit** through Playwright (the ADR 0016
  harness; `playwright` is already a root dev dependency) — closes the 008 pending engine checks.
- Packed external consumer: a generated Vite + SSR app installing the packed `animations` tarball
  (closes the 008 pending item; extends `check:consumer` with an opt-in variant).
- Bundles: an offline `check:bundles:animations` with budgets per entry (008 measurement method).
- Screen reader: manual owner pass of the lab (recorded, not automated).
