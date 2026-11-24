# Feature Specification: Components Completion, Toast Migration & CI Stabilization (Phase 017)

**Feature Branch**: `feature/017-components-completion` (from `origin/main` `365a24d`, the PR #17 squash merge;
main CI run 45117009871 finished 13/14 — `browsers / macos-latest` failed on K-15)

**Created**: 2026-11-23

**Status**: Implemented; PR #18 in owner review. Planned vs implemented vs verified is tracked in
[evidence.md](evidence.md).

**Input**: Owner direction 2026-11-22, summarised in [brief.md](brief.md).

Companion documents: [research.md](research.md), [plan.md](plan.md), [tasks.md](tasks.md),
[ci-audit.md](ci-audit.md), [evidence.md](evidence.md); contracts
[overlay-escape.md](contracts/overlay-escape.md), [toast-api.md](contracts/toast-api.md),
[f06-enter-exit.md](contracts/f06-enter-exit.md), [disclosure-api.md](contracts/disclosure-api.md),
[switch-api.md](contracts/switch-api.md).

## Problem

Three things stand between Neshel-UI and documentation/publication work:

1. **CI cannot be trusted.** One Escape in a nested dialog intermittently closed _both_ dialogs (K-15). The test
   carried a 100 ms "known limitation" delay since feature 006, and green runs depended on timing. A library
   whose overlay contract holds only on fast machines is not robust.
2. **Responsibilities are misplaced.** The functional notification system (store, timers, queue, actions,
   focus, announcements) lives in `@neshel-ui/animations/feedback`, so a consumer needs the motion package to
   show an accessible message, and the motion package owns product behaviour.
3. **The component set is incomplete.** Disclosure widgets (Accordion, Collapsible) and a boolean Switch are
   missing from `@neshel-ui/components`.

## Goals

1. K-15 fixed at its cause, with deterministic reproduction, regression tests, stress evidence on three
   engines and three OSes, and a CI audit.
2. Toast/Toaster owned by Components; F06 reduced to a generic enter/exit motion primitive in Animations.
3. Accordion, Collapsible and Switch: accessible, typed, SSR-safe, themeable, documented in Storybook and the
   Playground.
4. A final PR whose exact head passes the full 14-job CI on the first attempt.

## Non-goals

- Public documentation site content (Phase 018), visual audit (019), release readiness (020).
- Any publication, version bump, tag, release, OIDC or release-workflow change; lifting the Animations guard.
- New dependencies (Base UI already ships the needed primitives; see research).
- Changing K-16 or reopening issue #9.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Nested overlays close one layer per Escape (Priority: P1)

A keyboard or assistive-technology user opens a dialog, opens a second dialog from it and presses Escape. Only
the top dialog closes and focus returns to the control that opened it; a second Escape closes the first dialog
and returns focus to its trigger — no matter how quickly the keys are pressed or how slow the machine is.

**Why this priority**: it is a broken accessibility contract and the blocker of the phase.

**Independent Test**: the nested-overlay scenarios pass repeatedly (≥ 30 times per engine) on Windows, Ubuntu and
macOS, and fail when the fix is removed.

**Acceptance Scenarios**:

1. **Given** two nested dialogs open with focus in the inner one, **When** Escape is pressed immediately,
   **Then** only the inner dialog closes and focus is on its trigger.
2. **Given** the inner dialog has just closed, **When** Escape is pressed immediately, **Then** the outer dialog
   closes and focus is on its trigger, with no overlay left behind.
3. **Given** the inner dialog's Escape handler cancels the event, **When** Escape is pressed, **Then** no dialog
   closes.
4. **Given** controlled, uncontrolled, StrictMode, Sheet/AlertDialog/Popover nested in a Dialog, or a selection
   popup open inside a dialog, **When** Escape is pressed, **Then** exactly the topmost layer reacts, once.

### User Story 2 — Accessible notifications without the motion package (Priority: P1)

An application developer installs only `@neshel-ui/components`, creates a toaster store and shows success,
warning and error messages with optional actions. Screen readers announce each message once; keyboard users
reach the notifications with a hotkey and close them with Escape; timers pause on hover, focus and hidden page.

**Why this priority**: owner-decided architectural correction; Components is the published package.

**Independent Test**: a packed consumer with Components only shows, announces, pauses, acts on and dismisses
toasts; the Animations package has no notification store.

**Acceptance Scenarios**:

