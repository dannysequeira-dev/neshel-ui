# Neshel-UI Constitution

**Version:** 1.0.0  
**Ratified:** 2026-11-07  
**Last amended:** 2026-11-07  
**Scope:** every package, app, script, artifact and specification in this repository.

## I. Faith, integrity and stewardship

Neshel-UI is rooted in faith, built with hope. Public-facing work should demonstrate
honesty, care and respect for people. Never invent test evidence, publish private
information, copy third-party code without license compliance, or promise availability
without verification. Technical excellence is a form of stewardship.

## II. Modular packages are non-negotiable

Each npm package must solve one problem well, with minimal transitive dependencies.
`config` owns design tokens and theming. `layout` and `typography` depend on shared
contracts, never on `components`. `core` is strictly internal. Public package APIs
must not expose workspace file paths, build tooling internals or private helpers.

## III. CSS-first and semantic tokens

Use Tailwind CSS v4 CSS-first semantics, interoperable CSS custom properties, and
semantic foreground/background token pairs. Default CSS imports must work without
a runtime provider. A consumer config file is evaluated at build time by the CLI,
not inside the browser. Tailwind `@source` is documented when genuinely necessary.
No interpolated utility class names that Tailwind cannot statically discover.

## IV. Accessibility by default

Use real HTML semantics, visible focus, keyboard operability, logical document
order, WCAG AA contrast targets, and reduced-motion behavior. Reuse established
accessible primitives selectively; never invent complex interaction patterns
without automated and manual verification.

## V. Precise typography, intentional layout

Typography should preserve HTML semantics independent of visual scale. Capsize
must use valid font metrics and deterministic outputs; font loading is the
consumer's responsibility. Layout primitives should be predictable, polymorphic
only when needed, low-overhead and SSR-safe.

## VI. Tests and evidence precede claims

Before completing a slice, run relevant lint, typecheck, tests, package builds,
Storybook stories and external consumer checks. Use `pnpm pack` artifacts to verify
publishable packages, not just `workspace:*` links. Clearly record skipped checks
and environmental blockers. Never call a feature complete with failed gates.

## VII. Minimal scope and spec-driven development

Every substantive feature follows specify/clarify/plan/tasks/analyze/implement.
Record architectural decisions as ADRs. Avoid speculative complexity. Break
features into reversible, small, reviewable vertical slices, not giant rewrites.
Maintain planned vs implemented vs verified distinctions in all documents.

## VIII. Safe releases and transparent ownership

The packages remain `private: true` until they pass a release gate and the owner
authorizes publication. Verify npm scope, naming rights, content, API stability,
package provenance and CI. No automated npm publish, release, destructive git
operations or remote push without the maintainer's approval.

## Governance

The constitution overrides ordinary implementation convenience. An amendment
requires an ADR, a deliberate version bump and updates to affected specs and
acceptance criteria. Resolve conflicts openly; do not silently rewrite this file.
