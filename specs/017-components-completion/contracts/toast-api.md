# Contract — Toast / Toaster (`@neshel-ui/components`)

Owner decision (feature 017): notifications are a Components responsibility. Migrated from the Phase 015
`@neshel-ui/animations/feedback` F06 store and renderer (contract 015 §4, now superseded for everything except
motion). Implementation: `packages/components/src/toast-store.ts`, `packages/components/src/toast.tsx`.

## Store

```ts
createToaster({ max = 3, overflow = "evict" }?: ToasterOptions): ToasterStore
type ToastTone = "neutral" | "success" | "warning" | "error";
interface ToastInput { id?; title; description?; tone?; duration?; action?: { label; onAction() } }
interface ToasterStore {
  readonly toasts: readonly Toast[];   // visible, oldest first
  readonly queued: readonly Toast[];   // overflow: "queue" only
  readonly paused: boolean;
  show(input): string;                  // id; "" once destroyed
  dismiss(id); dismissAll(); pause(reason = "manual"); resume(reason = "manual");
  protect(id | undefined); subscribe(fn): () => void; destroy();
}
```

| Rule               | Contract                                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validation         | non-empty `title`; tone in the closed set; non-empty `action.label`; invalid input throws `TypeError` even after `destroy()`                                                                              |
| Duration           | omitted → 6000 ms + 60 ms/char (≤ 20000); with `action` → `Infinity`; numbers clamped 1000–60000; `Infinity` persistent                                                                                   |
| Re-show            | same id replaces content, `version + 1`, restarts its timer (queued: replaced in place, no timer)                                                                                                         |
| Overflow `"evict"` | beyond `max`, the oldest toast that is neither protected (focused) nor the new one is dismissed                                                                                                           |
| Overflow `"queue"` | beyond `max`, new toasts wait (not rendered, not announced, no timer) and are promoted oldest-first                                                                                                       |
| Pause              | any active reason stops every timer; resuming continues with the remaining time                                                                                                                           |
| Destroy            | clears toasts, queue, timers, reasons and listeners, then notifies the subscribers it had **once** of the final empty state (a mounted `<Toaster>` empties); idempotent; afterwards every method is inert |

The store is owned by the consumer; `<Toaster>` never destroys it. Changes from 015: `warning` tone (Components has
the semantic warning token pair), `overflow`/`queued`, `action.label` validation, error prefix
`[@neshel-ui/components]`. `autoDuration` and the debug counters are internal (not exported).

## `<Toaster>`

`toaster`, `label = "Notifications"`, `hotkey = "F8" | null`, `closeLabel = "Close"`,
`placement = "bottom-end" | "bottom-start" | "top-end" | "top-start"` (logical insets), `motion = "css" | "none"`,
`ref`, plus `<section>` attributes (`onPointerEnter/Leave`, `onFocus/Blur` are composed, not replaced).

- **Regions**: `role="status" aria-live="polite"` and `role="alert"` exist from the first render (also in SSR).
  `tone: "error"` goes to the alert region. Each toast id/version is announced **once per store**: the first mounted
  `<Toaster>` of a store announces, the next one takes over when it unmounts.
- **Timers**: paused on pointer hover, focus inside the region and `document.hidden`. Each mounted `<Toaster>` owns
  its pause reasons and the protection of its focused toast: leaving, blurring or unmounting one releases only its own,
  timers resume when no owner is left, and consumer reasons (even `"hover"`, `"focus"`, `"hidden"`) are independent.
  where focus came from). Escape on a focused toast closes it; focus moves to the next toast, the previous one or
  back to the remembered element. Every toast has a close button named by `closeLabel`; the action button runs
  `onAction` and closes the toast.
- **States**: `data-state="entering" → "open"` (next frame) → `"closing"` (inert). The exiting item is removed when
  every `element.getAnimations({ subtree: true })` animation has finished **and** every promise passed to the
  `neshel-exit` event's `detail.waitUntil()` has settled, bounded by 1000 ms. Re-showing an id during its exit
  re-enters it (generation guard).
- **Motion**: `motion="css"` uses Components transitions (reduced motion: 120 ms opacity only); `motion="none"`
  removes them so an external layer (Animations F06) can animate. Forced colours: system border colour.
- **SSR/hydration**: server markup renders the region and any toasts already in the store; hydration is clean.

## Non-goals

No provider, no imperative global singleton, no swipe-to-dismiss, no promise helper (`toast.promise`).
