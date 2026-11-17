# Contract — the 30 Phase 010 effects

**Status: implemented on `feature/010-entrance-hover-press`; verified locally** ([evidence](../evidence.md)).
Ids are stable (`family/name`); catalogue ids (E01…) are the specification references. "Catalogue →
010" records driver/structure changes and why (research R2–R4). Every effect accepts `reducedMotion:
"user" | "always" | "never"` (default `"user"`, live). Options are validated by `resolve` with the same
`NeshelAnimationsError` on the server and the client.

## §1 Entrance & Reveal — `@neshel-ui/animations/entrance`

Common options: `duration` (ms or preset; default 320, clip/mask/flip 500), `delay` (0–5000 ms),
`easing` (default `decelerate`; clip/flip `emphasized`), `appear` (default true), `replay` (change =
replay), `onFinish(status)`. Channels: `transform` (compose), `opacity` (multiply) + the listed exclusive
channel. At the end every contribution is cleared (element exactly as before). Hidden page at start or
during the run → final state. Driver for all: catalogue CSS → **JS (engine)** (R2); E11 catalogue
"CSS linear()" → engine spring (interruptible).

| Id  | Export (`id`)                  | Options                                                     | Exclusive   | Reduced  | Structure (catalogue → 010) |
| --- | ------------------------------ | ----------------------------------------------------------- | ----------- | -------- | --------------------------- |
| E01 | `fadeIn` (`entrance/fade`)            | —                                                    | —           | instant  | — |
| E02 | `fadeSlide` (`entrance/fade-slide`)   | `direction` up/down/left/right, `distance` 0–200 (16) | —           | fade     | — · presets `fadeUp/Down/Left/Right` |
| E03 | `scaleIn` (`entrance/scale`)          | `from` 0.3–1 (0.92)                                  | —           | fade     | — |
| E04 | `zoomIn` (`entrance/zoom`)            | `from` 1–2 (1.12)                                    | —           | fade     | — |
| E05 | `blurIn` (`entrance/blur`)            | `amount` 0–40 px (12)                                | `filter`    | fade     | — |
| E06 | `clipReveal` (`entrance/clip`)        | `shape` inset/circle, `direction`                    | `clip-path` | instant  | — · preset `clipCircle` |
| E07 | `maskWipe` (`entrance/mask-wipe`)     | `direction` (right), `softness` 0–100 % (25)         | `mask`      | instant  | — |
| E08 | `rotateIn` (`entrance/rotate`)        | `angle` −180–180 (−6)                                | —           | fade     | — |
| E09 | `flipIn` (`entrance/flip`)            | `axis` x/y, `angle` −120–120 (70), `perspective` 200–5000 (800) | — | fade | W → — (perspective inside the composed transform) · presets `flipX/Y` |
| E10 | `stagger` (`entrance/stagger`)        | `preset`, `options`, `interval` 0–1000 (60), `order`, `maxStagger` 0–3000 (900), `delay` | — (children) | fade (children's own) | G |
| E11 | `springIn` (`entrance/spring`)        | `direction`, `distance` (24), `from` (0.9), `spring` (bouncy) | —      | fade     | — |

Primitives: `<Reveal preset options appear replayKey asChild>`, `<Stagger preset options interval …>`.

## §2 Hover & Pointer — `@neshel-ui/animations/hover`

Common options: `pointerTypes` (mouse, pen; touch opt-in), `spring` (default `snappy` unless noted),
`disabled`. Activation: pointer inside the box (box-based hit area) **or keyboard `:focus-visible`
inside**, except magnetic and parallax (pointer only, decorative). Decor rendering needs `hover.css`.

| Id  | Export (`id`)                        | Options                                                     | Channels (host)                                  | Reduced | Catalogue → 010 driver / structure |
| --- | ------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------ | ------- | ----------------------------------- |
| H01 | `lift` (`hover/lift`)                | `distance` 0–40 (4), `scale` 1–1.2 (1), `shadow` (true)     | `transform`, `--neshel-lift-progress`            | static (shadow only) | CSS → JS + decor `::before` |
| H02 | `glow` (`hover/glow`)                | `color`, `size` 0–16 (3), `blur` 0–64 (16)                  | `--neshel-glow-{progress,color,size,blur}`       | static  | CSS → engine value + decor |
| H03 | `tilt3D` (`hover/tilt-3d`)           | 008 contract, unchanged                                     | `transform`                                      | off     | unchanged |
| H04 | `magnetic` (`hover/magnetic`)        | `strength` 0–1 (0.35), `max` 0–64 px (12)                   | `transform`                                      | off     | JS (unchanged) |
| H05 | `spotlight` (`hover/spotlight`)      | `color`, `size` 40–1000 (240), `intensity` 0–1 (0.22)       | `--neshel-spotlight-{progress,x,y,color,size,intensity}` | static (centred, no follow) | JS + decor |
| H06 | `borderSweep` (`hover/border-sweep`) | `width` 1–8 (2), `colors` [a, b], `duration` 500–20000 (3000) | `--neshel-layer-after` (sentinel), `--neshel-sweep-*` | static (ring, no rotation) | CSS → CSS-token on `::after` |
| H07 | `underline` (`hover/underline`)      | `thickness` 1–8 (2), `color`, `origin` left/center/right    | `--neshel-underline-*`                           | instant | CSS → engine value + decor |
| H08 | `mediaZoom` (`hover/media-zoom`)     | `scale` 1–2 (1.08); media = `[data-neshel-media]` or first child | media child's `transform` (its own host)   | static  | CSS → JS · W (the host is the frame) |
| H09 | `parallax` (`hover/parallax`)        | `strength` 0–100 px (16); layers = `[data-neshel-depth="-2…2"]` | each layer's `transform`                    | off     | JS · G |
| H10 | `shine` (`hover/shine`)              | `color`, `angle` 0–360 (110), `duration` 100–5000 (700)     | `--neshel-shine-{progress,color,angle}`          | static (none) | CSS → engine tween + decor (L² → pseudo-element) |

Primitive: `<Hover preset={lift} options>` or `<Hover preset={[lift, glow]}>`.

## §3 Press & Microinteractions — `@neshel-ui/animations/press`

Common options: `disabled`; disabled elements never react. Triggered effects play when `trigger`
changes after attachment (the initial value never plays).

| Id  | Export (`id`)                             | Options                                                       | Channels / target                       | Reduced | Catalogue → 010 |
| --- | ----------------------------------------- | ------------------------------------------------------------- | --------------------------------------- | ------- | --------------- |
| P01 | `pressScale` (`press/scale`)              | `scale` 0.5–1 (0.96), `spring`                                | `transform`                             | reduced (½ amplitude, no spring) | CSS → JS |
| P02 | `ripple` (`press/ripple`)                 | `color`, `opacity` 0–1 (0.22), `duration` 100–3000 (550)      | owned layer (WAAPI)                     | fade    | WAAPI · W → owned layer |
| P03 | `tapBounce` (`press/tap-bounce`)          | `strength` 0–1 (0.3), `spring` (bouncy)                       | `transform`                             | off     | JS |
| P04 | `toggleMorph` + `<ToggleMorph checked>`   | `checked`, `spring`, `stretch` 0–0.6 (0.3)                    | owned thumb `--neshel-toggle-{p,stretch}` | instant | CSS → JS on an owned element + CSS render |
| P05 | `checkboxDraw` + `<CheckboxDraw checked indeterminate>` | `duration` (240), `easing`                       | owned SVG `--neshel-check-progress`     | instant | CSS → JS on an owned element + CSS render |
| P06 | `burst` (`press/burst`)                   | `trigger`, `count` 3–24 (10), `distance` 8–160 (34), `size` 2–16 (6), `colors`, `duration` | owned layer (WAAPI) | static (none) | WAAPI · L → owned layer |
| P07 | `shake` (`press/shake`)                   | `trigger`, `distance` 1–30 (8), `cycles` 1–8 (4), `duration` (420) | `transform`                        | reduced (⅓ amplitude, ≤ 2 cycles) | CSS → JS |
| P08 | `nudge` (`press/nudge`)                   | `trigger`, `angle` 1–20 (6), `cycles` 1–6 (3), `duration` (600), `repeat` 0–3, `interval` 1000–10000 | `transform` | off | CSS → JS |
| P09 | `numberTick` + `<NumberTick value>`       | `value`, `format` / `locale` (en-US) / `formatOptions`, `duration` (600), `easing`, `live` | text of an owned aria-hidden span | instant | JS |
| P10 | `contentSwap` + `<ContentSwap active confirm>` | `live`                                                   | owned slots (CSS-token)                 | fade (opacity only) | CSS (owned slots) |

Primitive: `<Press preset={pressScale}>`, `<Press preset={[pressScale, ripple]}>`, `<Press preset={shake}
options={{ trigger: errors }}>`.

## §4 Not in Phase 010

H11 Cursor follower and P11 Long-press progress (Phase 012); scroll/intersection triggers (011); presence
and exit animations (012).
