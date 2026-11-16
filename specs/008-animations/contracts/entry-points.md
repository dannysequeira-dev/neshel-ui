# Contract proposal — API levels and entry points

**Status:** `.`, `./core`, `./styles.css` **implemented** (008.0). Owner decision D3 (2026-11-15):
family subpaths are allowed **as each family is implemented**, keeping imports modular
([plan.md](../plan.md#decisions)).

## API levels

| Level         | Audience                       | Shape (examples)                                                                           |
| ------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| Declarative   | most applications              | `<Tilt3D>`, `<Reveal preset="fade-up">` (010), `<ScrollScene>` (011), `asChild` everywhere |
| Compositional | combining effects              | several effect components/hooks on one element, composed through channels (composition.md) |
| Programmatic  | custom interactions, non-React | `useTilt3D`, `createTilt3D`, `./core` scheduler/springs/composer, timelines (013)          |

Each effect is offered at the levels that make sense: a component (declarative), a hook on a
consumer ref, and an imperative controller. Components are thin wrappers around controllers, so
behaviour is defined once.

## Evaluation of the proposed subpaths

| Proposed                | Verdict                        | Reason                                                                                                                        |
| ----------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `@neshel-ui/animations` | **keep** (implemented)         | Declarative React API for all lightweight families; tree-shaken (as `components`, feature 005 R2).                            |
| `…/core`                | **keep** (implemented)         | Framework-free engine: different runtime boundary (no React), usable by other packages and non-React code.                    |
| `…/styles.css`          | **keep** (implemented)         | Explicit stylesheet (ADR 0008).                                                                                               |
| `…/hover`               | allowed when implemented (010) | Family subpath approved by D3; Tilt3D moves here (re-exported from `.` while experimental).                                   |
| `…/scroll`              | allowed when implemented (011) | Family subpath approved by D3; engine primitives stay in `./core`.                                                            |
| `…/cinematic`           | allowed when implemented (013) | Family subpath approved by D3.                                                                                                |
| `…/boot`                | candidate (D4)                 | A tiny inline script (no React, < 1 KiB) setting a ready flag so entrance hidden states never hide SSR content when JS fails. |
| `…/gpu` (new)           | candidate (016)                | Optional WebGL capability; keeps GPU code and any rendering dependency out of every other bundle.                             |

Rule: a family subpath is added in the phase that implements the family, never before; it imports
only `./core` and shared internals (never another family's subpath), and updates the package contract
and `checkAnimationsContract`.

## Compatibility requirements (all levels)

`asChild` via Radix Slot with ref merging; React 19 ref-as-prop; ESM + declarations (NodeNext and
Bundler); precompiled CSS, never generated utility classes; tokens through CSS custom properties
(motion defaults inside Animations first, additive Config integration later — D5); SSR-safe markup; `"use client"` on React modules; no
provider required.
