# Evidence — Phase 017

Status vocabulary (roadmap): **implemented**, **verified locally** (named machine), **verified in GitHub Actions**
(named run and SHA), **planned**. Local machine: Windows 11, Node 26.13.0, pnpm 12.16.1; Playwright Chromium
158.0.8127.18, Firefox 159.0, WebKit 27.2 (Playwright WebKit, not Safari).

## K-15 — nested overlays Escape order

### Before the fix

| Evidence                                       | Result                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| CI (4 runs, see [ci-audit.md](ci-audit.md) A1) | `{"dialogs":0,"active":"dialog-trigger"}` in `components-plain`, `-extend`, `-replace`                                   |
| Instrumented script, Escape as focus lands     | Chromium `components-replace` **11/30** correct; `components-plain` 5/10                                                 |
| Same script with the CI's 100 ms delay (local) | 10/10 correct — the window is short on a fast machine                                                                    |
| `pnpm stress:overlays` on pre-fix builds       | **181/360** — Chromium 61/120, WebKit **0/120**, Firefox 120/120 ([report](evidence/k15-stress-before-fix.windows.json)) |
| jsdom deterministic tests (`layers.test.mjs`)  | **7/9 failing** (both dialogs closed; outer `onEscapeKeyDown` called)                                                    |

Trace of a failing run (ms): `420.4 focus=nested-trigger · 422.6 layer-update · 423.6 focus=nested-close ·
423.8 dialogs=2 · 429.3 keydown=Escape · 430.9 listener swap · 432.5 dialogs=0 · 434.9 focus=dialog-trigger` —
the Escape listener moved to the nested layer only after the keydown. Cause and fix: [research R1](research.md),
[overlay-escape.md](contracts/overlay-escape.md).

### After the fix (local, Windows)

| Check                                                           | Result                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| jsdom `layers.test.mjs` (9 cases), 3 consecutive runs           | 9/9 each                                                           |
| Instrumented script, 30 runs × {plain, replace} × 3 engines     | 30/30 everywhere; Chromium CPU ×20 throttling 30/30                |
| `pnpm stress:overlays` (2 cases × 2 consumers × 3 engines × 30) | **360/360** ([report](evidence/k15-stress-after-fix.windows.json)) |
| `check:browsers` nested cases (no delay + rapid Escape)         | passing in all 12 engine × consumer combinations                   |

### After the fix (GitHub Actions)

| Run         | SHA       | Event             | Result                                                                                                                                                                                                                                                                                                                                |
| ----------- | --------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 45205431714 | `8514902` | workflow_dispatch | 11/14 — `browsers / macos-latest` **passed** (K-15 cases + 30× stress, 3 engines); `browsers / ubuntu-latest` passed (stress); `windows-latest / Node 26` passed (stress 3 engines); the 3 `docs` jobs failed: stale `apps/docs/generated/api/components.json` (`pnpm docs:api` not rerun after the root change) — fixed in `d2922d1` |

Later runs: see "CI runs of this phase" below.

## CI audit

[ci-audit.md](ci-audit.md): eight classes of failure since 2026-11-16; K-15 fixed at the cause; the recurrent
typecheck-before-build class (A2) now fails `pnpm test` locally through `tests/ts-paths.test.mjs` (negative control:
removing the `./feedback` mapping fails it).

## Test inventory (before → after)

