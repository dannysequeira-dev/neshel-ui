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

- [ ] T010 Move Presence to `core/presence.ts` and the checkmark shape to `core/marks.ts` (exports unchanged)
- [ ] T011 Load watcher `core/media-load.ts` (FR-001) + tests (cached, error, decode reject, src change, stale)
- [ ] T012 Seek coalescer `media/engine/seek.ts` (FR-002) + tests (burst, reverse, metadata wait, seekable, rVFC)

## 015.2 — Images & Media

- [ ] T020 M01 Ken Burns, M10 hover pan (bounds, spring, keyboard option)
- [ ] T021 M02 blur-up, M03 reveal mask (never-invisible rules)
- [ ] T022 M04 comparison slider (native range, pointer, touch-action)
- [ ] T023 M05 duotone (SVG filter + fallback)
- [ ] T024 M06 video scrub
- [ ] T025 M07 lightbox (dialog, FLIP, scroll lock, focus)
- [ ] T026 M08 crossfade, M09 pixel dissolve (canvas surface from T030)
- [ ] T027 React components, `media.css`, unit tests incl. StrictMode and SSR

## 015.3 — Ambient foundations

- [ ] T030 Canvas surface `core/surface.ts` (FR-021) + tests (lazy, DPR, resize, loss/restore, release)
- [ ] T031 Ambient registry, lifecycle, `ambientMotion`, finite default + dev warning (FR-020) + tests

## 015.4 — Background & Ambient

- [ ] T040 B01 gradient shift, B02 aurora, B03 grain, B06 grid/dots, B07 mesh, B10 waves (CSS layers)
- [ ] T041 B04 particles, B05 starfield (Canvas 2D)
- [ ] T042 B08 floating shapes, B09 pointer glow
- [ ] T043 React components, `AmbientMotionToggle`, `ambient.css`, unit tests

## 015.5 — Loading & Feedback

- [ ] T050 F01 spinner, F03 progress bar, F04 dots, F09 progress ring (semantics + reduced)
- [ ] T051 F02 shimmer, F10 pending text
- [ ] T052 F05 success mark (shared shape)
- [ ] T053 F06 toaster + `Toaster` (regions, timers, keyboard, Presence)
- [ ] T054 F07 loading button, F08 optimistic pulse
- [ ] T055 `feedback.css`, unit tests

## 015.6 — Integration & verification

- [ ] T060 Playground gallery + in-page suite (30 entries)
- [ ] T061 CDP and Playwright cases; ≥ 147 / 161 earlier cases kept
- [ ] T062 Storybook stories (30 entries)
- [ ] T063 Composition tests (20 rows); benchmarks (performance matrix)
- [ ] T064 Packed consumer (SSR + hydration); bundle budgets proposed; routers check still green
- [ ] T065 Package contract/pack checks, catalogue, README, docs; `pnpm check`; builds
- [ ] T066 Push, PR, three-OS CI on the head commit; evidence
