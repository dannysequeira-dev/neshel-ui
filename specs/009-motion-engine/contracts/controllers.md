# Contract — motion controllers, motion values and drivers (Phase 009)

**Status: approved 2026-11-16 (with owner requirement 3.2); implemented in 009.4.** Decision:
[ADR 0023](../../../docs/decisions/0023-motion-controllers-and-drivers.md). Exported from
`@neshel-ui/animations/core`.

## §1 MotionControl

```ts
type MotionState =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "interrupted"
  | "failed";

interface MotionResult {
  status: "completed" | "cancelled" | "interrupted";
  direction: "forward" | "reverse"; // direction of the run when it settled
  value: number; // final value (JS driver) or progress 0..1 (WAAPI)
}

interface MotionControl {
  readonly state: MotionState;
  readonly finished: Promise<MotionResult>; // promise of the current run
  play(): void;
  pause(): void;
  reverse(): void;
  finish(): void;
  cancel(): void;
}
interface TweenControl extends MotionControl {
  seek(progress: number): void;
} // tweens and WAAPI
```

### Settlement

| Outcome                                                                                                              | `finished`                           | state         |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------- |
| Reached the end of the current direction, or `finish()`                                                              | resolves `{ status: "completed" }`   | `completed`   |
| `cancel()` by the caller                                                                                             | resolves `{ status: "cancelled" }`   | `cancelled`   |
| Superseded by another animation of the same target, channel lost to a higher-priority claim, owning effect destroyed | resolves `{ status: "interrupted" }` | `interrupted` |
| Unexpected error (a subscriber or driver throws, invalid keyframes rejected by the browser)                          | **rejects** with the error           | `failed`      |

Normal outcomes never reject, so fire-and-forget usage produces no unhandled rejection; real errors
always reject (and are never swallowed). Each run has its own promise; it settles exactly once.

### Methods

| Method      | From                                    | Effect                                                                                      |
| ----------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `play()`    | `idle`, `paused`                        | runs in the current direction                                                               |
|             | `completed`, `cancelled`, `interrupted` | starts a **new run** from the start of the current direction (new `finished`)               |
|             | `running`, `failed`                     | no-op                                                                                       |
| `pause()`   | `running`                               | `paused` (value/progress kept); otherwise no-op                                             |
| `reverse()` | `running`, `paused`                     | flips direction, keeps state; the run completes at the other end (`direction: "reverse"`)   |
|             | `idle`, settled                         | flips direction and starts a new run                                                        |
| `seek(p)`   | any (tweens/WAAPI)                      | sets progress `p ∈ [0, 1]` (clamped); from a settled state it becomes `paused` in a new run |
| `finish()`  | `idle`, `running`, `paused`             | jumps to the end of the current direction, settles `completed`; otherwise no-op             |
| `cancel()`  | `idle`, `running`, `paused`             | stops where it is, settles `cancelled`; otherwise no-op                                     |

Springs have no `seek` (a spring has no fixed duration); `reverse()` retargets to the origin keeping
velocity; completion = at rest on the current target.

## §2 Transitions

```ts
type Transition =
  | { type: "spring"; spring?: SpringOptions | SpringPreset }
  | {
      type: "tween";
      duration?: number | DurationPreset;
      easing?: Easing | EasingPreset;
      delay?: number;
    };
```

## §3 Motion values (JS driver)

```ts
motionValue(initial: number): MotionValue;            // get, set, getVelocity, subscribe
animateValue(value, target, transition?, options?: { reducedMotion?: ReducedMotion }): MotionControl | TweenControl;
bindChannel(value, element, binding, options: { effectId; priority? }): () => void;
// binding: { channel: "opacity" } | { channel: "transform"; layer(v): TransformLayer } | { channel: ExclusiveChannel; format(v): string }
```

A new `animateValue` on a value interrupts the previous control (`interrupted`) and starts from the
current value (springs keep velocity). Subscribers run in the update phase; channel writes in the
write phase through the style ledger.

## §4 WAAPI driver

```ts
animateElement(element, channel: ExclusiveChannel, keyframes: string[], transition, options: { effectId; priority?; conflicts? }): TweenControl;
```

- Limited to **exclusive** channels in 009: a WAAPI animation on `transform` or `opacity` would override
  the composed inline value of other effects (documented limit; those channels use motion values).
- Claims the channel through the host (arbitration and conflict policy apply; losing a claim settles
  `interrupted`).
- On completion the final keyframe is committed through the style ledger and the browser animation is
  cancelled (no fill-forever); on cancel/interrupt the channel is released and the captured value
  restored.
- Spring transitions are converted with `springEasing()`.

## §5 Reduced motion

Option `reducedMotion: ReducedMotion` (`"user"` default, `"always"`, `"never"`). When motion must be
reduced, the control jumps to the final value of the run and settles `completed` without frames (the
state change stays visible; contracts/accessibility.md §1). `"never"` runs normally. A preference
change while running finishes the run immediately.
