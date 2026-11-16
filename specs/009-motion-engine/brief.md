# Brief — Phase 009: Motion Engine

Owner direction of 2026-11-15 (review of Phase 008.0), summarised. The original is in Spanish; this
summary is authoritative for the repository.

## Goal

Before implementing individual effects at scale, build the engine every effect will rely on:

1. **Effect registry** — how effects are defined, identified and looked up.
2. **Composition** — how several effects share one element.
3. **Conflict detection** — what happens, visibly and deterministically, when effects compete for the
   same property.
4. **Motion controllers** — one way to start, pause, reverse, retarget, cancel and await motion,
   whatever the driver.

## Constraints carried from Phase 008 and the owner decisions

- `@neshel-ui/animations` stays **private**; no publication until the agreed initial scope, including
  the advanced families, is complete and verified (D1); independent version line when it happens (D2).
- Family subpaths are added as families are implemented, keeping imports modular (D3).
- Motion defaults live inside Animations; a future integration with `@neshel-ui/config` must not break
  existing contracts (D5).
- Tilt3D keeps its inward default with `reverse` to invert (D7).
- Same quality bar as previous phases: spec → research → contracts → ADRs → plan → tasks → analysis,
  then tests, packed artifacts, browsers, evidence.

## This step

Prepare the specification, research, contracts, ADRs and task plan of Phase 009. **Do not start the
implementation** until the owner reviews and approves the proposal.

## Pending validations carried from 008.0

Firefox and WebKit runs of the lab, a packed external consumer, and a manual screen-reader pass. They
are scheduled inside Phase 009 (engine verification) and remain required before any publication.
