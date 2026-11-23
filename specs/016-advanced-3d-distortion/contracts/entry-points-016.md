# Contract — entry points (Phase 016)

| Subpath      | Contents                                                                               | Imports allowed                                  | CSS              |
| ------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------- |
| `./advanced` | D01, D02, D03, D05, D07, D09, D11 engines + React + `getAdvancedDebugInfo`             | `src/core`, `src/react`, React, Radix Slot       | `./advanced.css` |
| `./gpu`      | `configureGpu`, `getGpuSupport`, `getGpuDebugInfo`, D04, D06, D08, D10 engines + React | `src/core`, `src/react`, `src/gpu/engine`, React | `./gpu.css`      |

Rules: `./advanced` never imports `src/gpu` (contract test + bundle inspection for `webgl2`/`createShader`/GLSL
markers); neither imports another family subpath; `./core` public exports are unchanged; both are SSR-safe at
import (tested by importing `dist` in plain Node). `package.json` `exports`, `files` and `sideEffects` (`**/*.css`)
cover the new entries; `check:pack` validates them in the tarball.
