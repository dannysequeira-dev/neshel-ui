# Feature Specification: Animation system foundation (`@neshel-ui/animations`)

**Feature Branch**: `feature/008-animations` (spec directory `specs/008-animations`)

**Created**: 2026-11-15

**Status**: **008.0 implemented and verified locally; awaiting owner review.** Milestone 008.0
(architecture, contracts and technical spikes) is complete on the branch; nothing is pushed,
merged, versioned, tagged or published. `@neshel-ui/animations` is `private: true` at 0.0.0.
Phases 009–016 are planned only. Evidence: [evidence.md](evidence.md).

**Input**: Owner brief "Neshel-UI — Phase 008: Animation System Foundation" (2026-11-15),
summarised in [brief.md](brief.md).

Companion documents: [research.md](research.md) (R0–R14), [plan.md](plan.md), [tasks.md](tasks.md),
[analysis.md](analysis.md), [evidence.md](evidence.md); contracts
[package.md](contracts/package.md), [core-engine.md](contracts/core-engine.md),
[composition.md](contracts/composition.md), [tilt-3d.md](contracts/tilt-3d.md),
[accessibility.md](contracts/accessibility.md), [entry-points.md](contracts/entry-points.md),
[experiments.md](contracts/experiments.md), [catalog.md](contracts/catalog.md); ADRs
[0018](../../docs/decisions/0018-animation-system-architecture.md),
[0019](../../docs/decisions/0019-motion-composition-and-property-ownership.md),
[0020](../../docs/decisions/0020-motion-engine-dependency-policy.md).

## Problem

Neshel-UI has no motion layer. Applications that want reveals, pointer effects, scroll scenes,
page transitions or 3D effects must add an unrelated engine whose conventions (provider, `transform`
ownership, SSR behaviour, reduced motion, bundle cost) do not match the design system. The vision
listed an "animation framework" as non-MVP; with 0.1.0 published, the owner opens it as a new,
separately gated package.

## Goals (whole feature, phases 008–016)

1. A catalogue of 150+ effects in 15 families, built on a small set of shared primitives
   ([catalog.md](contracts/catalog.md)).
2. Layered architecture: React API → effects & presets registry → core engine → drivers (CSS,
   WAAPI, JS, optional GPU) → composition; accessibility and performance as cross-cutting rules.
3. Effects that combine on one element without conflicts (composition contract).
4. CSS first; JavaScript, WAAPI and GPU only where the effect needs them, loaded only when used.
5. Same distribution quality as the published packages: ESM, declarations, precompiled CSS, SSR,
   `asChild`, React 19, packed-artifact verification, three operating systems.

## Goals of milestone 008.0 (this execution)

1. Specification, research, contracts, catalogue and ADRs for the whole system.
2. A private, minimal, workspace-integrated `packages/animations` with the core primitives the
   experiments need — no speculative abstractions.
3. Experiment A (Tilt3D) as a functional package effect; experiments B (CornerRecede) and C
   (ScrollScene) as playground prototypes with documented findings.
4. Tests and evidence; a recommendation for Phase 009.

## Non-goals (008.0)

Implementing families beyond Tilt3D; an effect registry; presets; motion tokens in `config`;
timelines; gestures; View Transitions; the GPU entry; docs-site pages; publishing, versioning,
tagging, releasing, merging or pushing; changing any published package's API, the Changesets fixed
group or the release workflow; lifting any `private` guard.

## Clarifications

### Session 2026-11-15 — owner brief and agent decisions

The brief pre-authorises autonomous execution of 008.0 within its limits. Ambiguities resolved with
"the simplest coherent solution, documented":

- Q: Build an engine or adopt one? → A: own minimal core, platform first; third-party engines only
  per capability, after a comparative benchmark and an ADR (R1, ADR 0020).
- Q: Where does the engine live, given `core` is private? → A: inside the package as the
  framework-free `./core` subpath (R0, ADR 0018).
