# @neshel-ui/animations

![Experimental](https://img.shields.io/badge/status-experimental-D9B86A?style=flat-square) ![Not published on npm](https://img.shields.io/badge/npm-unpublished-64748B?style=flat-square&logo=npm&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white) ![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=0D1B39) [![MIT License](https://img.shields.io/github/license/dannysequeira-dev/neshel-ui?style=flat-square&color=D9B86A)](https://github.com/dannysequeira-dev/neshel-ui/blob/main/LICENSE)

Modular, accessible motion primitives and effects for Neshel-UI.

**Status: experimental, private, unpublished (feature 008.0).** This package is not on npm and its
API may change before the owner approves a first publication. Specification, catalogue and
decisions: [`specs/008-animations/`](../../specs/008-animations/spec.md), ADRs 0018–0020.

## What exists today

- `Tilt3D` — tilts an element in 3D toward the pointer and springs back; keyboard focus inside shows a
  gentle pose; `prefers-reduced-motion` keeps it flat (live); no React render per pointer move;
  `asChild`; SSR-safe.
- `useTilt3D(ref, options)` and `createTilt3D(element, options)` — the same effect on your own
  element, from React or plain DOM code.
- `@neshel-ui/animations/core` — the framework-free engine: frame scheduler (read/update/write
  phases), springs, per-element transform composer, reduced-motion policy.
- `@neshel-ui/animations/styles.css` — optional; adds `transform-style: preserve-3d` for depth
  children.

```tsx
import { Tilt3D } from "@neshel-ui/animations";
import "@neshel-ui/animations/styles.css"; // optional

<Tilt3D maxTilt={10} asChild>
  <a href="/pricing" className="card">
    Pricing
  </a>
</Tilt3D>;
```

Peer dependency: `react ^19.0.0`. Runtime dependency: `@radix-ui/react-slot`.

## Composition rule

JavaScript effects never write `transform` directly: they add layers to the element's transform
composer. CSS effects use the individual `translate` / `rotate` / `scale` properties. Both combine on
one element without conflicts (ADR 0019).

## License

MIT
