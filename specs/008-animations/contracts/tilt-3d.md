# Contract — Tilt3D (experiment A, catalogue H03)

**Status: implemented and verified locally** — `test/tilt.test.mjs` (jsdom + SSR), type fixtures,
`check:browser:animations` (Chrome). Experimental; the API may change before publication.

## §1 Component

```tsx
import { Tilt3D } from "@neshel-ui/animations";

<Tilt3D maxTilt={10} className="card">…</Tilt3D>
<Tilt3D asChild><a href="/pricing" className="card">Pricing</a></Tilt3D>
```

`Tilt3DProps = Tilt3DOptions & Omit<HTMLAttributes<HTMLDivElement>, keyof Tilt3DOptions> & { asChild?; ref?; children? }`.
Renders a `<div class="neshel-tilt …">`, or with `asChild` the single child element with merged
`className` and refs (Radix Slot). SSR markup contains only the class; the effect starts after
hydration.

## §2 Options

| Option          | Type                              | Default            | Rule                                     |
| --------------- | --------------------------------- | ------------------ | ---------------------------------------- |
| `maxTilt`       | number (deg)                      | `10`               | 0–45                                     |
| `perspective`   | number (px)                       | `1000`             | 100–100 000                              |
| `scale`         | number                            | `1`                | 0.5–2, while pointer or focus is active  |
| `axis`          | `"both" \| "x" \| "y"`            | `"both"`           | `"x"`: rotateX only; `"y"`: rotateY only |
| `reverse`       | boolean                           | `false`            | tilt toward the pointer                  |
| `spring`        | `SpringOptions`                   | core defaults      | validated by `resolveSpring`             |
| `pointerTypes`  | `("mouse" \| "pen" \| "touch")[]` | `["mouse", "pen"]` | touch opt-in                             |
| `focusTilt`     | boolean                           | `true`             | focus pose = 35 % of `maxTilt`           |
| `reducedMotion` | `"user" \| "always" \| "never"`   | `"user"`           | [accessibility.md](accessibility.md)     |
| `disabled`      | boolean                           | `false`            | rest, ignore input                       |

Invalid values throw `NeshelAnimationsError` (message prefix `[@neshel-ui/animations] Tilt3D:`),
during render on server and client.

## §3 Behaviour

- Normalised pointer `x, y ∈ [-1, 1]` relative to the untransformed box centre.
  Default ("press away"): `rotateX = −y · maxTilt`, `rotateY = x · maxTilt` (top-right → both
  positive: that corner recedes). `reverse` negates both.
- Three springs (rotateX, rotateY, scale) follow the target; the transform composer writes
  `perspective(p) rotateX() rotateY() scale()` once per frame; at rest the inline `transform` and
  `will-change` are removed and the frame task stops.
- Hit area: the untransformed layout box. Hover starts on `pointerenter` (or the first
  `pointermove`), then `pointermove` is followed on `window` until the pointer leaves the box;
  `pointerleave` inside the box is ignored; leaving the document ends hover. Window and document
  listeners exist only during hover.
- The box is measured once per hover (`offsetWidth/offsetHeight` + bounding-box centre) and
  invalidated by scroll (capture) and resize.
- Focus: `focusin` with `:focus-visible` → focus pose; `focusout` to outside → rest. Pointer has
  priority over focus.
- State attribute `data-neshel-tilt`: `rest | pointer | focus | reduced | disabled` (set after mount,
  removed on destroy) — for styling hooks and tests.

## §4 Hook and controller

```ts
useTilt3D(ref: RefObject<HTMLElement | null>, options?: Tilt3DOptions): void;
createTilt3D(element: HTMLElement, options?: Tilt3DOptions): { update(options?): void; destroy(): void; readonly state: Tilt3DState };
```

The hook validates during render, creates the controller after mount, calls `update` when option
values change (no listener re-creation) and destroys it on unmount. `destroy()` is idempotent and
removes every listener (element, window, document element, media query), cancels frames, removes
inline styles and the state attribute.

## §5 Performance

No React state; zero renders during pointer movement (verified). One rAF task per active tilt,
none at rest. Bundle (observed, gzip, React external): component 5.95 KiB incl. Slot; hook
4.08 KiB; controller 3.90 KiB.

## §6 Known limits

- The centre comes from the bounding box; re-measuring while strongly tilted shifts it by a few
  pixels (perspective projection) — acceptable for a decorative effect.
- A consumer's own inline `transform` on the same element is replaced while tilting (dev warning);
  use a wrapper or the individual transform properties.
- Children that need depth (`translateZ`) require `./styles.css` (`transform-style: preserve-3d`).
