# Contract — Loading & Feedback API (`@neshel-ui/animations/feedback`, F01–F10)

Family `feedback`; opt-in stylesheet `@neshel-ui/animations/feedback.css`. **Semantics before motion**: every
component states what it means to assistive technology first; motion is decoration of that state.

## §1 Indicators

| Id  | Component                                                        | Semantics                                                                                                                                    | Reduced (live)                                      |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| F01 | `Spinner { label = "Loading", decorative, size }`                | `role="progressbar"` + `aria-label`, no value (indeterminate); `decorative` → `aria-hidden` (the region has `aria-busy`)                     | rotation → slow opacity pulse                       |
| F03 | `ProgressBar { label, value?, max = 100, valueText? }`           | `role="progressbar"`, `aria-valuemin/max`; `aria-valuenow` **only** with a real `value` (indeterminate otherwise); `aria-valuetext` optional | indeterminate sweep → slow pulse                    |
| F04 | `DotsPulse { label = "Loading", decorative }`                    | as F01                                                                                                                                       | bounce → slow opacity                               |
| F09 | `ProgressRing { label, value?, max, progress?: ProgressSource }` | as F03; a source updates the visual every frame but `aria-valuenow` only on integer-percent changes                                          | arc transitions instant; indeterminate → slow pulse |

`<progress>` evaluated and not used (research R15). No live regions in indicators: the consumer's status text
announces outcomes.

## §2 Skeleton and pending text

- F02 `Shimmer` (Slot; adds the `shimmer` engine token → `::after` sweep) and `SkeletonShimmer` (a package
  `span` placeholder, `aria-hidden`). The loading container carries `aria-busy="true"`; skeletons are never in
  the accessibility tree. Works on the Components `Skeleton` (`<Shimmer><Skeleton/></Shimmer>`), no dependency.
- F10 `PendingText { pending, children }` — a package `span` around the text; one accessible text; band only
  lightens the consumer colour; forced colours → plain `CanvasText`; reduced → static.

## §3 Success, optimistic, button

- F05 `SuccessMark { show, label?, size }` — package SVG (shape from `src/core/marks.ts`, shared with S10),
  drawn when `show` becomes true; decorative by default (`aria-hidden`); `label` → `role="img"` + name. It never
  announces: the consumer's status message does, only when the operation really succeeded.
- F07 `createLoadingButton(button, { loading, spinnerLabel? })` / `LoadingButton` (Slot, `loading` prop) — keeps
  the element, its accessible name and focus; sets `aria-disabled="true"` (original restored), prevents
  activation in the capture phase (click, Enter/Space, implicit submission), locks inline size from one
  measurement (host channel `min-inline-size`), hides the label visually (token style, still in the DOM) and
  shows the `::after` spinner. Use it on a Components `Button` **without** its `loading` prop (documented).
- F08 `createOptimisticPulse(element, o)` / `OptimisticPulse` (Slot; `status: "idle" | "pending" | "confirmed" |
  "failed"`) — pending pulse (`::before`), confirmed settles, failed shows a distinct static state and calls
  `onRollback`. `confirmed` only when the caller says the server confirmed.

## §4 Toasts (F06)

```ts
createToaster({ max = 3, duration = "auto" }): Toaster
toaster.show({ title, description?, tone?: "neutral" | "success" | "error", duration?, action?: { label, onAction } }): string
toaster.dismiss(id); toaster.pause(); toaster.resume(); toaster.subscribe(fn); toaster.toasts
toaster.destroy()
<Toaster toaster label="Notifications" hotkey="F8" closeLabel="Close" />
```

- Lifecycle: the consumer owns the store; `<Toaster>` never destroys it. `destroy()` clears every toast, timer,
  pause reason and listener and is idempotent. A destroyed store is **inert** (PR #16 review R1): `show()` still
  validates its input (invalid input throws) but returns `""` and creates no toast, timer or notification;
  `subscribe()` registers nothing and returns a no-op unsubscribe; `dismiss`, `dismissAll`, `pause`, `resume` and
  `protect` do nothing. No error is thrown, so late callbacks (a resolved request after unmount) are harmless.

- Two regions exist before any toast: `role="status"` (polite) and `role="alert"` (only `tone: "error"`); each
  toast's text is inserted once (never re-rendered per frame).
- Timers: `auto` = 6000 ms + 60 ms per character (max 20000); `Infinity` for toasts with actions by default;
  paused while any toast is hovered or focused and while the page is hidden; resumed after.
- Keyboard: every toast has a close button; Escape closes the focused toast; `hotkey` focuses the viewport;
  focus is never moved by a toast appearing; on dismissal of a focused toast focus moves to the next toast or
  back to where it came from.
- Motion: core Presence states (`entering → present → exiting`) on package toasts; CSS enter/exit transitions
  keyed on `data-state`; exit removal on `transitionend` or a bounded timeout; interruptions (re-show during
  exit) handled by Presence generations; reduced → fade. More than `max` → the oldest non-focused toast exits.