- Q: Which entry points now? → A: only implemented ones: `.`, `./core`, `./styles.css`; the family
  subpaths of the brief are evaluated, not created (R10). Owner decision D3: family subpaths are
  added as each family is implemented.

### Session 2026-11-15 (owner review of 008.0)

- D1: no publication until the agreed initial scope, including advanced families, is complete and
  verified. D2: independent version line. D3: family subpaths as implemented. D5: motion defaults
  inside Animations, future additive integration with Config. D7: Tilt3D inward by default, `reverse`
  inverts. Push of `feature/008-animations` and a PR against `main` authorised; no merge.
- Q: How do several animations share one element? → A: CSS effects own the individual transform
  properties; JS effects contribute layers to one per-element composer that owns `transform`
  (R5, ADR 0019).
- Q: Tilt3D keyboard behaviour? → A: no key handling; `:focus-visible` inside shows a gentle fixed
  pose; focus outlines untouched (R6).
- Q: Tilt3D hit area? → A: the untransformed layout box (found by the browser check, R6).
- Q: Can `check:pack` validate a private package? → A: yes, opt-in `--with <dir>`, which skips only
  the `publishConfig.access` rule and never applies to `core` or public packages (R0).

## User Scenarios & Testing

### User Story 1 — Tilt a card toward the pointer (P1)

A developer wraps a card in `<Tilt3D>` (or uses `asChild` on their own element). Moving a mouse or
pen over it tilts it in 3D; leaving springs it back. Keyboard users get a gentle pose on focus;
users who prefer reduced motion see a flat card.

**Independent test**: SSR markup, jsdom interaction tests and the Chrome lab
(`check:browser:animations`).

**Acceptance scenarios**:

1. **Given** the pointer at the top-right corner, **when** it rests there, **then** `rotateX` and
   `rotateY` approach `+maxTilt` (that corner recedes) and no React commit happens.
2. **Given** a tilted card, **when** the pointer leaves the layout box, **then** the card springs back
   (animated, not snapped) and the inline `transform`/`will-change` are removed at rest.
3. **Given** `prefers-reduced-motion: reduce`, **when** the pointer moves over the card, **then** no
   transform is applied; a live change of the preference snaps a tilted card to rest.
4. **Given** keyboard focus moves into the card, **then** it shows the focus pose; when focus leaves,
   it returns to rest.
5. **Given** the component unmounts, **then** every listener, frame task and inline style is removed.

### User Story 2 — Combine effects without conflicts (P1)

A CSS hover lift (`translate`) and the JavaScript tilt (`transform`) run on the same element and
both apply; two JavaScript layers on one element compose into one `transform`; removing one layer
restores the other.

**Independent test**: composer unit tests; browser case "composition".

### User Story 3 — Compare corner-recede techniques (P2)

A designer opens the lab and compares four techniques at the same amount, reading honest captions
about cost and limits.

**Independent test**: browser case "corner" (all four techniques respond; inert duplicate; 64 tiles;
WebGL status reported) and screenshots.

### User Story 4 — A scroll scene with depth (P2)

A reader scrolls through a pinned scene; layers move by depth, a caption fades by timeline segment,
the progress bar follows; resizing keeps progress consistent; smooth scrub lags and converges.

**Independent test**: browser cases "scene".

### Edge Cases

- Element mounted under a still pointer (no `pointerenter`): the first `pointermove` starts tracking.
- Page scroll or resize while hovering: the cached box is invalidated and re-measured lazily.
- Pointer leaves the window while hovering: `pointerleave` on the document element ends the tilt.
- Invalid options from JavaScript: `NeshelAnimationsError` on server and client alike.
- `asChild` with text, several children or a Fragment: `NeshelAnimationsError`.
- An inline `transform` already on the element: a one-time development warning; the composer
  replaces it while active and removes its own value at rest.
- A throwing frame task: reported (`reportError`), other tasks keep running.
- Background tab: frame delta clamped to 1/15 s, so springs never jump.
- No `requestAnimationFrame`/`matchMedia` (server): scheduling is a no-op; preference is "no reduce".
- WebGL unavailable: the lab reports `unavailable`; DOM techniques still work.

