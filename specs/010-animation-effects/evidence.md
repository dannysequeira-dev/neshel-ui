# Evidence — Phase 010: Animation Effects & Presets

What is implemented and how it was verified. "Run" means executed in this repository on the stated
machine; anything not run is listed under [Not run / pending](#not-run--pending). Windows 11, Node 26,
pnpm 12.16.1; package `@neshel-ui/animations` private, `0.0.0`.

## Repository preparation (brief §1)

- Local `main` clean; `git fetch origin`; `main` = `origin/main` = `44dc1c906bf921bff297b362b92bad3d5af16c71`
  (PR #6 squash). No fast-forward needed, no local changes to preserve.
- `feature/010-entrance-hover-press` created from `origin/main` (not from the old 009 branch).
- Phase 009/010 statuses updated in `CLAUDE.md` and `docs/roadmap.md`; 009 evidence left unchanged.

## Commits (slices)

| Slice | Commit    | Content                                                                                |
| ----- | --------- | -------------------------------------------------------------------------------------- |
| 010.0 | `2c50542` | brief, spec, research, contracts, ADR 0025, plan, tasks, analysis                      |
| 010.1 | `e17b794` | presets, shared core helpers, entrance family, `<Reveal>`/`<Stagger>`, entrance tests  |
| 010.2 | `42ca293` | hover family, `<Hover>`, hover.css, hover tests                                        |
| 010.3 | `b99f9f4` | press family, components, press.css, entry points, CSS build, contract updates         |
| 010.4 | `3743b8a` | composition tests, type tests, root pack-check fixtures, lint fixes                    |
| 010.4 | `425ee5e` | playground gallery, in-page suite, real-input cases (CDP + Playwright), bundle budgets |
| 010.4 | `4a039a6` | Storybook galleries, packed consumer extension, heterogeneous-list type fixture        |
| 010.4 | (this)    | catalogue/roadmap/README/CLAUDE.md/ADR index, evidence                                 |

## Inventory — the 30 effects

Every effect is a frozen `defineEffect` definition with a stable id, declared channels and reduced
behaviour (contracts/effects-010.md). "Unit" = `packages/animations/test/*.test.mjs`; "Lab" = the
in-page suite and/or real-input cases in Chrome (CDP) and Chromium/Firefox/WebKit (Playwright).

| Id  | Effect (export)                   | Unit tests                                                                         | Lab (3 engines + Chrome)                                |
| --- | --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| E01 | `fadeIn`                          | start pose, cleared at end, instant when reduced                                   | gallery end state                                       |
| E02 | `fadeSlide` (+ 4 presets)         | 4 directions, monotonic tween, fade-only reduced                                   | start pose then end state                               |
| E03 | `scaleIn`                         | start pose, × press scale                                                          | end state                                               |
| E04 | `zoomIn`                          | start pose                                                                         | end state                                               |
| E05 | `blurIn`                          | `filter` channel, suspended never hides content                                    | end state                                               |
| E06 | `clipReveal` (+ `clipCircle`)     | inset/circle values, destroy restores `clip-path`                                  | computed `clip-path: inset(…)` during, none after       |
| E07 | `maskWipe`                        | gradient mask value, instant when reduced                                          | computed `mask-image` gradient during                   |
| E08 | `rotateIn`                        | start pose                                                                         | end state                                               |
| E09 | `flipIn` (+ `flipX/Y`)            | perspective + rotateX/Y                                                            | end state                                               |
| E10 | `stagger`                         | capped interval, order, onFinish once, empty                                       | gallery children end state                              |
| E11 | `springIn`                        | overshoot then rest                                                                | end state                                               |
| H01 | `lift`                            | pointer, focus-visible vs mouse focus, touch opt-in, reduced static                | real mouse: translate + `::before` shadow; reduced live |
| H02 | `glow`                            | params only when non-default, restore consumer value                               | `::before` ring/halo                                    |
| H03 | `tilt3D` (008/009)                | 009 suite unchanged; composes with lift/glow/press                                 | 009 cases unchanged; composition case                   |
| H04 | `magnetic`                        | follow within max, pointer-only, off when reduced                                  | real mouse follow and return                            |
| H05 | `spotlight`                       | px position, fade, centred when reduced                                            | `::before` radial gradient                              |
| H06 | `borderSweep`                     | sentinel `::after` arbitration, active/reduced tokens                              | ring paused/running, angle animates (`@property`)       |
| H07 | `underline`                       | origin/thickness, instant when reduced                                             | `::before` bar size                                     |
| H08 | `mediaZoom`                       | child host scale, `[data-neshel-media]`, restore                                   | gallery                                                 |
| H09 | `parallax`                        | depth-scaled layers                                                                | gallery                                                 |
| H10 | `shine`                           | one sweep per activation, none when reduced                                        | `::before` layers compose                               |
| P01 | `pressScale`                      | pointer, Space/Enter, disabled/aria-disabled, ½ when reduced                       | real keyboard Space; composition case                   |
| P02 | `ripple`                          | owned aria-hidden/inert layer, geometry, fade-only reduced, void warning, no WAAPI | real mouse press/release; WAAPI running                 |
| P03 | `tapBounce`                       | squash + overshoot, off when reduced                                               | gallery                                                 |
| P04 | `toggleMorph` / `<ToggleMorph>`   | change-only motion, stretch mid-travel, instant reduced, SSR                       | thumb CSS position at rest                              |
| P05 | `checkboxDraw` / `<CheckboxDraw>` | draw on check, instant uncheck, SSR                                                | dash offset 0                                           |
| P06 | `burst`                           | trigger-only, particles removed, none when reduced                                 | particles appear and are removed                        |
| P07 | `shake`                           | damped oscillation, dev warning without ARIA, ⅓ reduced                            | gallery (ARIA error text)                               |
| P08 | `nudge`                           | ≤ 3 repeats, stops on hidden page, off when reduced                                | gallery                                                 |
| P09 | `numberTick` / `<NumberTick>`     | aria-hidden counting copy, final accessible copy, zero React commits               | accessible and visual copies final                      |
| P10 | `contentSwap` / `<ContentSwap>`   | hidden slot, token, reduced token, SSR                                             | idle `display: none`, confirm visible                   |

## Local verification (final head of the branch)

| Gate                                  | Result                                                                                                                                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                          | **pass** — doctor, lint, typecheck, root tests 108 (107 pass, 1 skipped, 0 fail), build, `test:packages` 370/370, `check:exports`, `check:pack --with animations` (10 runtime imports, 10 typed entry points under NodeNext and Bundler) |
| `packages/animations` unit tests      | **166/166** (009 suites unchanged except the exact-export lists)                                                                                                                                                                         |
| Type fixtures                         | `type-tests/{valid,invalid,engine,presets,presets-invalid}.tsx` — positive compile, every `@ts-expect-error` needed                                                                                                                      |
| `pnpm build:playground`               | pass                                                                                                                                                                                                                                     |
| `pnpm check:browser:animations` (CDP) | **44/44** — Chrome 157.0.8103.51 (008/009 cases + 15 in-page effect cases + 5 real-input cases + live reduced motion + axe on the whole lab page)                                                                                        |
| `pnpm check:animations:engines`       | **36/36 per engine** — Chromium 158.0.8127.18, Firefox 159.0, WebKit 27.2 (Playwright, not Safari); includes axe on the gallery                                                                                                          |
| `pnpm check:animations:consumer`      | **pass** — packed tarball, plain-CSS Vite app, SSR, hydration without recoverable errors, no entrance replay on hydration, real lift with packed hover.css, real press ripple                                                            |
| `pnpm check:animations:bundles`       | **pass** — every budget, every tree-shaking marker (table below)                                                                                                                                                                         |
| `pnpm build:storybook`                | pass (Entrance, Hover, Press, Composition stories)                                                                                                                                                                                       |

Engine notes (feature detection in the lab): `@property` angle animation, `transition-behavior:
allow-discrete`, individual transforms and `linear()` supported in all three engines; `sweepAngleAnimates`
true everywhere.

### Research R2 spike cases (three engines + Chrome)

- **R2a**: an element with inline `transform: rotate(10deg)` and a CSS keyframe animation of `transform`
  computes the animation's `translateX(30px)` with no rotation — CSS animations override the inline
  (composed) value.
- **R2b**: an element with a layered package-like `transition: translate …` and the consumer's unlayered
  `transition: background-color …` computes `transition-property: background-color` — the package
  transition is silently lost.
- **R-1 at runtime**: every gallery host (`[data-neshel-fx]`, `.neshel-reveal/hover/press/stagger`)
  computes `transition-duration: 0s` and `animation-name: none`.

## Bundles (packed tarball, Vite/Rolldown minified, React external, gzip -9)

009 budgets unchanged. New budgets proposed from these measurements (≈ +8 %, rounded to 0.05 KiB steps).

| Entry                                  | Measured  | Budget    |
| -------------------------------------- | --------- | --------- |
| core (entire entry) — 009              | 8.99 KiB  | 9.50 KiB  |
| registry + host — 009                  | 4.69 KiB  | 5.00 KiB  |
| composeTransform — 009                 | 0.50 KiB  | 0.60 KiB  |
| controllers — 009                      | 3.47 KiB  | 3.80 KiB  |
| hover: Tilt3D — 009                    | 8.01 KiB  | 8.75 KiB  |
| hover: createTilt3D (no React) — 009   | 6.02 KiB  | 6.60 KiB  |
| root: React bindings — 009             | 4.50 KiB  | 4.90 KiB  |
| core: definePreset + attachPreset      | 4.23 KiB  | 4.60 KiB  |
| entrance: Reveal + fadeUp              | 11.40 KiB | 12.25 KiB |
| entrance: fadeIn definition (no React) | 6.04 KiB  | 6.50 KiB  |
| entrance: entire entry                 | 13.27 KiB | 14.25 KiB |
| hover: Hover + lift                    | 10.98 KiB | 11.75 KiB |
| hover: lift definition (no React)      | 5.17 KiB  | 5.60 KiB  |
| hover: entire entry (incl. Tilt3D)     | 16.02 KiB | 17.25 KiB |
| press: Press + pressScale              | 9.93 KiB  | 10.75 KiB |
| press: ripple definition (no React)    | 4.72 KiB  | 5.10 KiB  |
| press: NumberTick                      | 8.72 KiB  | 9.40 KiB  |
| press: entire entry                    | 15.91 KiB | 17.00 KiB |
| css: hover.css                         | 1.67 KiB  | 1.85 KiB  |
| css: press.css                         | 1.42 KiB  | 1.60 KiB  |
| css: styles.css                        | 2.83 KiB  | 3.10 KiB  |

Deltas of 009 entries against the 009 evidence (8.80 / 4.69 / 8.00 / 4.43 KiB): core +0.19 KiB (the new
public `definePreset`/`attachPreset` are part of the entire core entry), root +0.07 KiB, Tilt3D +0.01 KiB,
registry + host ±0. Markers confirm: family entries never contain another family's code; Tilt3D stays
arbiter-free; definitions without React contain no React/Slot; WAAPI only where expected (ripple).
Raw report: [bundles-report.json](bundles-report.json).

## Findings during implementation

1. **Entrance completion must be synchronous with the frame.** Relying on the controller's `finished`
   promise cleared contributions a microtask later (visible as late cleanup in deterministic tests);
   `whenSettled` (internal, scheduler write phase) settles in the frame the run ends.
2. **`:focus-visible` in jsdom** depends on a heuristic of previous events; unit tests stub the match to
   prove that keyboard focus activates and mouse focus does not. Real keyboard modality is covered in
   the browsers (Tilt3D cases).
3. **Heterogeneous preset lists**: mapping a union of presets into `<Reveal preset>` needs the list typed
   `PresetInput<EntranceOptions, unknown>` (inference picks one member otherwise); documented by a
   positive type fixture and used in the gallery and Storybook.
4. **Line endings**: edits made with a script on Windows briefly produced CRLF files; normalised (the
   repository stores LF; `core.autocrlf=true`).

## Phase 009 contracts

No incompatible change. Additive: `definePreset`, `attachPreset` (core); `optionsKey` exported from an
internal React module for reuse. 009 tests changed only in their exact-export lists.

## Not run / pending

- **GitHub Actions on Linux, Windows and macOS** — runs after the push of this branch (PR); result
  recorded in the PR, not claimed here.
- **Manual screen-reader pass** (NVDA/VoiceOver) of toggle/checkbox/number tick/content swap — owner
  validation before any publication (automated axe and semantics tests ran).
- **Real Safari** (Playwright WebKit is not Safari) — pending before publication.
- **Visual review** of the gallery and Storybook by the owner (the checks assert computed styles, not
  aesthetics).
