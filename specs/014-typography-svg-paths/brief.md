# Brief — Phase 014: Typography & Text + SVG & Paths

Owner direction of 2026-11-19 (Spanish original in the conversation; this is a faithful English summary).
`main` verified at `7207638671adc989fa08a4cfc33995db13fd2aab` (Phase 013 squash-merged, PR #13).

## Scope — exactly 21 catalogue entries

The catalogue ([specs/008 catalog.md](../008-animations/contracts/catalog.md) §10–§11) is the source of truth.

Typography & Text: T01 split reveal (chars / words / lines) · T02 typewriter · T03 scramble / decode ·
T04 gradient sweep text · T05 number roll · T06 rotating words · T07 kinetic wave · T08 highlighter draw ·
T09 text mask reveal · T10 variable-font axis animation · T11 line-by-line reveal on scroll.

SVG & Paths: S01 path draw (stroke-dashoffset) · S02 path morph (compatible commands) · S03 motion along a
path (`offset-path`) · S04 icon morph (menu ↔ close) · S05 animated gradient stops · S06 line-chart draw-in
· S07 turbulence wobble (SVG filter) · S08 logo reveal mask · S09 dash flow (marching ants) · S10 success
checkmark draw.

## Requirements (condensed)

1. **Accessible text splitter (T01 foundation)** shared by T02, T03, T06, T07, T09, T11 where relevant:
   Unicode-correct segmentation (grapheme clusters, emoji modifiers and ZWJ sequences, combining marks,
   languages with and without spaces), RTL and bidirectional text, explicit and automatic line breaks,
   changes of font, size, viewport and content, SSR and hydration, exact restoration, cancellation and
   unmount without orphan resources. Evaluate `Intl.Segmenter` per browser; document any fallback; no
   unnecessary dependency. UTF-16 code units are not visual characters.
2. **Accessible, semantic text (non-negotiable)** — screen readers get one coherent copy of the text, never
   hundreds of characters; visual fragments are decorative. Keep element semantics, headings, language and
   direction, selection/copy where reasonable, no-JS access, content visible before hydration, reduced
   motion legibility, forced-colors contrast and custom themes, and the `@neshel-ui/typography` rules
   (Capsize). No duplicated ids, no indiscriminate cloning of interactive elements; define links, buttons,
   nested markup and editable content explicitly. Limiting automatic splitting to simple text is acceptable
   if documented and tested. Animation is never the only way to reach the text.
3. **Per-effect text contracts** — T02 accessible text vs progressive visuals, caret not content,
   pause/cancel/restart/instant finish; T03 random glyphs never announced, deterministic, bounded work per
   frame; T04 legible colour without `background-clip: text` or under forced colours, exact restoration;
   T05 localised numbers (signs, separators, currencies, numbering systems), correct and stable accessible
   value; T06 coherent accessible text, no repeated announcements, stable dimensions; T07 decorative, no
   motion under reduced motion, no flashing; T08 never hides text or lowers contrast unacceptably; T09 never
   depends on a clip/mask for essential content; T10 `font-variation-settings`, registered and custom axes,
   valid ranges, capability detection, never overwrite other typographic settings, never assume axes; T11
   reuses the Scroll Engine progress-source contract without importing the scroll family, keeps the
   post-#11 reduced-motion and restoration rules, measures lines only on geometry/font/content changes.
4. **Path geometry foundation** — real length measurement (`getTotalLength`, `getPointAtLength`), zero
   lengths, disconnected subpaths, `viewBox` changes, transformed paths, resizes, local vs global
   coordinates, curves/arcs/relative and absolute commands, browser support and fallbacks. No duplicate
   Timeline Engine, no independent SVG renderer; updates go through the scheduler and the Motion Host when
   they touch shared channels.
5. **S02 path morph** — explicit policy for command compatibility, segment correspondence, point counts,
   cubic/quadratic curves, arcs, subpaths, closed paths, direction, numeric precision, invalid geometry,
   `NaN`/infinities/out-of-range values. Never interpolate `d` strings blindly; incompatible paths fail in a
   controlled way or use a documented fallback; no silent geometry-altering normalisation; justify any
   normalisation phase.
6. **Per-effect SVG contracts** — S01 controlled length, consumer dash styles preserved; S03 native CSS
   Motion Path first, honest fallback, safe composition with existing transforms; S04 compatible geometry,
   the button's accessible meaning kept, no icon library; S05 per-browser support of `stop-color`,
   `stop-opacity`, offsets, real fallback, never touch unrelated gradients; S06 animate existing paths only
   (no charting engine); S07 bounded frequency/amplitude/area, measured filter cost, no unbounded values,
   off under reduced motion, no unmeasured GPU claims; S08 logos and essential content preserved without
   mask support, decoration separated from meaning; S09 continuous animation with pause, cancel and page
   visibility, never permanently active while not visible; S10 success state without imposed semantics.
7. **Architecture** — evaluate `./text`, `./svg`, `./text.css`, `./svg.css` (names confirmed only after the
   spec); light root; React-free `./core`; no mandatory cross-family dependency; no Cinematic import to
   animate text or a path; reuse Motion Host, scheduler, motion values and Timeline; real tree-shaking; the
   five public packages unchanged; opt-in CSS working with and without Tailwind; no import side effects;
   SSR/hydration safe. ADR 0029 if non-trivial decisions appear. Any segmentation/geometry/morph dependency
   must be benchmarked against native capabilities and a small implementation.
8. **Timeline and Scroll** — `createTimeline`, `seek`, `reverse`, `pause`, `cancel`, `retarget` where the
   contract allows, external progress, live reduced motion, composition with other families, exact cleanup.
   CSS-only effects get deterministic external control without a second clock. T11 uses scroll progress;
   S01, S02, S03, S10 coordinate with cinematic timelines.
9. **Accessibility** — WCAG 2.2, one accessible text for split effects, coherent headings, RTL, complex
   graphemes, selection/copy, keyboard, reduced motion initial and live, contrast and forced colours, no
   per-frame `aria-live`, no essential content hidden by JS failure, no unnecessary focus changes,
   controllable infinite animations (pause/stop/hide), consumer accessibility attributes kept. Automated
   tests plus reproducible NVDA/VoiceOver guides — never claimed as run when they were not.
10. **Performance and composition** — segmentation cost of long texts, DOM cost of hundreds of graphemes,
    font changes, line reflow, large SVGs, complex paths, filters, geometry interpolation, simultaneous
    timelines, idle scheduler, cleanup after cancellation, no React renders per frame. Composition matrix
    with at least the 15 listed rows. Local observation vs architectural guarantee kept distinct.
11. **Slices** 014.0 spec & research → 014.1 accessible text foundation → 014.2 typography effects → 014.3
    SVG geometry foundation → 014.4 SVG effects → 014.5 integration & quality gates. No slice closes with
    decorative demos without a reusable API.
12. **Verification** — `pnpm check`, unit/integration, CDP lab keeping ≥ 125 Phase 013 cases, Chromium/
    Firefox/WebKit keeping existing cases, Storybook and Playground, packed consumers, SSR/hydration,
    Next.js and Vite builds, composition matrix, accessibility and reduced motion, gzip budgets (earlier
    budgets never raised without approval; new ones proposed from the real tarball), three-OS CI on the
    existing Node matrix. New tests for all 21 effects, complex Unicode strings, real variable fonts, valid
    and invalid SVG paths. Never delete tests to get green CI.
13. **Inherited** — issue #9 stays open until three distinct first-attempt clean runs on `main` since the
    stabilisation (incl. Windows/Node 26); the post-013 `main` run must be verified before counting; never
    close it automatically, never count feature-branch runs. Keep K-2 and K-3 documented.
14. **Publication** — `@neshel-ui/animations` stays `private: true`, `0.0.0`, no publish, version bumps,
    releases or tags, outside the release group; release pipeline and published packages unchanged.
15. **Authority** — commits, push and the Phase 014 PR are authorised; **no merge**.
16. **Deliverables** — inventory, splitter architecture, geometry/morph contracts, APIs and entry points,
    browser support matrix, composition matrix, Unicode/RTL/Capsize/accessibility evidence, complex SVG
    geometry tests, reduced motion and interruption states, benchmarks, Storybook and Playground, measured
    and proposed budgets, packed consumers and SSR, CI of the final commit, limitations and pending manual
    checks, final SHA and PR.
