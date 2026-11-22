# Brief — Phase 015: Images & Media, Background & Ambient, Loading & Feedback

Owner direction of 2026-11-21 (Spanish original in the conversation; this is a faithful English summary).
`main` verified at `3706a36bc0680834eab9af6993f08050c1348d17` (Phase 014 squash-merged, PR #15); main CI run
44923680210 completed **success**, 14/14 jobs on the first attempt. Issue #9 closed as completed (three clean
main runs), issue #11 closed earlier. 116 of 157 catalogue entries integrated; this phase adds 30 (→ 146).

## Scope — exactly 30 catalogue entries

The catalogue ([specs/008 catalog.md](../008-animations/contracts/catalog.md) §12–§14) is the source of truth.

Images & Media: M01 Ken Burns · M02 blur-up progressive load · M03 reveal mask on load · M04 before/after
comparison slider · M05 duotone transition · M06 video scroll scrub (`currentTime`) · M07 lightbox zoom from
thumbnail (FLIP) · M08 gallery cross-fade · M09 pixel/dissolve transition · M10 hover pan inside frame.

Background & Ambient: B01 gradient shift · B02 aurora blobs · B03 grain/noise overlay · B04 particles · B05
starfield · B06 animated grid/dots · B07 mesh gradient · B08 floating shapes · B09 pointer-reactive glow · B10
waves (SVG).

Loading & Feedback: F01 spinner · F02 skeleton shimmer · F03 indeterminate progress bar · F04 dots pulse · F05
success check · F06 toast enter/exit · F07 button loading morph · F08 optimistic pulse · F09 progress ring · F10
pending-state shimmer on text.

## Requirements (condensed)

1. **Media semantics.** Images keep `alt`, `srcset`, `sizes`, `loading`, `decoding`, dimensions and native
   loading; no replacement of the Next.js image system, no proprietary loader. M01 bounded camera (no
   overflow, no distortion; external progress; reduced motion). M02/M03 handle already-loaded/cached images,
   `decode()`, errors, failed images and `src` changes — never invisible waiting for a past `load`. M04 mouse,
   touch and keyboard; slider semantics (value, limits, orientation, label); comparison possible without
   dragging. M05 duotone with fallback; original never modified permanently. M06 research `currentTime`,
   seekable ranges, duration, metadata, `seeking/seeked`, frame availability; never saturate the decoder with
   stale seeks; `requestVideoFrameCallback` when present, not assumed; no audio autoplay; document codecs,
   CORS, mobile. M07 FLIP + truly accessible lightbox (initial focus, Escape, close, focus restore, controlled
   scroll lock, inert background); evaluate native `<dialog>`; no separate overlay manager. M08 cancellation,
   rapid changes, state preserved; not a carousel library. M09 research a real pixel/dissolve (catalogue: GPU),
   fallback and cost — never call a fade "pixel dissolve". M10 pointer pan with bounds and restoration, keyboard
   alternative when it conveys information; stops under reduced motion.
2. **Ambient is decorative.** Never blocks interaction or duplicates accessible content. Show/pause/stop/unmount
   where needed. Mandatory: pause off-screen and on hidden pages; live reduced motion; bounded CPU/GPU; shared
   global listeners; no React render per frame; resources, observers, listeners and styles restored on destroy;
   no surface intercepting clicks/touch; bounded amplitude/speed/density/count; degradation for limited devices.
   B01/B02/B07 CSS first when quality and cost are acceptable (measure filters/blur/layers). B03 no new noise per
   frame when a shared texture works. B04/B05 real particles/starfield, controllable density, deterministic
   motion, cleanup tests; research Canvas 2D, WebGL2 and alternatives. B06/B08/B10 reuse the scheduler, Motion
   Host and SVG knowledge (no second engine). B09 reuse the Phase 010 pointer tracker; no layout read per move.
3. **GPU decision (015.0).** The catalogue marks M09, B04, B05 GPU and B07 CSS/GPU while the GPU Surface
   Manager is reserved for 016. Decide with measurements which entries need GPU, which can use CSS/Canvas 2D,
   whether a minimal internal GPU layer fits 015 without compromising 016, context loss/restore, resize, DPR,
   cleanup, bytes and frame cost. No public `./gpu` subpath without justification; no Three.js/PixiJS/shader
   engines. ADR 0030 if needed. Effects must be real in their supported capability; a static or fade fallback
   never replaces the declared implementation. Unmet entries are reported as pending.
