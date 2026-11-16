# Contract — motion controllers, motion values and drivers (proposed, Phase 009)

**Status: proposed, not implemented.** Decision: [ADR 0023](../../../docs/decisions/0023-motion-controllers-and-drivers.md).
Exported from `@neshel-ui/animations/core`.

## §1 MotionControl (all drivers)

```ts
interface MotionControl {
  readonly state: "idle" | "running" | "paused" | "finished" | "cancelled";
  readonly finished: Promise<"finished" | "cancelled">; // never rejects
  play(): void; // from idle or paused
  pause(): void; // running → paused (no-op otherwise)
  reverse(): void; // tween: plays back to the origin; spring: retargets to the origin
  finish(): void; // jump to the end state, resolve "finished"
  cancel(): void; // stop where it is, resolve "cancelled"
  seek?(progress: number): void; // tweens and keyframe animations, progress in [0, 1]
}
```

State machine: `idle → running ⇄ paused → finished | cancelled`; terminal states ignore further calls
(except `reverse` from `finished`, which starts a new run). Starting a new animation on the same
target cancels the previous one and starts from the current value (and velocity, for springs).

## §2 Transitions

```ts
type Transition =
  | { type: "spring"; spring?: SpringOptions | SpringPreset; velocity?: number }
  | {
      type: "tween";
      duration?: number | DurationPreset;
      easing?: Easing | EasingPreset;
      delay?: number;
    };
```

Presets come from `motionDefaults` ([motion-defaults.md](motion-defaults.md)).

## §3 Motion values (JS driver)

```ts
interface MotionValue {
  get(): number; set(value: number): void; getVelocity(): number;
  subscribe(listener: (value: number) => void): () => void;
}
motionValue(initial: number): MotionValue;
animateValue(value: MotionValue, target: number, transition?: Transition): MotionControl;
bindChannel(value: MotionValue, element: Element, channel: "opacity" | `--neshel-${string}`, effectId: EffectId): () => void;
```

Listeners run in the scheduler's update phase; channel writes in the write phase. No React state.

## §4 WAAPI driver

```ts
animateElement(element, channel: ChannelClaim["channel"], keyframes: Keyframe[] | PropertyIndexedKeyframes,
  transition: Transition, options: { effectId: EffectId; priority?: number }): MotionControl;
```

- Claims the channel through the element's host (arbitration and conflict policy apply).
- Spring transitions are converted with `springEasing()`; tweens map duration/easing/delay directly.
- Reduced motion follows the definition's or call's `reducedMotion` behaviour: `instant` jumps to the
  last keyframe, `fade` replaces keyframes with an opacity fade, `off` does nothing.
- On finish, the final value is committed through the channel handle (no fill-forever animations);
  on cancel, the channel is released.

## §5 Out of scope for 009

CSS-class driver (presets, 010), timelines/sequencing (013), scroll-linked values (011), colour and
unit-string interpolation (015), GPU driver (016).
