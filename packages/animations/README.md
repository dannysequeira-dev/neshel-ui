# @neshel-ui/animations

Modular, accessible motion primitives and effects for Neshel-UI.

**Status: experimental, private, unpublished (features 008.0–009).** This package is not on npm and its
API may change before the owner approves a first publication. Specification, catalogue and
decisions: [`specs/008-animations/`](../../specs/008-animations/spec.md), ADRs 0018–0020.

## What exists today

- `@neshel-ui/animations/core` — the framework-free motion engine: frame scheduler, springs, easing
  (`cubicBezier`, presets, `springEasing`), `motionDefaults`; effect definitions (`defineEffect`),
  explicit registries, `attachEffect`; a per-element motion host that owns managed inline styles
  (captures and restores original values and priorities, composes `transform`, multiplies `opacity`,
  arbitrates exclusive channels by priority with suspension and resumption, warns on conflicts in
  development); controllers (`animateValue`, `animateElement` for WAAPI, `bindChannel`) whose
  `finished` resolves `completed` / `cancelled` / `interrupted` and rejects only on real errors.
- `@neshel-ui/animations` — React bindings: `useMotionEffect`, `useMotionValue`, `useMotionValueEvent`.
- `@neshel-ui/animations/hover` — `Tilt3D`, `useTilt3D`, `createTilt3D`, `tilt3D` (inward by default,
  `reverse` inverts; keyboard focus pose; live reduced motion; `asChild`; SSR-safe).
- `@neshel-ui/animations/styles.css` — optional; `transform-style: preserve-3d` for depth children.

```tsx
import { Tilt3D } from "@neshel-ui/animations/hover";
import "@neshel-ui/animations/styles.css"; // optional

<Tilt3D maxTilt={10} asChild>
  <a href="/pricing" className="card">
    Pricing
  </a>
</Tilt3D>;
```

Peer dependency: `react ^19.0.0`. Runtime dependency: `@radix-ui/react-slot`.

## Composition rule

Effects never write managed styles directly: they go through the element's motion host (ADR 0019,
ADR 0022). `transform` layers compose, `opacity` multiplies, other channels have one owner at a time;
original inline styles are restored when effects end.

## License

MIT
