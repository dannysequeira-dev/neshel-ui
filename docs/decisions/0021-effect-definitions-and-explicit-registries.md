# ADR 0021 — Effect definitions and explicit registries

- Status: **Proposed** (2026-11-15, Phase 009.0); awaiting owner approval, not implemented
- Date: 2026-11-15
- Feature: [009](../../specs/009-motion-engine/spec.md); research R2–R3;
  [contracts/effect-definition.md](../../specs/009-motion-engine/contracts/effect-definition.md)

## Context

157 catalogue entries need one shape for identity, channels, priority, reduced-motion behaviour,
option validation and lifecycle. Many animation libraries use a global registry populated at import
time; in an ESM package with `sideEffects: ["**/*.css"]` that makes JavaScript modules side-effectful,
defeats tree-shaking, splits state between duplicate package copies and shares mutable state across
SSR requests.

## Decision

1. Effects are **definitions**: frozen values created by `defineEffect({ id, family, channels,
   priority, reducedMotion, resolve, setup })`, imported directly by whoever uses them.
2. Ids are `family/name` and match catalogue ids and family subpaths (D3).
3. A **registry is an explicit value** (`createEffectRegistry([...])`) for applications that need
   string lookup; there is no global registry and nothing registers at import time.
4. Built-in effect components (Tilt3D first) are thin wrappers over `attachEffect(element,
   definition, options)`; custom effects use the same path and get the same guarantees.

## Consequences

- Tree-shaking keeps working; SSR is stateless; definitions are testable in isolation.
- String-based declarative APIs require the application to pass a registry (explicit, documented).
- Duplicate ids are only detectable within one registry.

## Alternatives

Global side-effect registry (rejected: tree-shaking, SSR, duplicates); class hierarchy (heavier, no
benefit); untyped plain functions per effect (no metadata for arbitration or docs).

## Verification (planned)

Unit tests for validation and registries, a contract test that `dist` modules have no top-level
registration calls, bundle measurement of `defineEffect` + `attachEffect` alone (spec SC-003).
