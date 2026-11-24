# Research — Phase 017

## R1 — K-15 root cause (nested overlays, one Escape closed both)

**Evidence.** CI: runs 45117009871 (`components-replace`), 45112369472 and 45101418861 (`components-plain`),
45079243865 attempt 1 (`components-extend`) — all `browsers / macos-latest`, Chromium, message
`timed out: only the nested dialog closed ({"dialogs":0,"active":"dialog-trigger"})`. So the defect is not tied to a
consumer variant.

**Reproduction.** An instrumented Playwright script (wrapped `addEventListener` for capture `keydown` on `document`,
`dismissableLayer.update`, `focusin`, dialog-count mutations) pressed Escape as soon as focus landed in the nested
dialog: **11/30 correct** (Chromium, `components-replace`), 5/10 (`components-plain`). With the CI's 100 ms delay
locally: 10/10 — the window is short on a fast machine, longer on loaded runners.

**Cause.** Radix `@radix-ui/react-dismissable-layer` 1.2.1 registers the Escape listener only on the layer that was
the highest at its last render, and that render is refreshed by a deferred state update after
`dismissableLayer.update`. Focus moves into the nested dialog (FocusScope mount effect) **before** that refresh,
so for a few milliseconds the outer layer owns Escape. Its dismissal unmounts the nested dialog with it. The reverse
window also exists: after the nested layer unmounts, no layer listens until the outer one re-renders (a quick second
Escape was lost). Not test synchronisation, not a consumer difference, not React batching per se.

**Rejected fixes.** Longer delays/retries/skips (forbidden; hide a real defect). Patching Radix (`pnpm patch`) —
fragile across updates and invisible to consumers. Forcing a synchronous re-render of Radix layers — no public API.
Capturing Escape globally and stopping propagation — would break Base UI selection popups and consumer handlers.

**Decision.** Neshel registry of open layers (layout effects, parent-aware ranking) consulted at event time from each
layer's `onEscapeKeyDown`; routes to the topmost layer, dedupes per event, plus a document fallback for the no-owner
window. Roots own their open state (same contract as Radix) so a routed Escape can close the right layer.
Contract: [overlay-escape.md](contracts/overlay-escape.md).

**Deterministic unit reproduction.** jsdom + React outside `act()`: click the nested trigger, flush microtasks (the
discrete render and its passive effects run; the forced re-render is still queued in the scheduler), dispatch
Escape. Before the fix 7/9 tests fail (both dialogs close, outer handler called); after, 9/9 pass.

## R2 — CI audit method

Every failed CI run since 2026-11-16 (and attempt 1 of reruns) was read with `gh run view --log-failed`;
classification in [ci-audit.md](ci-audit.md).

## R3 — Primitives for Accordion, Collapsible, Switch

`@base-ui/react` 1.9.0 is already a Components dependency (Select, Combobox) and ships `accordion`, `collapsible`
and `switch`. Radix equivalents would be **new** dependencies (`@radix-ui/react-accordion`, `-collapsible`,
`-switch` are not installed). Decision: Base UI, no new dependency. Base UI exposes `--accordion-panel-height` /
`--collapsible-panel-height` and `data-starting-style`/`data-ending-style` for CSS transitions, `hiddenUntilFound`
and `keepMounted`, and a Switch with a hidden native input for forms.

## R4 — Toast ownership

Base UI also ships a Toast, but it requires a React provider and its own manager; the owner's brief keeps the
framework-free store (`createToaster`) and no global provider. Decision: move the Phase 015 store and renderer to
Components, replacing Animations-core dependencies (Presence, frame scheduler) with a small local keyed exit list
and `requestAnimationFrame`. Exit completes when every animation/transition on the item finishes
(`element.getAnimations()`), bounded by a timeout — a DOM contract that works for Components' CSS and for F06.

## R5 — F06 after the migration

F06 (catalogue "Toast enter / exit", CSS, reduced: fade) becomes a generic enter/exit primitive for keyed lists:
`createEnterExit(container, options)` / `<EnterExit>` observe items carrying `data-state` (`entering`/`open`/
`closing`) and play enter/exit through the motion host; reduced motion → opacity only. Components' `Toaster` exposes
`motion="none"` so its own CSS motion does not double up. Contract: [f06-enter-exit.md](contracts/f06-enter-exit.md).

## R6 — Recurrent "typecheck before build" failures

Five phases each failed once with TS2307 for a new Animations subpath (runs 44092856532, 44193970348,
44401270564, 44590484219, 45038066392): CI typechecks before building, and the hand-maintained tsconfig `paths`
missed the new subpath. Each was fixed by adding the mapping. Decision: a fast `pnpm test` guard that compares
package `exports` with the `paths` of every project that maps them, so the class fails locally before CI.
