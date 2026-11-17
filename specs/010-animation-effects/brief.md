# Brief — Phase 010: Animation Effects & Presets (Entrance, Hover, Press)

Owner direction of 2026-11-16, summarised. The original is in Spanish; this summary is authoritative for
the repository.

## Starting point

Phase 009 (Motion Engine) is merged into `main` as the squash commit `44dc1c9` (PR #6) and validated by
the owner. `@neshel-ui/animations` stays **private** at `0.0.0`; no publication is authorised.

## Goal

Implement the first **30 new catalogue effects** — Entrance & Reveal (E01–E11), Hover & Pointer (H01,
H02, H04–H10; H03 Tilt3D already exists and must be kept, not duplicated) and Press & Microinteractions
(P01–P10) — and, above all, an architecture that scales to the remaining catalogue entries: quality,
composition, a consistent API, accessibility, performance and compatibility first. H11 and P11 belong to
Phase 012. Variants (direction, distance, easing) are options, not extra effects. A name or a placeholder
does not count as an implemented effect.

## Requirements carried by the brief

1. Start from the updated `origin/main` on `feature/010-entrance-hover-press` (never from the old 009
   branch, squash-merged).
2. Spec Kit flow under `specs/010-animation-effects/`: brief, spec, research, plan, tasks, analysis,
   evidence, contracts. Define the preset architecture and the CSS / WAAPI / JS drivers before
   implementing. Reuse every Phase 009 capability; **no second animation engine**; no import-time
   registration.
3. **Composition is critical**: Entrance + Hover, Entrance + Press, Hover + Press, Tilt3D + Hover,
   Tilt3D + Press, Entrance + Tilt3D + Press on one element, and with the consumer's own styles. No preset
   may silently overwrite another, and no CSS effect may bypass the engine's ownership. Tests prove that
   destroying an animation restores pre-existing styles without destroying other active contributions.
4. CSS-first where the catalogue says so unless a technical proof shows a better alternative; React 19,
   strict TypeScript, ESM, SSR-safe, `asChild`, precompiled styles, Tailwind optional, plain-CSS apps
   supported, no heavy dependencies. Family entry points `./entrance`, `./hover` (extended), `./press`;
   `./core` stays React-free and the root entry light; optional, explicit, modular CSS; no global styles
   or resets. Motion tokens stay in Animations; Config is not modified.
5. Accessibility/SSR: entrance content visible without JavaScript and never hidden indefinitely; entrance
   tied to mount/explicit activation (intersection and scroll triggers are Phase 011); hover respects
   keyboard, `:focus-visible` and touch; press keeps native elements and semantics (toggle and checkbox
   are animated representations, not replacements); ripple/burst never capture events; shake is never the
   only error signal; content swap and number tick keep accessible meaning without per-frame live
   announcements. Live reduced motion, a non-animated fallback, no work on hidden pages, full cleanup,
   no React render per frame, no needless layout reads.
6. Slices 010.0 → 010.4 with small, verifiable commits. Stop and ask before any incompatible change to
   Phase 009 contracts.
7. Storybook and Playground gallery of the 30 effects (options, reduced-motion states, compositions on
   one element), real interaction tests, three browser engines, external Vite + SSR consumer, Linux /
   Windows / macOS CI, exports, tree-shaking and real bundle measurements with evidence-based budgets
   (existing core budgets are not raised to fit new effects).
8. Release and Git: package stays private 0.0.0, outside the Changesets group; no publication, release
   or tag; the five public packages and the release workflow unchanged. Commits, push and a PR for
   review are authorised; **no automatic merge**.