| Suite                                               | `main` 365a24d        | This branch           | Notes                                                                                                |
| --------------------------------------------------- | --------------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm test:packages` (node:test, runtime count)     | 806                   | 843                   | +37                                                                                                  |
| ↳ Animations                                        | 602                   | 602                   | −7 toast tests (moved to Components), +7 F06 enter/exit tests                                        |
| ↳ Components                                        | 35                    | 72                    | +9 K-15, +10 Toast (incl. migrated store/R1 cases), +18 Accordion/Collapsible/Switch                 |
| `pnpm test` (scripts, runtime)                      | 115 (114 + 1 skipped) | 117 (116 + 1 skipped) | +2 `ts-paths` guard                                                                                  |
| `check:browsers` (Playwright, 3 engines × 4)        | 156 (13/variant)      | 216 (18/variant)      | +rapid Escape, +accordion, +collapsible, +switch, +toast; axe light/dark includes the new components |
| `check:browser:components` (CDP Chrome)             | 154 (37/variant) + 6  | 160 (40/variant) + 6  | +accordion/collapsible, +switch, +toast                                                              |
| `check:browser:animations` (CDP)                    | 197                   | 197                   | F06 case rewritten on the Components Toaster                                                         |
| `check:animations:engines` (Playwright, per engine) | 205                   | 205                   | Windows local: 205/0/0 in Chromium, Firefox, WebKit                                                  |
| `stress:overlays` (new)                             | —                     | 360 / OS run          | Windows (validate job), Ubuntu and macOS (browsers job)                                              |

No test was removed to make a total pass: the 7 removed Animations tests exercised the store that left the package;
their assertions live on in `packages/components/test/toast.test.mjs`.

## Exports before → after

- `@neshel-ui/components` (`.`): **added** `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`,
  `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`, `Switch`, `createToaster`, `Toaster` and the types
  `AccordionProps`, `AccordionSingleProps`, `AccordionMultipleProps`, `AccordionItemProps`, `AccordionTriggerProps`,
  `AccordionContentProps`, `CollapsibleProps`, `CollapsibleTriggerProps`, `CollapsibleContentProps`, `SwitchProps`,
  `Toast`, `ToastAction`, `ToastInput`, `ToastTone`, `ToasterOptions`, `ToasterStore`, `ToasterPlacement`,
  `ToasterProps`. Nothing removed or renamed; subpaths unchanged (`.`, `./styles.css`, `./style-manifest.json`).
- `@neshel-ui/animations/feedback`: **removed** `createToaster`, `Toaster`, `ToasterProps`, `Toast`,
  `ToasterStore`, `ToasterOptions`, `ToastInput`, `ToastTone`, `autoDuration`; **added** `createEnterExit`,
  `EnterExit`, `EnterExitProps`, `EnterExitOptions`, `EnterExitControl`, `EnterExitSide`, `NeshelExitDetail`;
  `getFeedbackDebugInfo()` fields now `loadingButtons`, `optimistic`, `enterExit`. Private 0.0.0 — no compatibility
  layer.

## Dependency boundaries

- No `@neshel-ui/animations` import in `packages/components` and no `@neshel-ui/components` import in
  `packages/animations` (grep in this branch: none). Composition happens in apps (Playground, Storybook) through
  `data-state` and the `neshel-exit` event.
- No new third-party dependency: Accordion, Collapsible and Switch use `@base-ui/react` 1.9.0 (already a Components
  dependency). Playground gained a workspace dependency on `@neshel-ui/components` (+ tsconfig path, guarded by
  `tests/ts-paths.test.mjs`).

## Budgets (gzip, packed tarballs, Windows measurement)

Owner approved on 2026-11-23 the proposal "measured + 10 %, rounded up to 512 B" (components) / the animations
rounding (F06):

| Entry                                                                        | Measured | Before | After (approved)  |
| ---------------------------------------------------------------------------- | -------- | ------ | ----------------- |
| `components/styles.css`                                                      | 6397 B   | 6144   | **7168**          |
| `components (entire library)`                                                | 131502 B | 132096 | **145408**        |
| `components: Accordion` (new)                                                | 13670 B  | —      | 15360             |
| `components: Collapsible` (new)                                              | 10557 B  | —      | 11776             |
| `components: Switch` (new)                                                   | 8919 B   | —      | 10240             |
| `components: Toaster + createToaster` (new)                                  | 8939 B   | —      | 10240             |
| `feedback: createEnterExit (no React)` (new)                                 | 7178 B   | —      | 7936              |
| `feedback: EnterExit` (new)                                                  | 8858 B   | —      | 9856              |
| `feedback: entire entry`                                                     | 12226 B  | 12352  | 12352 (unchanged) |
| removed: `feedback: createToaster (no React)` 1344, `feedback: Toaster` 3968 | —        | —      | —                 |

F06 was first measured at 8.94 KiB (full engine attach + `animateValue`); attaching without the arbiter
(compose-only channels) and a scheduler tween brought it to 7.01 KiB and kept the feedback entry within its
existing budget.

## Local gates (Windows 11, this branch)

| Gate                                                                                           | Result                                                                       |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm check` (doctor, lint, typecheck, test, build, test:packages, exports, pack + animations) | pass — scripts 116 + 1 skipped, packages 843/843, pack 5 public + animations |
| `pnpm check:consumer` (9 variants incl. 4 component labs, SSR prerender)                       | pass                                                                         |
| `pnpm check:browsers` (Chromium, Firefox, WebKit × 4 component consumers)                      | 216/216                                                                      |
| `pnpm stress:overlays` (30× each)                                                              | 360/360                                                                      |
| `pnpm check:browser:components` (CDP Chrome)                                                   | 166/166                                                                      |
| `pnpm check:browser:animations` (CDP)                                                          | 197/197                                                                      |
| `pnpm check:animations:engines`                                                                | Chromium 205/0/0, Firefox 205/0/0, WebKit 205/0/0                            |
| `pnpm check:animations:consumer`                                                               | pass (packed tarball, SSR, hydration; F06 enter on a plain list)             |
| `pnpm check:bundles` / `check:animations:bundles`                                              | pass with the owner-approved budgets                                         |
| Storybook build + generated declarations unchanged                                             | pass                                                                         |
| `docs:api --check`, `check:docs`, `docs:build`, `check:docs-site`                              | pass (156 pages, 345 coverage targets, no untranslated API text)             |
| `check:next`, `check:starters`, `release:simulate`                                             | pass (five packages still version to 0.1.0; guards untouched)                |

Issues found by these gates and fixed before pushing: `check:pack` import allow-list lacked the three new Base UI
subpaths; two docs demos needed `"use client"` (Next build); a stale generated API file (CI run 45205431714).

## CI runs of this phase

| Run         | SHA       | Event             | Attempt | Result                                                                          |
| ----------- | --------- | ----------------- | ------- | ------------------------------------------------------------------------------- |
| 45205431714 | `8514902` | workflow_dispatch | 1       | failure 11/14 — docs ×3 (stale generated API); every browsers/stress job passed |
