# Feature Specification: Animation Effects & Presets — Entrance, Hover, Press (Phase 010)

**Feature Branch**: `feature/010-entrance-hover-press` (from `origin/main` `44dc1c9`, after the PR #6 squash merge)

**Created**: 2026-11-16

**Status**: **Implemented; verified locally — see [evidence.md](evidence.md); CI and the owner's review of
the PR pending.** `@neshel-ui/animations` stays private (0.0.0).

**Input**: Owner direction 2026-11-16, summarised in [brief.md](brief.md).

Companion documents: [research.md](research.md) (R1–R11), [plan.md](plan.md), [tasks.md](tasks.md),
[analysis.md](analysis.md); contracts [presets.md](contracts/presets.md),
[drivers-and-css.md](contracts/drivers-and-css.md), [effects-010.md](contracts/effects-010.md),
[composition-matrix.md](contracts/composition-matrix.md),
[accessibility-010.md](contracts/accessibility-010.md), [entry-points-010.md](contracts/entry-points-010.md);
ADR [0025](../../docs/decisions/0025-presets-and-css-token-driver.md).

## Problem

Phase 009 delivered the engine but only one effect. Thirty catalogue effects implemented one by one with
CSS on the consumer's element would collide with each other (one `translate`, one `transition`) and with
the consumer's styles, and would bypass the motion host that Phase 009 made the single writer.

## Goals

1. A preset architecture (presets as values, family primitives, composition of several effects on one
   element) reusable by the remaining catalogue families.
2. A driver rule that keeps CSS where it is safe (package-owned targets) and routes every property of the
   consumer's element through the motion host (R-1, CSS-token driver; ADR 0025).
3. The 30 effects E01–E11, H01–H02, H04–H10, P01–P10, functional, accessible, SSR-safe, with H03 Tilt3D
   preserved and compatible.
4. Verified composition (Entrance/Hover/Press/Tilt3D pairs and triple), restoration and conflicts.
5. Gallery in Storybook and the Playground; browser checks in three engines; packed consumer; bundles.

## Non-goals

H11 and P11 (Phase 012); scroll and intersection triggers (011); presence/exit (012); first-paint CSS
entrances without JavaScript for server-rendered content (011); changes to `@neshel-ui/config`, the CLI,
the five public packages or the release workflow; publication, versions, tags, releases; merging the PR.

## Clarifications

### Session 2026-11-16 — owner brief

- Q: Which effects? → A: exactly E01–E11, H01, H02, H04–H10, P01–P10 (30); H03 kept; H11, P11 → 012.
- Q: API direction? → A: coherent primitives with presets (`<Reveal>`), not 30 wrappers unless they add
  value; stable catalogue identity; no import-time registration.
- Q: Entrance activation? → A: mount / explicit activation only; intersection/scroll in 011.
- Q: Authority to proceed? → A: slices 010.0–010.4 authorised; stop only for incompatible 009 contract
  changes (none were needed: every 009 change is additive — two core exports, one internal helper export).

### Decisions taken in 010.0 (documented, reversible by the owner)

- D010-1: catalogue CSS drivers for entrances and hover decor become engine-driven (R2, ADR 0025); CSS
  keeps package-owned targets (R3).
- D010-2: decor effects share the `::before` layer through composable CSS lists; border sweep owns
  `::after` via the sentinel channel `--neshel-layer-after` (R4).
- D010-3: `<Reveal appear="client">` skips the entrance when hydrating server markup (R6).
- D010-4: family stylesheets `hover.css`, `press.css`; `styles.css` concatenates them (entrance needs none).

## User Scenarios & Testing

### US1 — Reveal content on mount (P1)

`<Reveal preset={fadeUp}>` around a card in a client-rendered route fades and slides it in once, leaving
no inline style; `replayKey` replays it; under reduced motion it only fades; with JavaScript disabled or
while hydrating server markup the content is simply visible.

### US2 — Compose effects on one element (P1)

A pricing card uses Reveal + Hover (lift, glow) + Press (scale, ripple) + Tilt3D via nested `asChild`.
All effects run together; destroying any one leaves the others exact; at rest the element's original
inline styles are back.

### US3 — Hover affordances that respect input modes (P1)

Lift, glow, spotlight, underline, shine and border sweep react to mouse/pen and to keyboard focus-visible,
not to touch scrolling (opt-in); decorative layers never intercept clicks.

### US4 — Press feedback on native controls (P1)

A `<button>` gets press scale + ripple; a native switch shows `ToggleMorph`; a native checkbox shows
`CheckboxDraw`; a copy button shows `ContentSwap`; a like button bursts; a failed form shakes with an ARIA
error; a counter ticks with one accessible value.

### US5 — Conflicts are visible, never silent (P2)

Two effects claiming `filter`/`clip-path`/`mask`/`::after` on one element: the 009 arbitration suspends one
with a development warning; the suspended one writes nothing (an entrance never hides content).

### Edge Cases

Effect attached to a void element (ripple/burst: warning, no-op); empty `<Stagger>`; `replayKey` change
mid-run; reduced motion switched on mid-entrance (final state); page hidden mid-entrance (final state);
hover while an entrance runs (layers add); press on a disabled button (nothing); `trigger` unchanged on
re-render (no replay); option update during a run; unmount mid-ripple (layer removed); a consumer inline
`transform`/`opacity` with `!important` (kept and restored with priority).

## Requirements

### Architecture

- **FR-001**: `definePreset` / `attachPreset` in `./core` (contracts/presets.md §1); presets validated and
  frozen; no registration.
- **FR-002**: Family registries `entranceEffects`, `hoverEffects`, `pressEffects` in catalogue order.
- **FR-003**: Every effect is a `defineEffect` definition with id `family/name`, declared channels and
  reduced behaviour; ids listed in contracts/effects-010.md.
- **FR-004**: No second engine: motion uses 009 controllers, the 008 integrator and the shared scheduler.

### Drivers and CSS

- **FR-010**: Rule R-1 — no package CSS transition/animation on a subject that may be the consumer's
  element (contract test).
- **FR-011**: CSS-token driver: tokens added only while granted, removed on destroy, reference-counted.
- **FR-012**: Decor `::before` layer composes lift/glow/spotlight/shine/underline; `::after` ring is
  exclusive through `--neshel-layer-after`.
- **FR-013**: WAAPI only on owned transient layers (ripple, burst), removed when idle.

### Effects

- **FR-020**: E01–E11 as specified in contracts/effects-010.md §1.
- **FR-021**: H01, H02, H04–H10 as specified in §2; H03 Tilt3D unchanged (all 008/009 Tilt3D tests green).
- **FR-022**: P01–P10 as specified in §3.

### Composition

- **FR-030**: The six required combinations compose on one element (composition-matrix §2).
- **FR-031**: Destroying any effect restores pre-existing inline styles (value and priority) without
  removing other active contributions.
- **FR-032**: Genuine conflicts follow 009 arbitration with development warnings (§3).

### Stylesheets and packaging

- **FR-040**: `hover.css`, `press.css`, `styles.css`: one `components.neshel` layer, scoped selectors,
  namespaced `@property`/keyframes only, no global rules, no motion-token declarations.
- **FR-041**: `styles.css` = header + hover.css + press.css.
- **FR-042**: Tailwind not required; plain CSS import works (packed consumer).
- **FR-050**: Entry points per contracts/entry-points-010.md; module boundaries enforced (contract test,
  `checkAnimationsContract`).
- **FR-051**: Package stays private 0.0.0 outside Changesets and release scripts.

### Accessibility, SSR, behaviour

- **FR-060**: contracts/accessibility-010.md §1–§4 (visible without JS, hydration-aware, live reduced
  motion, keyboard/focus/touch, semantics preserved, no capture by layers, shake warning, accessible
  number tick and content swap, no per-frame announcements, hidden-page handling, cleanup, no render per
  frame).

### Verification

- **FR-070**: Unit tests for the 30 effects (behaviour, reduced motion, cleanup), presets, primitives,
  SSR markup, hydration, composition and conflicts; positive and negative type tests.
- **FR-071**: Lab gallery + in-page suite and real-input cases in Chrome (CDP) and Chromium/Firefox/WebKit
  (Playwright); axe; spike cases backing research R2.
- **FR-072**: Packed external consumer (Vite build, SSR, hydration, interaction) for the new families.
- **FR-073**: Bundle sizes per family and representative imports measured from the packed tarball;
  tree-shaking markers; budgets proposed from evidence; 009 budgets not raised.
- **FR-074**: Storybook gallery per family with options, reduced-motion states and compositions.
- **FR-075**: `pnpm check` green; CI on Linux, Windows and macOS.

## Success Criteria

- **SC-001**: 30/30 effects functional with tests; H03 unchanged.
- **SC-002**: The six combinations verified in unit tests and in the lab in three engines.
- **SC-003**: No 009 test changed except the exact-export lists (additive exports).
- **SC-004**: Bundle budgets: 009 entries unchanged and passing; new entries within the proposed budgets.
- **SC-005**: axe: no violations in the lab gallery (three engines).
