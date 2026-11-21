# Contract — SVG & Paths API (S01–S10)

**Status: see [../evidence.md](../evidence.md).** Subpath `@neshel-ui/animations/svg` (family `svg`),
stylesheet `@neshel-ui/animations/svg.css` (opt-in; only package-rendered parts). Every effect returns the
shared `ProgressControl` of [text-api.md §1](text-api.md) (plus the methods listed), so S01, S02, S03 and
S10 join cinematic timelines through `track()` and scroll through `drive()`.

## 1. Writes

| Target                                                 | Mechanism                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consumer's path/stop/element styles                    | Motion Host internal exclusive channels: `stroke-dasharray`, `stroke-dashoffset`, `offset-path`, `offset-distance`, `offset-rotate`, `stop-color`, `stop-opacity`, `filter`, `mask`; transform layers and opacity contributions |
| Consumer's attributes (`d`, `offset` of a stop)        | svg attribute ledger: original value captured on first write, writes coalesced to the scheduler write phase, exact restoration (attribute removed if it was absent)                                                             |
| Package-rendered DOM (filter element, check/icon svgs) | created and removed by the effect; `aria-hidden`                                                                                                                                                                                |

Inline host writes win over the consumer's stylesheet and presentation attributes while the effect runs and
are restored exactly (inline value and priority) on release, so consumer dash patterns and colours come back.

## 2. Entries

| Id  | Engine / React                                                  | Options (defaults)                                                                                                                                                                    | Reduced |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| S01 | `createPathDraw(paths)` / `usePathDraw`, `<PathDraw>`           | `duration: 1200`, `easing`, `stagger: 0` (ms between paths), `reverse: false`, `release: true` (restore the consumer's dash styles at the end)                                        | instant |
| S02 | `createPathMorph(path, { shapes })` / `usePathMorph`            | `shapes: string[]`, `normalize`, `precision`, `incompatible: "error" \| "swap"`, `duration: 500`; `to(index)`, `trackTo(index)`                                                       | instant |
| S03 | `createMotionPath(element, { path })` / `useMotionPath`         | `path` (CSS px, element-relative), `rotate: "auto" \| "reverse" \| number`, `mode: "auto" \| "native" \| "js"`, `duration: 1600`, `repeat: 0`, `yoyo`                                 | static  |
| S04 | `createIconMorph(path, { shapes, state })` / `<MorphIcon>`      | `shapes: Record<string, string>` (compatible), `state`, `duration: 350`; `menuCloseShapes`                                                                                            | instant |
| S05 | `createGradientStops(gradient, { stops })` / `useGradientStops` | `stops: [{ color?: [from, to], opacity?: [a, b], offset?: [a, b] }]` (by index), `duration: 2400`, `repeat: 0`, `yoyo: true`                                                          | static  |
| S06 | `createChartDraw(svg, { lines, points })` / `useChartDraw`      | `lines` (selector/elements), `points` (selector/elements), `stagger: 150`, `duration: 1400`                                                                                           | instant |
| S07 | `createTurbulence(element)` / `useTurbulence`                   | `frequency: 0.02` (0.001–0.2), `amplitude: 6` (0–24 px), `octaves: 1` (1–3), `speed: 0.5` (0–2 cycles/s), `rate: 20` (1–30 Hz), `region: 0.1` (0–0.25), `repeat: 0`, `duration: 4000` | off     |
| S08 | `createLogoReveal(element)` / `useLogoReveal`                   | `pattern: "wipe-right" \| "wipe-left" \| "wipe-up" \| "wipe-down" \| "circle"`, `softness: 0.15`, `duration: 1000`, `outline` (paths drawn with S01 first)                            | instant |
| S09 | `createDashFlow(paths)` / `useDashFlow`                         | `dash: 6`, `gap: 4` (user units), `speed: 40` (units/s, ±), `repeat` in seconds of flow (`duration: 4000`; `Infinity` explicit)                                                       | static  |
| S10 | `createCheckmark(svg)` / `<SuccessCheck>`                       | `duration: 600`, `circle: true`; `<SuccessCheck>` renders an `aria-hidden` SVG unless `title` is given (`role="img"`)                                                                 | instant |

Foundation exports: `parsePathData`, `serializePathData`, `getPathGeometry`, `measurePath`,
`getPathMorphCompatibility`, `interpolatePath`, `getSvgSupport`, `getSvgDebugInfo`.

## 3. Per-entry rules

- **S01** — length from `measurePath` (pathLength honoured); dash array `L, L + pad` and offset so that only
  `[0, p·L]` is drawn and nothing (no cap dot) at `p = 0`; `d` changes re-measure (MutationObserver);
  zero-length paths are treated as drawn. With `release: true` the dash channels are released when the draw
  completes forwards (the consumer's own dash pattern returns); `release: false` keeps the solid stroke
  until `destroy()`.
- **S02** — compiled once per shape pair (research R9); writes the `d` attribute per frame through the
  ledger; interrupting `to()` continues from the currently rendered shape (compiled from the current
  interpolation state); `destroy()` restores the original `d` exactly.
- **S03** — native when `CSS.supports('offset-path', 'path("M0 0")')` (or `mode: "native"`): host channels;
  fallback (`mode: "js"` or no support): host transform layer from the JS geometry with the element's size
  measured once (and on resize). Both compose with the consumer's `transform` and other layers.
- **S04** — S02 with named states; the icon is decorative (`aria-hidden` on `<MorphIcon>`'s svg by default);
  the control's accessible name/state (`aria-label`, `aria-expanded`, `aria-pressed`) stays the consumer's
  responsibility and is never changed by the effect.
- **S05** — `stop-color: color-mix(in oklab, from p%, to)` (midpoint switch without `color-mix`);
  `stop-opacity` numeric; `offset` attribute; only the passed stops are touched; forced colours → static.
- **S06** — S01 on each line (stagger); each point is revealed (host opacity contribution) when the line's
  drawn length passes the point's projection on it (JS geometry, x-monotonic lines; otherwise in order).
- **S07** — package filter element in a hidden `<svg aria-hidden="true">` appended to `document.body`;
  `filter: url(#id)` through the arbitrated `filter` channel; turbulence updated at `rate` Hz while visible;
  off under reduced motion (filter removed).
- **S08** — `mask` channel with a linear or radial gradient from the progress, only when `mask-image` is
  supported; the logo is fully visible without support, without JS, before the effect starts and after
  destroy; optional decorative `outline` paths drawn first (S01); the logo's accessible name is untouched.
- **S09** — `stroke-dasharray: dash gap`, `stroke-dashoffset` advancing; runs only while visible and the page
  is visible; `pause()`/`play()`; static (dashes, no motion) under reduced motion.
- **S10** — S01 on the circle then the check (sequenced); no role, no live region added; the consumer
  announces success (e.g. its own status message).