1. **Given** a store and a mounted `Toaster`, **When** a toast is shown, **Then** it appears, is announced once in
   the polite (or, for errors, assertive) region, and auto-dismisses after its duration.
2. **Given** two `Toaster`s on one store, **When** a toast is shown, **Then** it is announced once.
3. **Given** a destroyed store, **When** any operation is called, **Then** nothing happens and nothing throws
   (invalid input still throws).
4. **Given** Animations is installed, **When** the developer opts into F06 on the toaster, **Then** the toasts
   enter/exit with the Motion Engine and Components' own CSS motion is off; with reduced motion, a fade.

### User Story 3 — Disclosure content (Priority: P2)

A developer builds an FAQ with Accordion (one or several sections open, optionally all closable) and a "show
more" region with Collapsible; keyboard users move between headers with arrows/Home/End and toggle with
Enter/Space; screen readers hear expanded/collapsed state and the controlled region.

**Independent Test**: unit, SSR/hydration, keyboard and axe checks plus a packed consumer.

**Acceptance Scenarios**:

1. **Given** a single Accordion that is not collapsible, **When** the open header is activated, **Then** it stays
   open; when collapsible, it closes.
2. **Given** a multiple Accordion, **When** two headers are activated, **Then** both sections are open and
   `onValueChange` receives both values.
3. **Given** a disabled item, **When** it is clicked or reached with arrows, **Then** it does not toggle and is
   skipped by arrow navigation.
4. **Given** server-rendered markup with `defaultValue`/`defaultOpen`, **When** it hydrates, **Then** there is no
   mismatch and the open state is visible before hydration.

### User Story 4 — Boolean settings with Switch (Priority: P2)

A developer adds a "Receive emails" switch to a settings form; it is labelled by `Label`, toggles with click,
touch and Space, submits `name=value` only when on, honours `required`/`disabled`, shows focus-visible and works
in forced colours.

**Independent Test**: unit, form serialisation, keyboard, axe, forced-colours style checks and a packed consumer.

**Acceptance Scenarios**:

1. **Given** an unchecked switch in a form, **When** Space is pressed, **Then** it is checked, `aria-checked` is
   `true`, and the form data contains `name=value`.
2. **Given** a required unchecked switch, **When** the form is submitted, **Then** native validation blocks it.

### Edge Cases

- Escape during the enter or exit of a nested layer; unmounting while the nested layer is open; both layers
  open on first render; Escape belonging to an open Select/Combobox listbox.
- Toasts: re-showing an id during its exit; more than `max`; actions with persistent duration; `destroy()` twice;
  StrictMode double effects; page hidden while a timer runs; hotkey with no toasts.
- Accordion: dynamic items added/removed; value not matching any item; nested accordions; content with
  focusable elements and overlays.
- Collapsible: content height changes while open; `keepMounted` vs unmount on close.
- Switch: controlled without `onCheckedChange` (read-only warning semantics as native inputs), form reset.

## Requirements _(mandatory)_

### Functional Requirements

**K-15 and CI**

- **FR-001**: One Escape MUST dismiss exactly one Neshel layer — the topmost open one — and MUST call the
  consumer's `onEscapeKeyDown` of that layer only, once.
- **FR-002**: The decision MUST NOT depend on timing (no delays in tests; a deterministic unit reproduction
  presses Escape before the deferred render).
- **FR-003**: Focus MUST return to the trigger of the layer that closed; no overlay or focus trap may remain.
- **FR-004**: Existing Dialog/Sheet/AlertDialog/Popover public APIs and Radix accessibility semantics MUST be
  unchanged.
- **FR-005**: A repetition runner MUST execute the nested-overlay scenarios ≥ 30 times per engine on Windows,
  Ubuntu and macOS in CI, counting every repetition, without retries.
- **FR-006**: The CI audit MUST classify each recent failure with run, SHA, job, error, cause, reproduction,
  fix, regression test and later result ([ci-audit.md](ci-audit.md)).

**Toast**

- **FR-010**: Components MUST export `createToaster`, `Toaster`, and the types `ToastInput`, `ToastTone`,
  `Toast`, `ToasterOptions`, `ToasterStore`, `ToasterProps` (contract: [toast-api.md](contracts/toast-api.md)).
- **FR-011**: Tones: `neutral`, `success`, `warning`, `error` (warning added because Components already has a
  semantic warning token pair); styles use semantic tokens only.
