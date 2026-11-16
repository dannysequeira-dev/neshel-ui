# Contract proposal — API levels and entry points

**Status:** `.`, `./core`, `./styles.css` **implemented** (008.0). Everything else here is a
**proposal** awaiting owner decision D3 ([plan.md](../plan.md#pending-decisions)).

## API levels

| Level         | Audience                       | Shape (examples)                                                                           |
| ------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| Declarative   | most applications              | `<Tilt3D>`, `<Reveal preset="fade-up">` (009), `<ScrollScene>` (010), `asChild` everywhere |
| Compositional | combining effects              | several effect components/hooks on one element, composed through channels (composition.md) |
| Programmatic  | custom interactions, non-React | `useTilt3D`, `createTilt3D`, `./core` scheduler/springs/composer, timelines (012)          |

Each effect is offered at the levels that make sense: a component (declarative), a hook on a
consumer ref, and an imperative controller. Components are thin wrappers around controllers, so
behaviour is defined once.

## Evaluation of the proposed subpaths

| Proposed                | Verdict                | Reason                                                                                                                        |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `@neshel-ui/animations` | **keep** (implemented) | Declarative React API for all lightweight families; tree-shaken (as `components`, feature 005 R2).                            |
| `…/core`                | **keep** (implemented) | Framework-free engine: different runtime boundary (no React), usable by other packages and non-React code.                    |
| `…/styles.css`          | **keep** (implemented) | Explicit stylesheet (ADR 0008).                                                                                               |
| `…/hover`               | reject for now         | A family name, not a cost or runtime boundary; tree-shaking already isolates it.                                              |
| `…/scroll`              | reject for now         | Same; scroll engine primitives belong in `./core`, React API in `.`.                                                          |
| `…/cinematic`           | reconsider in 012      | Justified only if the timeline engine is large enough to deserve explicit opt-in.                                             |
| `…/boot`                | candidate (D4)         | A tiny inline script (no React, < 1 KiB) setting a ready flag so entrance hidden states never hide SSR content when JS fails. |
| `…/gpu` (new)           | candidate (015)        | Optional WebGL capability; keeps GPU code and any rendering dependency out of every other bundle.                             |

Rule: a new subpath requires a measured reason (bundle check or runtime boundary) and an update of
the package contract and `checkAnimationsContract`.

## Compatibility requirements (all levels)

`asChild` via Radix Slot with ref merging; React 19 ref-as-prop; ESM + declarations (NodeNext and
Bundler); precompiled CSS, never generated utility classes; tokens through CSS custom properties
(motion tokens planned in `config`, 009); SSR-safe markup; `"use client"` on React modules; no
provider required.
