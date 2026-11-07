# ADR 0001 — CSS-first modular React workspace

- Status: Accepted for initial scaffolding
- Date: 2026-11-07

## Context

The maintainer wants independently installable `config`, `layout`, `typography`
and `components` packages, with a custom theme config, Tailwind CSS v4, Capsize,
selective shadcn/Radix-style primitives, pnpm, and Storybook.

## Decision

Use pnpm workspaces with `workspace:*` internal links during development,
Tailwind CSS v4 CSS-first tokens, per-package explicit CSS exports, TypeScript
strict + ESM declarations, Vite and Storybook examples, Changesets, and official
Spec Kit for incremental feature delivery.

## Consequences

**Positive:** modular API, build-time theme generation, no forced runtime provider,
portable npm tarballs, accessible-first primitives.

**Costs/risks:** standalone package styles must be distributed correctly;
Capsize font metrics must match loaded fonts; CSS `@theme` directives require
careful consumer integration; npm scope availability has not been checked.

**Open design decision:** `@neshel-ui/core` is currently private but is a
workspace dependency of public-intended modules. Before publication, either
bundle/in-line these runtime helpers into consumer artifacts or make `core`
a genuinely published semver package. **Never publish a package with an
unavailable private runtime dependency.** Document the final choice in ADR 0002.
