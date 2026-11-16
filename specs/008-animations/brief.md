# Brief — Phase 008: Animation System Foundation

Owner brief "Neshel-UI — Phase 008: Animation System Foundation" (2026-11-15), summarised. The
original is in Spanish; this summary is authoritative for the repository. This first execution is
**Phase 008.0 — Architecture, Contracts & Technical Spikes**.

## Goal

Start `@neshel-ui/animations`: a modular, extensible, high-performance system for animation,
physical interaction, 3D effects, scroll, parallax, transitions and cinematic web experiences,
integral to Neshel-UI and bound by its architecture, contracts and quality standards.

## Scope of the system (specified now, implemented over phases 009–016)

Fifteen families: Entrance & Reveal; Hover & Pointer; Press & Microinteractions; Physics &
Gestures; Scroll Triggers; Scroll & Parallax; Cinematic & Scenes; Page Transitions; Layout
Animations; Typography & Text; SVG & Paths; Images & Media; Background & Ambient; Loading &
Feedback; Advanced 3D & Distortion. Product target: eventually more than 150 quality effects,
presets and variants. **Do not implement everything now**: first specify the catalogue, the shared
primitives, the dependencies and how several animations combine without conflicts.

## Architecture to research (§3)

Hybrid layers: React API (components, hooks, controllers); Effects & Presets (registry); Core Motion
Engine (timelines, springs, interpolation, reactive values, scheduler, lifecycle); Drivers (CSS,
Web Animations API, JavaScript, optional graphics rendering); Composition Engine (transforms,
priorities, combinations); Accessibility & Performance (reduced motion, resources, SSR, browser
compatibility). Decide where an existing engine is worth using. **No heavy dependency without
justification and comparative tests.** Prefer CSS when sufficient; load advanced capabilities only
when needed.

## API and distribution (§4)

Evaluate declarative, compositional and programmatic levels. Proposed entry points (`.`, `/hover`,
`/scroll`, `/core`, `/cinematic`, `/boot`) are suggestions to validate. Compatibility with
`asChild`, React 19, ESM, TypeScript, precompiled styles, tokens and SSR. Document effects that need
wrappers, extra layers or specialised rendering.

## Deliverables of 008.0 (§5–§10)

- `specs/008-animations/` through the Spec Kit flow: brief, spec, research, plan, tasks, analysis,
  evidence, contracts. Update roadmap, architecture, package contracts, CLAUDE.md and the ADR index;
  ADR 0018 (architecture) plus further ADRs where warranted. Keep planned / implemented / verified
  distinct.
- `packages/animations` as a workspace package: `private: true` (mandatory), ESM + declarations,
  React peer, exports only for implemented capabilities, explicit CSS without global resets,
  compatible with the existing validators, no public dependency on `@neshel-ui/core`, the Changesets
  publication group unchanged. Minimal infrastructure only — no giant abstract architecture.
- Experiment A **Tilt3D** (functional: cursor, perspective, intensity, smooth return, listener
  cleanup, SSR, keyboard where appropriate, reduced motion, no React render per pointer move).
- Experiment B **CornerRecede** (prototype: CSS transforms, layers, segmentation, real geometry;
  document visual differences, limits and costs; never present a simulation as real deformation).
- Experiment C **ScrollScene** (prototype: scroll-linked scene, synchronised progress, depth layers,
  animation control; evaluate pinning, scrub, timelines, re-measurement). B and C may stay in the
  playground while their APIs are unapproved.
- Tests: types and contracts, SSR and hydration, React compatibility, hover/focus/pointer, reduced
  motion, cleanup, cancellation/reversal, browser behaviour, transform composition, no unnecessary
  dependencies in simple bundles. Run existing gates; never weaken them; record run / passed /
  pending.

## Limits (§9)

No npm publication, version, tag, release, merge or remote push without authorisation. New branch
from `main`; published history untouched. Phases 009–016 are not implemented in this run.

## Expected report (§10)

Architecture found and constraints; system specification; catalogue and public contracts; ADRs;
private package integrated in the workspace; the three experiments with the scope actually reached;
tests and verifiable evidence; pending decisions with alternatives and trade-offs; a clear
recommendation to start Phase 009. Documentation and APIs in English; report to the owner in
Spanish. Priority: correct architecture, modularity, performance, accessibility, compatibility and
quality over effect count.
