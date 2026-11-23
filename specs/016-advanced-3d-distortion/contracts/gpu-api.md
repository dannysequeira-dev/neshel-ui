# Contract — `@neshel-ui/animations/gpu` (GPU Surface Manager, D04, D06, D08, D10)

Experimental, private, **optional** (ADR 0031). WebGL2 only; no graphics dependency; shaders are package constants.
Nothing touches WebGL, `window` or `document` at import or on the server. Opt-in stylesheet
`@neshel-ui/animations/gpu.css` positions package frames and the D04 CSS driver; canvases are positioned inline.

## Manager

- `configureGpu({ maxContexts?: 1–8 (6), maxDpr?: 1–3 (2), memoryBudget?: MB 16–512 (96), maxTextureSize?:
  256–8192 (4096) })` — page-level limits; validated; applies to new requests.
- `getGpuSupport(): { webgl2: boolean; reason?: "server" | "unsupported" }` — lazy probe (one throwaway context,
  released immediately), cached.
- `getGpuDebugInfo()`: `{ surfaces, contexts, waiting, programs, shaders, buffers, textures, textureBytes,
  drawingBufferBytes, frames, draws, compileErrors, losses, restores, evictions, fallbacks }`.

Surface lifecycle (internal, `src/gpu/engine/surface.ts`): `request()` (mark dirty; ONE write-phase task per frame
draws all dirty visible surfaces), `ensure()` (lazy context + `init`), `release()` (delete every tracked object,
`WEBGL_lose_context.loseContext()`, zero and remove the canvas). Failure → `mode: "static"` with `reason`
(`unsupported | shader | cors | texture | memory | lost | budget`); the original content stays visible.

## Common effect behaviour

`frame` is a positioned element (React: `div.neshel-gpu-frame`) containing the source `<img>` (default: the first
`img` descendant) or a `<canvas>`. The `<img>` keeps every attribute; it gets an opacity contribution of 0 (Motion
Host) only after the first successful GPU draw and is restored on fallback, loss, reduced motion and destroy. The
canvas is `aria-hidden`, `role="presentation"`, `pointer-events: none`. Images must be decodable and CORS-clean
(same origin, `data:`/`blob:`, or `crossOrigin` with CORS headers). Every control has `mode` (`"gpu" | "static" |
"fallback"`), `reason`, `destroy()`. Options include `maxDpr` (≤ manager cap) and `reducedMotion`.

## D04 — `createPageCurl(frame, options)` / `<PageCurl>`

| Option                                                                         | Type / range                                                               | Default          |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------- |
| `driver`                                                                       | `"auto"` (GPU, CSS fallback) \| `"gpu"` \| `"css"` (rigid turn, live HTML) | `"auto"`         |
| `front`                                                                        | element to curl (GPU: `img`/`canvas`; CSS: any element)                    | first child      |
| `under`                                                                        | element revealed underneath (stacked by `gpu.css`)                         | second child     |
| `back`                                                                         | CSS colour of the page's reverse                                           | `#f1f5f9`        |
| `corner`                                                                       | `"top-right" \| "top-left" \| "bottom-right" \| "bottom-left"`             | `"bottom-right"` |
| `radius`                                                                       | curl radius as a fraction of the diagonal 0.02–0.4                         | 0.1              |
| `mesh`                                                                         | `"small" \| "medium" \| "large"` or `{ columns, rows }` ≤ 128×96           | `"medium"`       |
| `shading`                                                                      | 0–1                                                                        | 0.6              |
| `duration`, `easing`, `trigger` (`"manual"` default), `progress`, `onComplete` | progress options                                                           | 900 ms           |

Control `PageCurlControl` extends `ProgressControl` (+ `mode`, `reason`). Progress 0 = flat front, 1 = front fully
peeled (under shown). Reduced motion: instant.

## D06 — `createRipple(frame, options)` / `<Ripple>`