- **FR-012**: Keep: title/description, optional action, automatic/configurable/persistent duration, individual
  and global dismissal, `max` with oldest-unprotected eviction, pause/resume on hover/focus/hidden page, hotkey,
  Escape with focus restoration, single announcement, SSR/hydration, StrictMode, idempotent `destroy()`, inert
  after destroy, no orphan listeners or timers.
- **FR-013**: Several `Toaster`s on the same store MUST announce each toast once.
- **FR-014**: No React provider is required.
- **FR-015**: `@neshel-ui/animations` MUST NOT export a notification store, `Toaster`, toast types or
  toast-specific roles/timers after the migration.
- **FR-016**: F06 MUST remain in Animations as a generic enter/exit motion primitive over any keyed list whose
  items expose an open/closing state ([f06-enter-exit.md](contracts/f06-enter-exit.md)); it MUST honour
  `prefers-reduced-motion` live and write styles only through the motion host. The catalogue MUST stay 157/157.

**Accordion / Collapsible**

- **FR-020**: Accordion: `type` single/multiple, `value`/`defaultValue`/`onValueChange`, `collapsible` (single),
  `disabled` on root and item, heading level, `asChild` on the trigger, refs, keyboard per the WAI-ARIA
  accordion pattern (Enter/Space toggle; ArrowUp/ArrowDown/Home/End move between headers), `aria-expanded`,
  `aria-controls`, region labelling, `keepMounted` (hidden content remains in the DOM, `hidden="until-found"`
  where supported).
- **FR-021**: Collapsible: `open`/`defaultOpen`/`onOpenChange`, `disabled`, trigger `asChild`, refs,
  `aria-expanded`/`aria-controls`, `keepMounted`. It is not an Accordion item.
- **FR-022**: Both: optional CSS height/opacity transition that is off under reduced motion; content height
  follows dynamic content; SSR renders the initial state.

**Switch**

- **FR-030**: `checked`/`defaultChecked`/`onCheckedChange`, `disabled`, `required`, `name`, `value` (default
  `"on"`), `uiSize` consistent with Input/Select, `role="switch"`, `aria-checked`, Space toggles, click/touch,
  `Label` association by `id`, form submission/reset, focus-visible, forced-colors and reduced-motion styles.

**Cross-cutting**

- **FR-040**: No dependency between Components and Animations; no new third-party dependency.
- **FR-041**: Components `0.1.0` exports and behaviour stay compatible (additions only).
- **FR-042**: Each new component: unit, keyboard, axe, SSR/hydration and StrictMode-cleanup tests; Storybook
  stories (light/dark, controlled/uncontrolled); Playground demo; packed-consumer coverage.
- **FR-043**: Bundle budgets are not raised without owner approval; new measurements are proposals.

### Key Entities

- **Layer registry entry**: an open Neshel layer, its parent layer and its open order; decides Escape ownership.
- **Toaster store**: visible toasts, timers, pause reasons, protected toast, listeners, destroyed flag.
- **Toast**: id, title, description, tone, duration, action, version.

## Success Criteria _(mandatory)_

- **SC-001**: The nested-overlay scenarios pass 30/30 per engine (Chromium, Firefox, WebKit) on each of Windows,
  Ubuntu and macOS CI runners, and the deterministic unit reproduction fails without the fix.
- **SC-002**: The final PR head passes 14/14 CI jobs on its first attempt; every run is recorded.
- **SC-003**: A consumer with only Components shows and announces a toast once; the Animations package contains
  no notification store.
- **SC-004**: Accordion, Collapsible and Switch have zero axe violations in light and dark themes and are fully
  operable with the keyboard alone.
- **SC-005**: Hydration of server-rendered Accordion/Collapsible/Switch/Toaster produces no mismatch warnings.
- **SC-006**: Existing test counts are preserved or increased (before/after inventory in evidence.md); no test
  removed to make a total pass.
- **SC-007**: Measured gzip sizes are within existing budgets or proposed separately for approval.

## Assumptions

- Base UI `@base-ui/react` 1.9 (already a Components dependency) provides Accordion, Collapsible and Switch
  primitives; using them adds no dependency (research R3).
- The migrated toaster keeps the Phase 015 store semantics; the Components naming follows the existing
  contract (`createToaster`, `Toaster`, `ToasterStore` type).
- Windows CI covers the nested-overlay stress in the `windows-latest / Node 26` job (the `browsers` job runs on
  Ubuntu and macOS), so the job count stays 14.