4. **Feedback: semantics before motion.** F01/F03/F04/F09 accessible states without invented percentages;
   indeterminate ≠ known progress; evaluate native `<progress>`. F02 skeleton never presented as content;
   loading state on the right container. F05 no announcement of a non-existent result; shared SVG primitives
   without importing another family. F06 Presence-coordinated toasts: multiple, interruptions, keyboard close,
   focus, pause on hover/focus, accessible timing, `aria-live` only when appropriate, no per-frame
   announcements. F07 identity, accessible name, focus and stable size; no double submit without breaking the
   keyboard; no duplicate of the Components `Button`. F08 optimistic ≠ confirmed; handles rollback/failure. F10
   legible text, forced colours, reduced motion, one accessible text. Reduced loading indicators keep a slow,
   non-vestibular signal.
5. **Architecture.** Evaluate separate subpaths; names and budgets proposed through Spec Kit contracts. Light
   root, React-free `./core`, no mandatory cross-family dependency, opt-in CSS, real tree shaking, SSR and
   hydration safe, one scheduler, Motion Host for consumer styles, shared ledgers for exclusive ownership,
   Canvas/GPU released when unused, no heavy technology imported by basic entries. Feedback shares `core`
   primitives with existing components without a circular dependency and without making
   `@neshel-ui/components` depend on Animations.
6. **Pending Phase 014 correction.** `loopEffectControl.drive(source)` accepted a subscription after destroy:
   regression test first, reproduce, fix, keep `track()`/`drive()` inert after destroy, verify cleanup; no
   engine refactor; keep R1–R3.
7. **Accessibility** per contracts/accessibility.md and WCAG 2.2 (list in the original brief); manual NVDA,
   VoiceOver, real Safari and physical devices stay pending until actually run.
8. **Performance matrix** (images single/many, `srcset`/resize, fast/reverse video scrub, particle densities,
   slow-device starfield, aurora/mesh sizes, simultaneous ambient, concurrent toasts/spinners, hidden page and
   off-screen, reduced motion during playback, cancel/unmount while pending). Measure mean/p95 frame time,
   incremental cost over a static baseline, CPU/GPU where possible, scheduler tasks, listeners/observers, live
   canvas/GPU contexts, layout reads, memory/cleanup, gzip per entry; separate initialisation and sustained cost
   (as K-5). No universal 60 fps or GPU-acceleration claims without evidence. New budgets proposed from
   measurements; earlier budgets untouched without approval.
9. **Composition** — at least the 18 rows listed in the original brief (Ken Burns + Timeline … destroy during
   playback or load).
10. **Stages** 015.0 spec & architecture · 015.1 media foundations · 015.2 M01–M10 · 015.3 ambient foundations ·
    015.4 B01–B10 · 015.5 F01–F10 · 015.6 integration & verification. No stage advances with simulated APIs,
    tests or demos.
11. **Quality gates** keep at least: `pnpm check`; the 469 animations tests; 147 CDP cases; 161 cases per
    Chromium/Firefox/WebKit; packed consumer SSR + hydration; StrictMode; Next and React Router; Storybook and
    Playground; composition matrix; automated accessibility; gzip budgets; Linux/Windows/macOS CI on the current
    Node matrix. Tests for each of the 30 entries and new primitives; nothing removed or weakened. K-2, K-3, K-5
    stay documented until resolved.
12. **Permanent constraints.** `@neshel-ui/animations` private `0.0.0`; no publish, version bump, tag, GitHub
    Release or release-pipeline change; outside the fixed group. Five published packages untouched unless
    necessary. Authorship per CLAUDE.md, no tool attribution. Commits, push and opening the PR are authorised;
    **no automatic merge**.
13. **Deliverables** — inventory, ADR/decision, APIs/subpaths, contracts, support matrix, accessibility, keyboard/
    touch/focus tests, composition, benchmarks, cleanup evidence, Storybook/Playground, gzip and budgets, packed
    consumers/SSR, three-OS CI of the final SHA, known limitations and pending manual checks, PR link and commit.
