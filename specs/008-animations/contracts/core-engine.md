# Contract — core motion engine (`@neshel-ui/animations/core`)

**Status: implemented (experimental) and verified locally** — `test/core.test.mjs`. The subpath is
framework-free, SSR-safe and has no side effects at import time.

## Exports (exact runtime list, FR-020)

`createFrameScheduler`, `getFrameScheduler`, `DEFAULT_SPRING`, `resolveSpring`, `stepSpring`,
`composeTransform`, `getTransformComposer`, `prefersReducedMotion`, `shouldReduceMotion`,
`subscribeReducedMotion`; types `FrameScheduler`, `FrameSchedulerOptions`, `FrameTask`,
`FrameInfo`, `FramePhase`, `SpringOptions`, `SpringState`, `TransformLayer`, `TransformComposer`,
`StyledElement`, `ReducedMotion`.

## §1 Frame scheduler

```ts
type FramePhase = "read" | "update" | "write";
type FrameTask = (frame: { time: number; delta: number }) => unknown; // true = run again
interface FrameScheduler {
  schedule(task: FrameTask, phase?: FramePhase): () => void; // default "update"
  readonly size: number;
}
createFrameScheduler(options?: { maxDelta?: number }): FrameScheduler; // maxDelta default 1/15 s
getFrameScheduler(): FrameScheduler; // page-wide, created lazily
```

- One `requestAnimationFrame` per frame for all tasks; phases run `read → update → write`.
- A task added to a later phase during a frame runs in that frame; to the same or an earlier phase,
  in the next frame.
- `delta` is 0 on the first frame of a burst and clamped to `maxDelta`.
- Cancel functions are idempotent; cancelling the last task cancels the pending frame.
- A throwing task is reported with `reportError` (or `console.error`) and never stops other tasks.
- Without `requestAnimationFrame` (server) `schedule` returns a no-op cancel.

## §2 Springs

```ts
interface SpringOptions { stiffness?: number; damping?: number; mass?: number; restDelta?: number; restSpeed?: number }
DEFAULT_SPRING = { stiffness: 170, damping: 26, mass: 1, restDelta: 0.01, restSpeed: 0.01 };
resolveSpring(options?): Required<SpringOptions>; // RangeError on invalid values (damping may be 0)
stepSpring(state: { value: number; velocity: number }, target: number, options, dtSeconds): boolean; // true = at rest
```

Semi-implicit Euler with sub-steps ≤ 1/240 s; snaps exactly to the target at rest. Retargeting keeps
the current velocity (interruptible motion).

## §3 Composition

`composeTransform(layers)` and `getTransformComposer(element, scheduler?)`: see
[composition.md](composition.md).

## §4 Reduced motion

`prefersReducedMotion()`, `shouldReduceMotion(policy, systemPrefersReduced)`,
`subscribeReducedMotion(listener)`: see [accessibility.md](accessibility.md).

## Planned (not implemented; phase in brackets)

Effect registry with channel metadata, conflict detection, motion controllers, interpolation/easing
helpers and `springEasing()` → CSS `linear()` [009 — Motion Engine]; visibility/intersection observer and scroll-progress source [011]; presence,
FLIP measurer and gesture recogniser [012]; timeline with labels, overlaps and scrub [013]; text
splitter and path utilities [014]; GPU surface manager in a separate entry [016].