## Requirements

### Functional Requirements — package (FR-001–FR-010)

- **FR-001**: `packages/animations` is `@neshel-ui/animations`, `private: true`, version `0.0.0`, no
  `publishConfig`; it is outside the Changesets fixed group and the release guards.
- **FR-002**: Exports exactly `.`, `./core` (each `types` then `import`) and `./styles.css`;
  `sideEffects: ["**/*.css"]`; ESM only.
- **FR-003**: Peer `react ^19.0.0`; the only runtime dependency is `@radix-ui/react-slot`; no
  dependency on `@neshel-ui/core` or `@neshel-ui/components`.
- **FR-004**: `./core` modules import only each other (framework-free).
- **FR-005**: The root entry imports only `react`, `react/jsx-runtime` and `@radix-ui/react-slot`.
- **FR-006**: Modules importing React carry `"use client"`; core modules do not.
- **FR-007**: No module touches `window`, `document` or `matchMedia` at import time.
- **FR-008**: `./styles.css` is one `@layer components.neshel` block with only `.neshel-*`
  selectors, identical to the source; effects work without it.
- **FR-009**: The packed tarball passes `check:pack --with animations` (publint, attw, NodeNext and
  Bundler type resolution, runtime import, package contract).
- **FR-010**: Root runtime exports are exactly `Tilt3D`, `useTilt3D`, `createTilt3D`,
  `NeshelAnimationsError` (plus types).

### Functional Requirements — core engine (FR-020–FR-040)

- **FR-020**: `./core` exports exactly the API of [core-engine.md](contracts/core-engine.md).
- **FR-021**: The frame scheduler runs `read → update → write` per frame; tasks added to a later
  phase during a frame join that frame.
- **FR-022**: The spring integrator converges, rests exactly on target, is stable and frame-rate
  independent; invalid options throw `RangeError`.
- **FR-023**: Tasks repeat while they return `true`; cancellation is idempotent; the loop stops (no
  pending frame) when idle.
- **FR-024**: On the server, scheduling is a no-op and the reduced-motion preference is `false`.
- **FR-030**: `composeTransform` follows the rules of [composition.md](contracts/composition.md)
  (additive translations/rotations, multiplicative scale, strongest perspective, fixed order,
  identity → `none`, order-independent).
- **FR-031**: One composer per element; layers keyed by symbols.
- **FR-032**: At most one style write per element per frame, in the write phase.
- **FR-033**: Removing a layer restores the composition of the others; with no layer the inline
  `transform` and `will-change` are removed.
- **FR-034**: A one-time development warning when the composer replaces an inline `transform` it
  does not own.
- **FR-040**: Reduced-motion policy `user | always | never` per
  [accessibility.md](contracts/accessibility.md).

### Functional Requirements — Tilt3D (FR-050–FR-065)

As specified in [tilt-3d.md](contracts/tilt-3d.md):

- **FR-050**: Pointer position maps to rotations; default inward signs (D7) (top-right →
  `rotateX > 0`, `rotateY > 0`).
- **FR-051**: `maxTilt` (0–45°, default 10) and `perspective` (≥ 100 px, default 1000) control
  intensity and depth.
- **FR-052**: Leaving springs back to rest, animated; inline styles removed at rest.
- **FR-053**: `reverse`, `axis` and `scale` options; option changes apply without re-hovering.
- **FR-054**: Pointer movement causes no React render.
- **FR-055**: Mouse and pen by default; touch opt-in through `pointerTypes`.
- **FR-056**: `:focus-visible` inside shows the focus pose (35 % of `maxTilt`); `focusTilt={false}`
  disables it.
- **FR-057**: Reduced motion keeps the element flat, follows live preference changes, honours
  `"always"` and `"never"`.
- **FR-058**: `disabled` returns to rest and ignores the pointer.
- **FR-059**: Destroy/unmount removes every listener (element, window, document element, media
  query), cancels frames, removes inline styles and the state attribute; idempotent.
