# Brief — Phase 016: Advanced 3D & Distortion (final catalogue implementation)

Owner direction of 2026-11-22 (in Spanish; summarised here in English).

- **Base**: Phase 015 squash-merged into `main` as `da79b4a` (PR #16). 146 of 157 catalogue entries are integrated;
  Phase 016 implements the remaining 11 (D01–D11) and is the last implementation phase of the initial catalogue.
  It is **not** an npm publication authorisation.
- **State recovery first**: read the contract documents, ADRs 0018–0030, research R7 of 008 (CornerRecede), the
  catalogue, the accessibility contracts and the Phase 015 evidence; verify the post-merge CI run `45079243865`
  instead of assuming it passed; branch `feature/016-advanced-3d-distortion` from `origin/main`; update `CLAUDE.md`
  and the roadmap (015 merged, 016 current).
- **Exact catalogue**: D01 card flip (CSS), D02 cube rotation (CSS), D03 3D ring carousel (CSS/JS), D04 page curl
  (GPU), D05 CornerRecede (CSS/fold), D06 liquid/ripple distortion (GPU), D07 RGB split/glitch (CSS), D08
  displacement-map hover (GPU), D09 perspective grid floor (CSS), D10 depth-map parallax 2.5D (GPU), D11 tilt-shift
  blur (CSS). Each needs a contract, a reusable implementation, tests, a Storybook story and a Playground demo. A
  fallback never counts as the implemented effect.
- **GPU decision (first critical decision)**: ADR 0030 (Canvas 2D for dissolve/particles, CSS for complex
  backgrounds, no general graphics dependency) must not be invalidated for convenience. Compare WebGL2, WebGPU
  (availability only), Canvas 2D, CSS 3D/masks/transforms, a minimal own WebGL layer and small established
  libraries (only if justified) on compatibility, maintenance, performance, gzip size, shader complexity, visual
  quality, context loss, GPU memory and contributor accessibility. No Three.js, PixiJS, OGL or other large graphics
  dependency without benchmarks and an explicit architectural justification. WebGL2 is the recommended starting
  point, not pre-approved.
- **GPU Surface Manager** (optional): lazy contexts, a simultaneous-context limit, bounded configurable DPR, a
  memory budget, cleanup of textures/buffers/shaders/programs, context loss/restore, ResizeObserver coordinated with
  the scheduler, pause off-screen and on hidden pages, live reduced motion, fallback without WebGL, protection
  against shader compile failures, live-resource measurement, no needless continuous rendering. Reuse the Phase 015
  `ensure → resize → draw → release` lifecycle; no second global scheduler. Evaluate an optional `./gpu` entry and
  an `./advanced` family; decide exports after the research. CSS effects never import shaders, WebGL or graphics
  runtimes. A new ADR 0031 is created as **Proposed** for owner review if needed.
- **Per-effect requirements** (sections 3–13 of the brief): real 3D flip with inaccessible hidden face and exact
  restore (D01); true cube geometry with one interactive face and focus preservation, no per-frame layout reads
  (D02); usable ring carousel with coherent DOM order, keyboard, retargeting, drag, no focus on hidden items (D03);
  real mesh deformation for raster content, a separate accessible strategy for HTML, an explicit CSS fallback (D04);
  CornerRecede from the R7 hinged-fold prototype — corner under the pointer recedes by default, `reverse`, elastic
  return, continuous crease, no duplicate accessibility or IDs, documented limits, composition with Hover, Press,
  Tilt3D and the Motion Host, focus-visible version, instant reduced motion, exact cleanup, a CornerRecede vs Tilt3D
  demo (D05); real texture-coordinate displacement with damped waves, no loop after dissipation (D06); RGB split with
  WCAG-safe flashing limits and one accessible text (D07); real displacement-map distortion with consumer maps under
  CORS and validated, bounded shaders (D08); a CSS perspective floor without a GPU surface (D09); 2.5D parallax from
  an explicit depth map — never claimed from an image alone (D10); bounded tilt-shift blur measured against the
  WebKit `filter: blur()` cost found in 015 (D11).
- **Integration**: scheduler (009), Motion Host and channel arbitration, Timeline (013), Scroll Progress (011),
  Gestures/Physics/FLIP (012), SVG geometry (014), Canvas Surface (015) where appropriate; no React render per
  frame; deterministic external progress; GPU progress/texture binding without multiplying scheduler tasks.
- **Accessibility, SSR, security**: reduced motion initial and live; keyboard and focus; accessible interactive DOM;
  decorative canvases; no essential content hidden when WebGL fails; no dangerous flashing; no unexpected pointer
  capture; no scroll hijacking; SSR and hydration clean; no WebGL/window/document access at import; exact restore;
  validated textures and package-only shaders; contexts, buffers and timers released. Test context loss, compile
  errors, texture failures, resize, unmount mid-animation and StrictMode remounts.
- **Performance**: the 014/015 benchmarking approach (single and many effects, mesh sizes, DPR 1/2, pointer moving
  and idle, scroll/timeline, CSS filters vs shaders, GPU available/unavailable, 4× CPU, hidden/off-screen,
  context loss/restore, mount/unmount churn); mean and p95 frame intervals, JS time per frame, initialisation,
  shader compilation, estimated texture memory, live contexts. Separate observation from inference; SwiftShader is
  not a physical GPU. New gzip budgets from real tarball bundles, **proposed** until owner review; no earlier budget
  raised.
- **Inherited fixes**: a test for the 250 ms fallback timer of `src/media/engine/seek.ts`; cancel it on destroy if
  retention reproduces; keep R1/R2 and earlier regressions; keep K-2, K-3, K-5–K-9 documented; never claim Safari,
  physical GPUs, VoiceOver or devices verified without testing.
- **Slices**: 016.0 research/contracts/GPU decision; 016.1 CSS 3D foundations (D01, D02, D03, D05, D07, D09, D11);
  016.2 optional graphics foundation (only if justified); 016.3 GPU effects (D04, D06, D08, D10); 016.4 composition
  and accessibility; 016.5 catalogue completion and quality gates; 016.6 private release-candidate readiness report
  (no publication).
- **Gates**: the Phase 015 baseline (`pnpm check`, 544 animations tests, 175 CDP cases, 183 cases per Playwright
  engine, packed consumer, Next.js and React Router, SSR/hydration/StrictMode, Storybook and Playground,
  accessibility and reduced motion, approved budgets, three-OS CI) plus new geometry, interaction, GPU, context
  loss, fallback, cleanup and composition tests. A skipped test or a fallback never verifies the main effect.
- **Publication constraints**: `@neshel-ui/animations` stays `private: true` at `0.0.0`, outside the fixed group;
  no npm publication, version bump, tag, GitHub Release or release-workflow change; published packages and `v0.1.0`
  untouched. Completing 157 entries does not authorise the first publication. Commits, push and the Phase 016 PR are
  authorised; **never merge automatically**. No AI co-author trailers.
