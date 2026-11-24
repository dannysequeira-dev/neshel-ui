# Contract — F06 enter / exit (`@neshel-ui/animations/feedback`, after feature 017)

Catalogue entry F06 "Toast enter / exit" (reduced: fade) stays in Animations as a **generic** motion primitive. It
owns no messages, roles, actions, durations, queue or focus: the list owner does (for toasts, the Components
`Toaster`). Catalogue count unchanged: **157/157**. Implementation: `packages/animations/src/feedback/enter-exit.ts`,
`<EnterExit>` in `react.tsx`.

```ts
createEnterExit(container: HTMLElement, options?: EnterExitOptions): EnterExitControl
interface EnterExitOptions {
  from?: "bottom" | "top" | "start" | "end";   // default "bottom"
  exitTo?: "bottom" | "top" | "start" | "end"; // default "end"
  distance?: number;                            // px, 0–200, default 12
  duration?: number | DurationPreset;           // default 220
  selector?: string;                            // default "[data-state]"
  reducedMotion?: "user" | "always" | "never";
}
interface EnterExitControl { readonly size: number; update(options): void; destroy(): void }
<EnterExit {...options}><List /></EnterExit>     // Slot: the single child must take the ref
```

## DOM contract (no dependency in either direction)

| Signal from the owner                               | F06 response                                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| item added with `data-state="entering"` or `"open"` | enter from `from`: opacity 0 → 1, translate → 0                                                             |
| items present when F06 attaches                     | tracked, not animated (server-rendered content is never hidden again)                                       |
| `neshel-exit` event on an item (`detail.waitUntil`) | exit towards `exitTo`; passes a promise that settles when the exit completes (bounded by duration + 500 ms) |
| `data-state="closing"` without the event            | the same exit (lists that remove items on their own timeout)                                                |
| back to `entering`/`open` during an exit            | re-enter from the current progress                                                                          |
| item removed                                        | released; its styles restored                                                                               |

- Writes go through the element's Motion Host only (a transform layer and an opacity factor; compose-only channels,
  so no arbiter is needed); originals are restored on release and on `destroy()` (next write phase).
- Reduced motion (live): opacity only. Logical `start`/`end` follow the element's direction (RTL).
- One shared frame scheduler; no task remains after every run settles; `destroy()` is idempotent and releases
  pending `waitUntil` promises.
- Composition with Components: `<EnterExit><Toaster toaster={store} motion="none" /></EnterExit>`.

## Removed from Animations in 017

`createToaster`, `Toaster`, `ToasterProps`, `Toast`, `ToasterStore`, `ToasterOptions`, `ToastInput`, `ToastTone`,
`autoDuration`, the toast rules of `feedback.css`, and the `toasters`/`timers` debug counters
(`getFeedbackDebugInfo()` now reports `loadingButtons`, `optimistic`, `enterExit`). Animations is private 0.0.0, so
no compatibility layer is kept.
