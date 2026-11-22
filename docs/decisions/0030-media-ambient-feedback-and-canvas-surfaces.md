# ADR 0030 — Media, ambient and feedback families; Canvas 2D surfaces instead of an early GPU layer

- Status: **Accepted** (owner, 2026-11-22, PR #16 review; accepted after the two lifecycle review cases R1/R2 were
  fixed — `specs/015-media-ambient-feedback/evidence.md` §14)
- Date: 2026-11-21
- Feature: [015](../../specs/015-media-ambient-feedback/spec.md); research R1–R17; contracts
  [media-api.md](../../specs/015-media-ambient-feedback/contracts/media-api.md),
  [ambient-api.md](../../specs/015-media-ambient-feedback/contracts/ambient-api.md),
  [feedback-api.md](../../specs/015-media-ambient-feedback/contracts/feedback-api.md)

## Context

Phase 015 adds Images & Media (M01–M10), Background & Ambient (B01–B10) and Loading & Feedback (F01–F10). The
catalogue marks M09, B04 and B05 as `GPU` and B07 as `CSS/GPU`, while ADR 0018 and the roadmap reserve the
optional GPU Surface Manager for Phase 016. The owner asked for a measured decision rather than an improvised
graphics engine, and for no public `./gpu` subpath or graphics dependency without review.

## Decision

1. **Three families, three subpaths.** `./media`, `./ambient`, `./feedback` with opt-in `media.css`,
   `ambient.css`, `feedback.css`. They import `src/core` internals, `src/react` and React only — never each
   other or any earlier family. Shared pieces move to `src/core` (Presence state machine, checkmark shape, image
   load watcher, canvas surface); public exports of `./layout`, `./svg` and `./core` do not change.
2. **No GPU layer in 015.** M09 is a Canvas 2D block dissolve (seeded cell order, incremental drawImage/
   clearRect); B04/B05 are Canvas 2D with hard density caps; B07 (and B01/B02) are CSS on package layers with
   soft radial gradients — `filter: blur` rejected by measurement. Measured (research R10/R11, local headless):
   2D particles cost ≤ 1.2 ms/frame in Chromium and ≤ ~4 ms in Firefox at the caps; blur blobs raised frame
   intervals to 29 ms (Firefox) and 142 ms (WebKit). WebGL2 would lower CPU only above ~1000 points and needs
   CORS-clean textures for a per-pixel dissolve, shader code and a context budget — the 016 GPU Surface Manager's
   scope. No `./gpu` subpath, no WebGL code shipped, no dependency.
3. **Internal canvas surface** (`src/core/surface.ts`, not exported): lazy creation, DPR cap, ResizeObserver
   sizes applied in the write phase, context loss/restore, exact release, counters. It is the seam the 016
   manager may implement with WebGL contexts (same `ensure/resize/draw/release` lifecycle).
4. **Native semantics first.** Images keep native attributes and are never left hidden (load watcher, timeout,
   error and destroy reveal); the comparison slider is a native range input; the lightbox is a native modal
   `<dialog>` (no overlay manager); video scrubbing coalesces seeks (one in flight) and never plays; indicators
   are ARIA progressbars without invented values; toasts use regions created before content.
5. **Ambient lifecycle.** One shared IntersectionObserver and one visibility listener for all ambient effects;
   finite by default (5 s), `Infinity` explicit with a page-level switch (`ambientMotion`,
   `AmbientMotionToggle`) as the user pause mechanism (WCAG 2.2.2); CSS layers are paused unless the engine
   marks them running, so no-JS pages show static decoration.
6. **Writes.** Consumer elements change only through the Motion Host (exclusive internal channels such as
   `translate`, `scale`, `clip-path`, `filter`, `min-inline-size`, host opacity and transform layers) or engine
   tokens rendered by package `::before`/`::after` layers (rule R-1). `src/core/host.ts` does not change.
7. **Feedback without coupling.** `@neshel-ui/components` is unchanged and does not depend on Animations;
   feedback effects attach to any element (including Components `Button`/`Skeleton`) through DOM contracts.

## Consequences

- The catalogue driver column changes for M09/B04/B05 (GPU → Canvas 2D) and B07 (CSS); the spec inventory records
  it. The per-pixel noise dissolve and dense (> 1000) particle fields are 016 work.
- Canvas 2D cost grows linearly with density; the caps are enforced, not configurable past.
- Ambient decorations stop after 5 s unless the consumer opts into `Infinity` and offers the toggle.
- New bundle entries get measured budgets (the 21 Phase 015 budgets were approved by the owner as proposed);
  earlier budgets are unchanged.
- A GPU Surface Manager may be revisited independently in Phase 016; the internal canvas surface is its seam.

## Alternatives rejected

- A minimal WebGL2 renderer in 015 (bytes, context policy and CORS constraints belong to 016; no measured need).
- Three.js/PixiJS/regl/ogl (ADR 0020; far beyond the need).
- `filter: blur()` blobs (measured cost in Firefox/WebKit).
- Per-frame generated noise (B03): a static shared texture gives the same look at zero runtime cost.
- Native `<progress>` for indeterminate indicators (engine-specific styling; `appearance: none` removes the
  indeterminate state's animation in Blink/WebKit).
- A home-made focus-trap overlay for M07 (native `<dialog>` provides top layer, inertness and Escape).