- **FR-060**: SSR markup is the element with the `neshel-tilt` class only.
- **FR-061**: `asChild` renders the single child element with merged class names and refs.
- **FR-062**: Invalid options and invalid `asChild` children throw `NeshelAnimationsError`.
- **FR-063**: Hydration produces no recoverable error.
- **FR-064**: `useTilt3D(ref, options)` attaches to a consumer-rendered element; consumer refs
  receive the element.
- **FR-065**: The hit area is the untransformed layout box.

### Functional Requirements — prototypes (FR-070–FR-085)

- **FR-070**: The lab shows four CornerRecede techniques (rigid plane, hinged fold, segmented
  tiles, WebGL mesh) driven by one amount (range input or core spring).
- **FR-071**: Captions and research state which techniques are rigid planes and which deform
  geometry; nothing rigid is called a deformation.
- **FR-072**: Duplicated content is `aria-hidden` and `inert`; the WebGL canvas has an accessible
  name; reduced motion jumps without animation.
- **FR-080**: CornerRecede and ScrollScene stay in the playground; their APIs are not approved.
- **FR-081**: ScrollScene pins with `position: sticky` and computes progress from cached geometry,
  re-measured on resize (no layout read per scroll).
- **FR-082**: Progress is written once per frame as `--scene-progress`; layers move by depth;
  timeline segments are pure functions of progress.
- **FR-083**: Optional smooth scrub (spring), disabled under reduced motion.
- **FR-084**: A native `animation-timeline: view()` demo is a progressive enhancement.

### Functional Requirements — verification and governance (FR-090–FR-110)

- **FR-090**: `pnpm check:browser:animations` runs the lab in headless Chrome with real pointer and
  keyboard input, live reduced-motion emulation, scroll, resize and axe; it fails in CI without a
  browser and skips locally.
- **FR-091**: `pnpm check` validates the animations tarball (`--with animations`).
- **FR-092**: Storybook documents Tilt3D (experimental).
- **FR-100**: The catalogue lists ≥ 150 effects with driver, structure, reduced-motion behaviour and
  phase; effects needing wrappers, layers or specialised rendering are marked.
- **FR-101**: ADRs 0018–0020 record architecture, composition and dependency policy.
- **FR-102**: Roadmap, architecture, package contracts, CLAUDE.md and the ADR index distinguish
  planned, implemented and verified.
- **FR-110**: No publication, version, tag, release, merge or push; the five published packages,
  the Changesets configuration and the release workflow are unchanged.

### Key Entities

- **Effect** — a catalogue entry (id, family, driver, structure, reduced-motion behaviour, phase).
- **Preset** — named options of an effect (planned).
- **Layer** — one effect's contribution to an element's composed `transform`.
- **Channel** — a style property with a single owner per element (ADR 0019).
- **Controller** — the imperative instance of an effect on one element (`createTilt3D`).

## Success Criteria

- **SC-001**: `pnpm check` passes with the new package, its tests and its tarball.
- **SC-002**: All Tilt3D, core and contract tests pass on the built output (FR-001–FR-065).
- **SC-003**: `check:browser:animations` passes every case on the maintainer machine.
- **SC-004**: A Tilt3D-only bundle contains no scroll/scene code and `./core` bundles contain no
  React (bundle measurement in evidence).
- **SC-005**: Catalogue ≥ 150 entries; ADRs 0018–0020 accepted as proposals pending owner review.
- **SC-006**: No change to published packages' runtime code, exports or stylesheets
  (`git diff main -- packages/{config,layout,typography,components,cli}` empty).
- **SC-007**: Three-OS CI and Firefox/WebKit checks — **pending** (nothing is pushed in 008.0).

## Assumptions

- React 19 only (as the published packages); React 18 is not supported.
- Chrome on the maintainer machine is representative for the spikes; other engines are verified in
  009 before any support claim.
- The owner reviews 008.0 before Phase 009 starts; the recommended order is in [plan.md](plan.md).
