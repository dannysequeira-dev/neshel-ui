# Contract — `@neshel-ui/animations/advanced` (D01, D02, D03, D05, D07, D09, D11)

Experimental, private. Framework-free engines (`create…`) plus React components (client modules). Opt-in
stylesheet `@neshel-ui/animations/advanced.css` (layout of package-rendered structure and package layers only; it
never declares a transition or animation on a consumer element — rule R-1). Consumer elements change only through
the Motion Host (transform layers, opacity contributions, exclusive channels) and, for attributes (`inert`,
`aria-hidden`, `tabindex`, ARIA roles/labels), through a capture/restore ledger; `destroy()` restores everything
exactly and is idempotent. Options are validated (same errors on server and client); every engine accepts
`reducedMotion: "user" | "always" | "never"` (live). Nothing reads `window`/`document` at import.

Shared progress API (`ProgressControl`, from the 014 progress driver): `state`, `progress`, `finished`, `play`,
`pause`, `reverse`, `finish`, `cancel`, `seek(p)`, `track(options)` (C01 timeline track), `drive(source)` (any
`{ get, subscribe }` 0–1 source, e.g. the 011 `ScrollProgress`), `destroy`.

## D01 — `createCardFlip(root, options)` / `<CardFlip>`

Structure: `root` (perspective) › `inner` (default `root.firstElementChild`, rotated) › two faces (default the
inner's first two element children: front, back). React renders `div.neshel-flip > div.neshel-flip-inner >
(div.neshel-flip-face × 2)`.

| Option           | Type / range                            | Default                           |
| ---------------- | --------------------------------------- | --------------------------------- |
| `axis`           | `"y" \| "x"`                            | `"y"`                             |
| `direction`      | `1 \| -1`                               | `1`                               |
| `perspective`    | px 200–4000                             | 1200                              |
| `spring`         | spring options / preset                 | `{ stiffness: 170, damping: 22 }` |
| `flipped`        | initial side is the back                | `false`                           |
| `reducedEffect`  | `"fade" \| "instant"`                   | `"fade"`                          |
| `toggleSelector` | CSS selector of in-face toggles (click) | `[data-neshel-flip-toggle]`       |
| `onFlip(side)`   | called when the visible side changes    | —                                 |

Control `CardFlipControl`: `side` (`"front" | "back"`, the visible face), `progress` (0 front … 1 back), `flip(side?)`,
`toggle()`, `seek(p)` (exact pose, no animation), `drive(source)` (returns unsubscribe), `destroy()`.
Semantics: the hidden face is `inert` + `aria-hidden`; focus inside a face that turns away moves to the visible
face. React: `front`, `back`, `flipped` (controlled), `defaultFlipped`, `onFlippedChange`, `controlRef`.

## D02 — `createCubeRotate(root, options)` / `<CubeRotate>`

`root` gets class `neshel-cube` (panels = element children, stacked by `advanced.css`).

| Option        | Type / range                 | Default      |
| ------------- | ---------------------------- | ------------ |
| `axis`        | `"y" \| "x"`                 | `"y"`        |
| `index`       | initial panel                | 0            |
| `duration`    | ms 0–10000                   | 700          |
| `easing`      | easing / preset              | `"standard"` |
| `perspective` | px 200–6000                  | 1600         |
| `loop`        | wrap around at the ends      | `true`       |
| `onChange(i)` | logical active panel changed | —            |

Control `CubeControl` extends `ProgressControl` (the current transition): `index`, `count`, `go(i, { direction? })`,
`next()`, `previous()`, `refresh()` (re-read panels), `destroy()`. React: `index` (controlled), `defaultIndex`,
`onIndexChange`, children = panels.

## D03 — `createRingCarousel(root, options)` / `<RingCarousel>`

`root` gets class `neshel-ring` (items = element children).

| Option        | Type / range                                                           | Default                           |
| ------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `index`       | initial front item                                                     | 0                                 |
| `radius`      | `"auto"` or px 50–4000                                                 | `"auto"`                          |
| `gap`         | px 0–400 (auto radius)                                                 | 24                                |
| `perspective` | px 200–6000                                                            | 1400                              |
| `spring`      | spring options / preset                                                | `{ stiffness: 120, damping: 20 }` |
| `keyboard`    | arrow/Home/End on the focusable root                                   | `true`                            |
| `drag`        | pointer drag with velocity snap                                        | `true`                            |
| `label`       | accessible name of the carousel (required unless the root is labelled) | —                                 |
| `onChange(i)` | front item changed                                                     | —                                 |

Control `RingControl`: `index`, `count`, `angle` (deg), `go(i)`, `next()`, `previous()`, `refresh()`, `destroy()`.
Semantics: only the front item is interactive; others `inert` + `aria-hidden`; a polite live region announces
"Slide n of N".

## D05 — `createCornerRecede(root, options)` / `<CornerRecede>`

`root` must be positioned (React: `div.neshel-corner`); `surface` (default `root.firstElementChild`) covers it.

| Option         | Type / range                                                 | Default                                     |
| -------------- | ------------------------------------------------------------ | ------------------------------------------- |
| `size`         | fold leg as a fraction of the shorter side 0.1–0.6           | 0.35                                        |
| `angle`        | maximum fold angle, deg 10–85                                | 60                                          |
| `reverse`      | lift the corner toward the viewer instead                    | `false`                                     |
| `corners`      | allowed corners (subset of the four)                         | all                                         |
| `threshold`    | neutral zone around the centre 0–0.9                         | 0.3                                         |
| `spring`       | spring options / preset                                      | `{ stiffness: 260, damping: 18 }` (elastic) |
| `focusCorner`  | corner shown at 35 % on `:focus-visible` inside, or `false`  | `"top-right"`                               |
| `flap`         | `"clone"` (inert ID-free copy) or `"plain"` (surface colour) | `"clone"`                                   |
| `shade`        | flap darkening 0–0.6                                         | 0.3                                         |
| `pointerTypes` | pointer types that fold                                      | mouse, pen                                  |

Control `CornerRecedeControl`: `corner`, `amount`, `set(corner, amount)` (programmatic pose, animated),
`seek(corner, amount)` (exact pose), `reset()`, `destroy()`. Writes the surface's `clip-path` (exclusive); the flap is
package-owned.

## D07 — `createGlitch(element, options)` / `<Glitch>`

`element` must be positioned (React: `span.neshel-glitch`).

| Option      | Type / range                                                   | Default                  |
| ----------- | -------------------------------------------------------------- | ------------------------ |
| `intensity` | 0–1 (offset ≤ 6 px)                                            | 0.4                      |
| `duration`  | burst ms 100–2000                                              | 600                      |
| `rate`      | slice changes per second 1–3 (**hard cap 3**)                  | 3                        |
| `trigger`   | `"hover-focus" \| "hover" \| "focus" \| "visible" \| "manual"` | `"hover-focus"`          |
| `colors`    | two CSS colours for the channel layers                         | `["#ff2a6d", "#05d9e8"]` |
| `seed`      | integer (slice pattern)                                        | 1                        |

Control `GlitchControl`: `active`, `play()`, `stop()`, `destroy()`. Reduced motion: off.

## D09 — `createPerspectiveGrid(root, options)` / `<PerspectiveGrid>`

Appends one package layer (`aria-hidden`, `pointer-events: none`, clipped) to `root` (positioned).

| Option      | Type / range                         | Default        |
| ----------- | ------------------------------------ | -------------- |
| `horizon`   | fraction of the height 0–0.9         | 0.45           |
| `vanishing` | horizontal vanishing point 0–1       | 0.5            |
| `angle`     | plane tilt deg 45–85                 | 72             |
| `cell`      | px 8–256                             | 48             |
| `line`      | px 1–6                               | 2              |
| `color`     | CSS colour                           | `currentColor` |
| `fade`      | horizon fade                         | `true`         |
| `speed`     | cells/s toward the viewer 0–8        | 1              |
| `drift`     | lateral cells/s −4–4                 | 0              |
| `duration`  | ms 0–600000 or `Infinity` (explicit) | 5000           |

Control `GridControl`: `state` (`"running" | "paused" | "completed" | "reduced"`), `play()`, `pause()`, `destroy()`.

## D11 — `createTiltShift(root, options)` / `<TiltShift>`

Appends one package overlay to `root` (positioned).

| Option        | Type / range                                 | Default                           |
| ------------- | -------------------------------------------- | --------------------------------- |
| `orientation` | `"horizontal" \| "vertical" \| "radial"`     | `"horizontal"`                    |
| `focus`       | focal centre 0–1                             | 0.5                               |
| `size`        | focal band 0.1–0.9                           | 0.35                              |
| `blur`        | px 0–12                                      | 6                                 |
| `bands`       | per side 1–2                                 | 2                                 |
| `fallback`    | `"tint" \| "none"` without `backdrop-filter` | `"tint"`                          |
| `tint`        | CSS colour of the fallback                   | `rgb(0 0 0 / 0.25)`               |
| `progress`    | 0–1 source moving the focus                  | —                                 |
| `spring`      | focus spring                                 | `{ stiffness: 140, damping: 24 }` |

Control `TiltShiftControl`: `mode` (`"backdrop" | "tint" | "none"`), `focus`, `setFocus(center)`, `drive(source)`,
`destroy()`. Reduced motion: static (focus jumps).

## Diagnostics

`getAdvancedDebugInfo()`: live effects, flaps, glitch layers, grid layers, overlays, attribute ledger entries,
listeners and observers (tests and lab).

## Implementation notes (016.1–016.5)

- **D01**: `CardFlipControl.target` (the side the card is moving to) and the option `onToggle(side)` (an in-face toggle
  or `toggle()` changed the intent) were added. `<CardFlip onFlippedChange>` reports the **intent** at the toggle,
  before any motion; the controlled `flipped` prop only flips when it differs from `target`. Reporting the visual
  crossing instead let a late React commit undo a newer toggle (found by the WebKit run; regression test).
- **D02**: mid-turn, a face's outer edge would project at `(w/2)(sin θ + cos θ)` — up to √2 × the half width. The
  orbit is scaled by `1 / (sin θ + cos θ)` (translation and size), so faces never leave the panel box (no overflow);
  the cube recedes slightly mid-turn. The incoming panel is made visible before it takes focus.
- **D03**: `role="group"` is added only to generic elements (`div`, `span`); semantic items such as `<article>` keep
  their role (axe `aria-allowed-role`).
- Structural channels (`perspective`, `transform-style`, `backface-visibility`, `visibility`, `z-index`) go through
  the Motion Host like every other write; the host no longer lists them in `will-change`.
