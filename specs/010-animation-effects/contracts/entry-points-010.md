# Contract — entry points after Phase 010

**Status: implemented; verified by the contract test, `check:pack --with animations` and
`check:animations:bundles`** ([evidence](../evidence.md)). Extends 009
[react-bindings.md](../../009-motion-engine/contracts/react-bindings.md) §1 (additive; no 009 export removed).

| Subpath        | Runtime exports                                                                                                                                                                                                                | Change from 009  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| `.`            | `useMotionEffect`, `useMotionValue`, `useMotionValueEvent`, `NeshelAnimationsError`                                                                                                                                            | unchanged        |
| `./core`       | 009 engine + `definePreset`, `attachPreset`                                                                                                                                                                                    | additive         |
| `./entrance`   | `fadeIn`, `fadeSlide`, `scaleIn`, `zoomIn`, `blurIn`, `clipReveal`, `maskWipe`, `rotateIn`, `flipIn`, `stagger`, `springIn`; presets `fadeUp/Down/Left/Right`, `clipCircle`, `flipX/Y`; `Reveal`, `Stagger`; `entranceEffects` | new              |
| `./hover`      | 009 Tilt3D API + `lift`, `glow`, `magnetic`, `spotlight`, `borderSweep`, `underline`, `mediaZoom`, `parallax`, `shine`; `Hover`; `hoverEffects`                                                                                | additive         |
| `./press`      | `pressScale`, `ripple`, `tapBounce`, `toggleMorph`, `checkboxDraw`, `burst`, `shake`, `nudge`, `numberTick`, `contentSwap`; `Press`, `ToggleMorph`, `CheckboxDraw`, `NumberTick`, `ContentSwap`; `pressEffects`                | new              |
| `./styles.css` | all family CSS (hover + press)                                                                                                                                                                                                 | content extended |
| `./hover.css`  | hover family CSS (incl. `.neshel-tilt`)                                                                                                                                                                                        | new              |
| `./press.css`  | press family CSS                                                                                                                                                                                                               | new              |

Rules (unchanged from 009, extended to the new families): `./core` imports no React and no family; a
family imports only `./core` internals, the shared React bindings (`src/react`) and React — never another
family; `.` never re-exports family code; every React module carries `"use client"`; nothing registers at
import time; `sideEffects` stays `["**/*.css"]`. The package stays `private: true`, `0.0.0`, outside the
Changesets fixed group and the release scripts.
