# Tasks: Images & Media, Background & Ambient, Loading & Feedback (Phase 015)

Dependency-ordered. `[x]` done, `[ ]` open. Authorised by the owner brief of 2026-11-21 (slices 015.0–015.6).

## 015.0 — Specification & architecture

- [x] T001 Branch `feature/015-media-ambient-feedback` from `origin/main` (`3706a36`); main CI 44923680210
  verified (success 14/14); roadmap and CLAUDE.md updated (014 merged; #9 closed; 015 current)
- [x] T002 Pending 014 correction: `loopEffectControl.drive()` inert after destroy — regression test first
  (3 failing), fix, R1–R3 still green (`4374914`)
- [x] T003 Brief, spec (FR-001–FR-067, inventory), research R1–R17 with the measured Canvas/WebGL/CSS spike
- [x] T004 Contracts: media-api, ambient-api, feedback-api, accessibility-015, support-matrix-015,
  composition-matrix-015, performance-matrix-015, entry-points-015
- [x] T005 ADR 0030 (proposed); plan, tasks, analysis, manual checks

## 015.1 — Media foundations

- [x] T010 Move Presence to `core/presence.ts` and the checkmark shape to `core/marks.ts` (exports unchanged)
- [x] T011 Load watcher `core/media-load.ts` (FR-001) + tests (cached, error, decode reject, src change, stale)
- [x] T012 Seek coalescer `media/engine/seek.ts` (FR-002) + tests (burst, reverse, metadata wait, seekable, rVFC)

## 015.2 — Images & Media

- [x] T020 M01 Ken Burns, M10 hover pan (bounds, spring, keyboard option)
- [x] T021 M02 blur-up, M03 reveal mask (never-invisible rules)
- [x] T022 M04 comparison slider (native range, pointer, touch-action)
- [x] T023 M05 duotone (SVG filter + fallback)
- [x] T024 M06 video scrub
- [x] T025 M07 lightbox (dialog, FLIP, scroll lock, focus)
- [x] T026 M08 crossfade, M09 pixel dissolve (canvas surface from T030)
- [x] T027 React components, `media.css`, unit tests incl. StrictMode and SSR

## 015.3 — Ambient foundations

- [x] T030 Canvas surface `core/surface.ts` (FR-021) + tests (lazy, DPR, resize, loss/restore, release)
- [x] T031 Ambient registry, lifecycle, `ambientMotion`, finite default + dev warning (FR-020) + tests

## 015.4 — Background & Ambient

- [x] T040 B01 gradient shift, B02 aurora, B03 grain, B06 grid/dots, B07 mesh, B10 waves (CSS layers)
- [x] T041 B04 particles, B05 starfield (Canvas 2D)
- [x] T042 B08 floating shapes, B09 pointer glow
- [x] T043 React components, `AmbientMotionToggle`, `ambient.css`, unit tests

## 015.5 — Loading & Feedback

- [x] T050 F01 spinner, F03 progress bar, F04 dots, F09 progress ring (semantics + reduced)
- [x] T051 F02 shimmer, F10 pending text
- [x] T052 F05 success mark (shared shape)
- [x] T053 F06 toaster + `Toaster` (regions, timers, keyboard, Presence)
- [x] T054 F07 loading button, F08 optimistic pulse
- [x] T055 `feedback.css`, unit tests

## 015.6 — Integration & verification

- [x] T060 Playground gallery + in-page suite (30 entries)
- [x] T061 CDP and Playwright cases; ≥ 147 / 161 earlier cases kept
- [x] T062 Storybook stories (30 entries)
- [x] T063 Composition tests (20 rows); benchmarks (performance matrix)
- [x] T064 Packed consumer (SSR + hydration); bundle budgets proposed; routers check still green
- [x] T065 Package contract/pack checks, catalogue, README, docs; `pnpm check`; builds
- [x] T066 Push, PR #16, three-OS CI (run 45039777068, 14/14 on `f81dd10`); evidence

## 015.7 — Owner review (PR #16 comment 7085172024, 2026-11-22)

- [x] T070 R1 toaster after destroy: regression tests first (3 failing), inert destroyed store, idempotent destroy
- [x] T071 R2 compare slider capture: browser reproduction (Chromium, Firefox, WebKit), unit + real-input CDP and
  Playwright cases first (failing), release on destroy mid-drag; `pointercancel` refuted as a defect
- [x] T072 ADR 0030 Accepted; 21 budgets approved; docs and evidence (§14); all gates re-run; three-OS CI on the
  final head
