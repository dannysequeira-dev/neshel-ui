# Contract — React bindings and package entry points (Phase 009)

**Status: approved 2026-11-16; implemented and verified locally in Phase 009** ([evidence](../evidence.md)). Owner decision D3 (family subpaths as implemented).

## §1 Entry points after Phase 009

| Subpath        | Contents                                                                                                                                                                                                                                           | Change from 008.0          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `.`            | React bindings: `useMotionEffect`, `useMotionValue`, `useMotionValueEvent`, `NeshelAnimationsError`, types                                                                                                                                         | Tilt3D moves to `./hover`  |
| `./core`       | Engine: scheduler, springs, composer, reduced motion (008) + `defineEffect`, `createEffectRegistry`, `attachEffect`, `getMotionDebugInfo`, `motionValue`, `animateValue`, `bindChannel`, `animateElement`, easing, interpolation, `motionDefaults` | additive                   |
| `./hover`      | `Tilt3D`, `useTilt3D`, `createTilt3D`, `tilt3D` (definition)                                                                                                                                                                                       | new (first family subpath) |
| `./styles.css` | `.neshel-tilt`; rules read `--neshel-motion-*` with fallbacks                                                                                                                                                                                      | unchanged role             |

Rules: `./core` imports no React; a family subpath imports only `./core` internals and React (never
another family); `.` never re-exports family code. `checkAnimationsContract`, the contract test and
`check:pack --with animations` are updated to the new exact export list.

## §2 Hooks

```ts
useMotionEffect<O, R>(ref: RefObject<Element | null>, definition: EffectDefinition<O, R>, options?: O,
  config?: { conflicts?: ConflictPolicy }): EffectHandle<O> | undefined;  // undefined before mount / on the server
useMotionValue(initial: number): MotionValue;                              // stable for the component's life
useMotionValueEvent(value: MotionValue, listener: (value: number) => void): void; // no re-render
```

Behaviour (generalised from 008 `useTilt3D`): options validated during render with
`definition.resolve` (same error on server and client); attach after mount; `update` when option
values change (stable key); destroy on unmount; zero renders per frame; `"use client"`.

## §3 Effect components

Every effect component follows the Tilt3D pattern: props = options + HTML attributes, `asChild` via
Radix Slot, SSR markup = element + static class, behaviour through `useMotionEffect`.
