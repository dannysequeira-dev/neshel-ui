# ADR 0022 — Channel arbitration and conflict detection

- Status: **Accepted** (owner approval 2026-11-16); implementation in Phase 009
- Date: 2026-11-15
- Feature: [009](../../specs/009-motion-engine/spec.md); research R4–R5;
  [contracts/channels-and-arbitration.md](../../specs/009-motion-engine/contracts/channels-and-arbitration.md);
  extends [ADR 0019](0019-motion-composition-and-property-ownership.md)

## Context

ADR 0019 made `transform` composable and assigned the individual transform properties to CSS effects,
but other properties (`opacity`, `filter`, `clip-path`, `mask`, custom properties) and two CSS effects
on one individual property still fall back to last-write-wins. The owner asked for conflict detection
before effects are implemented at scale.

## Decision

1. Every effect instance claims channels through the element's **motion host**; channel handles are
   the only write path. Modes: `compose` (`transform`), `multiply` (`opacity`), `exclusive` (all
   others, including `translate`/`rotate`/`scale`).
2. **Arbitration** of exclusive channels: higher priority wins; ties keep the existing owner; losers are
   `suspended` (apply nothing) and resume automatically when granted; multi-channel claims are
   all-or-none.
3. **Reporting** through a per-attach conflict policy: `warn` (development default; once per element,
   channel and pair, naming both ids), `error` (throws `NeshelAnimationsError`; for tests/CI),
   `silent` (production default). Arbitration does not depend on the policy except that `error` throws.
4. `getMotionDebugInfo(element)` exposes the ledger for development and tests.
5. No provider: the policy comes from the call or `NODE_ENV`.
6. **Style ownership** (owner requirement 3.1, [style-ownership.md](../../specs/009-motion-engine/contracts/style-ownership.md)):
   every managed property is written only through the host's style ledger, which captures the original
   inline value and priority on first claim, combines it (`transform` prefix, `opacity` factor,
   `will-change` union), restores it exactly on release (completion, cancel, interrupt, destroy,
   unmount), adopts external inline changes as the new baseline, and writes each property at most
   once per frame. This supersedes the 008 behaviour where the composer replaced an inline
   `transform` with a warning.

## Consequences

- No silent overrides between Neshel effects; behaviour is deterministic and testable.
- The application's own CSS on the same properties remains invisible to the host (documented).
- Effects must declare channels truthfully; the contract tests of each family check it.

## Alternatives

Last-write-wins (status quo); always throw (one decorative effect could break a page); merge every
channel (meaningless for `filter` chains or `clip-path` shapes).

## Verification (planned)

Conflict matrix unit tests (priority, ties, suspension/resume, all-or-none, policies, messages),
lab engine page in Chromium, Firefox and WebKit.
