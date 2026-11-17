# Contract — drivers and the CSS strategy (Phase 010)

**Status: implemented on `feature/010-entrance-hover-press`; verified locally** ([evidence](../evidence.md)).
Decision: [ADR 0025](../../../docs/decisions/0025-presets-and-css-token-driver.md); research R2–R4, R7.

## §1 Drivers

| Driver          | What it animates                                                                | Used by                                                       |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **JS (engine)** | the consumer's element, only through motion-host channels (009)                 | E01–E11, H01, H04, H08, H09, P01, P03, P07, P08; decor values |
| **CSS-token**   | package-owned render targets (pseudo-element layers, package-rendered elements) | H02, H05, H06, H07, H10 render; P04, P05, P10                 |
| **WAAPI-layer** | transient package-owned layer elements                                          | P02, P06                                                      |
| **Text**        | the text of a package-owned aria-hidden element (write phase)                   | P09                                                           |

No second engine: JS effects use 009 `animateValue`/`motionValue`, the 008 spring integrator through an
internal spring rig on the shared scheduler, and `afterDelay` on scheduler time.

## §2 Rule R-1 and tokens

- **R-1**: no package stylesheet declares `transition` or `animation` on a subject that may be the
  consumer's element. Allowed subjects: `::before` / `::after` layers, package classes
  (`.neshel-toggle…`), children of package components (`> [data-slot]`, `> .neshel-…`). Enforced by
  `test/contract.test.mjs`.
- Tokens (`core/tokens.ts`, internal):
  - `data-neshel-fx~="<token>"` — present while the effect is attached **and granted** (added in
    `setup`, removed in `destroy`); reference-counted (shared `decor` token).
  - `data-neshel-fx-active~="<token>"` — interaction state for CSS-only parts (border sweep rotation).
  - `data-neshel-fx-reduced~="<token>"` — the resolved reduced-motion state (policy + media query,
    live) for CSS-only parts (border sweep, content swap).
- Static host properties needed by layers come from the stylesheet with zero specificity:
  `:where([data-neshel-fx~="decor"|"border-sweep"|"ripple"|"burst"]) { position: relative }`,
  `:where([data-neshel-fx~="media-zoom"]) { overflow: hidden }` — any positioning of the consumer wins.

## §3 Layers

| Layer                | Owner                                             | Composition                                                                                                                                                                     |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `::before` decor     | shared by lift, glow, spotlight, shine, underline | `box-shadow` list (lift, glow ring, glow halo) and `background-image` list (spotlight, shine, underline); each item from its effect's custom properties, transparent by default |
| `::after` ring       | border sweep, exclusively                         | sentinel exclusive channel `--neshel-layer-after`                                                                                                                               |
| ripple / burst layer | the effect, transiently                           | own `<span>` (aria-hidden, inert, `pointer-events: none`), removed when idle                                                                                                    |

Decor custom properties are declared on every decor host, so nested hosts never inherit an outer host's
state. The decor layer paints above the host's in-flow content (`pointer-events: none`); hosts with their
own `::before` content are unsupported for decor effects (documented limit).

## §4 Stylesheets

| Export                             | Contents                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `@neshel-ui/animations/hover.css`  | `.neshel-tilt` (008) + decor/ring layers + `@property --neshel-sweep-angle` |
| `@neshel-ui/animations/press.css`  | ripple/burst hosts, toggle, checkbox, content swap                          |
| `@neshel-ui/animations/styles.css` | header + hover.css + press.css (concatenated at build)                      |

Entrance needs no CSS. Every rule lives in `@layer components.neshel` (ADR 0008); outside the layer only
namespaced `@property` registrations; keyframes are `neshel-*`; selectors are package classes or engine
tokens; `--neshel-motion-*` are read with fallbacks and never declared (ADR 0024). Tailwind is never
required; plain-CSS applications import the file.

## §5 Reduced motion per driver

- JS: `context.reduced` (policy + live media query) — values jump or the vestibular part is dropped,
  according to the entry's behaviour (`off`, `fade`, `instant`, `static`, `reduced`).
- CSS-token: the `-reduced` token pauses/strips motion; without JavaScript no token exists, so nothing
  animates at all (stronger than a media-query rule).
- WAAPI-layer: `fade` (ripple: opacity only) or `static` (burst: none).