| Option       | Type / range                                                 | Default     |
| ------------ | ------------------------------------------------------------ | ----------- |
| `amplitude`  | 0–1 (≤ 0.03 UV)                                              | 0.5         |
| `frequency`  | 0.5–4                                                        | 1           |
| `damping`    | 0.5–6 (1/s)                                                  | 2.5         |
| `speed`      | 0.1–1.5 (UV/s)                                               | 0.45        |
| `maxImpacts` | 1–8                                                          | 4           |
| `trigger`    | `"pointer"` (pointerdown) \| `"hover"` (enter) \| `"manual"` | `"pointer"` |
| `seed`       | integer (seek pattern)                                       | 1           |
| `duration`   | ms for `seek`/`drive` 200–10000                              | 2400        |

Control `RippleControl`: `impact(x?, y?, strength?)` (0–1 coordinates), `seek(p)`, `drive(source)`, `clear()`,
`active`, `mode`, `reason`, `destroy()`. No frames once the energy dissipates. Reduced motion: off.

## D08 — `createDisplacementHover(frame, options)` / `<DisplacementHover>`

| Option        | Type / range                                  | Default                           |
| ------------- | --------------------------------------------- | --------------------------------- |
| `map`         | URL \| `img` \| `canvas` \| `"noise"`         | `"noise"`                         |
| `strength`    | 0–1 (≤ 0.08 UV)                               | 0.5                               |
| `scale`       | map tiling 0.25–4                             | 1                                 |
| `channels`    | `"rg" \| "r" \| "g"`                          | `"rg"`                            |
| `edge`        | `"clamp" \| "mirror" \| "fade"`               | `"fade"`                          |
| `focus`       | also on `:focus-visible` within the frame     | `true`                            |
| `spring`      | amount spring                                 | `{ stiffness: 180, damping: 26 }` |
| `crossOrigin` | `"anonymous" \| "use-credentials"` (URL maps) | `"anonymous"`                     |
| `seed`        | noise map seed                                | 1                                 |

Control: `amount`, `set(amount)`, `mode`, `reason`, `destroy()`. Reduced motion: static.

## D10 — `createDepthParallax(frame, options)` / `<DepthParallax>`

| Option                                  | Type / range                                       | Default            |
| --------------------------------------- | -------------------------------------------------- | ------------------ |
| `depth`                                 | URL \| `img` \| `canvas` (**required**; grayscale) | —                  |
| `invert`                                | black = near                                       | `false`            |
| `intensity`                             | 0–1 (≤ 0.06 UV)                                    | 0.5                |
| `focus`                                 | depth that stays still 0–1                         | 0.5                |
| `steps`                                 | 1–16                                               | 8                  |
| `pointer`                               | follow the pointer (spring)                        | `true`             |
| `from`, `to`                            | poses `{ x, y }` −1…1 for `seek`/`drive`           | `{-1,0}` → `{1,0}` |
| `spring`, `crossOrigin`, `pointerTypes` |                                                    |                    |

Control: `seek(p)`, `drive(source)`, `pose`, `mode`, `reason`, `destroy()`. Validation: aspect ratio within 2 % of the
image, texture size limits, depth range sampled (flat maps warn). Reduced motion: static.

## Implementation notes (016.2–016.5)

- `PageCurlControl.mode` is `"gpu" | "css" | "static"` (`css` = the rigid CSS driver, chosen or as the `auto`
  fallback with `reason`; `static` under reduced motion, without any driver, or while the GPU surface is evicted).
- Map and depth URLs accept relative paths, `http(s):`, `blob:` and `data:image/…` only (other schemes are refused);
  `data:` URLs are not length-limited below 16 MiB.
- `getGpuDebugInfo().lost` counts surfaces whose context is currently lost. A context the browser drops without a
  restore (observed in Playwright WebKit during mount/unmount churn) is replaced on the next frame request after 1 s.
- A synchronous debug draw (`probe`) draws before the visibility observer has reported; regular draws never run
  off-screen (one initial draw may happen before the first observation).
- PageCurl requests its GPU page again when reduced motion ends.
