# Contract — Timeline engine (C01)

**Status: implemented and verified locally ([evidence](../evidence.md)); CI pending.** Lives in
`src/cinematic/engine/timeline.ts`, exported by `@neshel-ui/animations/cinematic`; framework-free (no
React, no DOM access at import time, SSR-safe: creating a timeline on the server renders nothing and
schedules nothing). ADR 0028 §2.

## 1. Model

A timeline is a **pure function of time** (research R5). One clock — a single `update`-phase task of
the 009 frame scheduler, present only while the timeline is running — advances `time` by the clamped
frame delta × `timeScale`. Every frame (and every `seek`) the timeline renders each track at its local
progress `clamp((time − start) / duration, 0, 1)`. Tracks render through motion values and the element's
Motion Host (transform layers compose, opacity multiplies, exclusive channels are arbitrated); the
timeline never writes `element.style` itself and owns no frame loop.

Reused, not copied: `getFrameScheduler`, `createRunCore` (run state and the `finished` promise of ADR
0023), `resolveEasing`, `motionValue`, `getMotionHost`/arbiter, `shouldReduceMotion`/
`subscribeReducedMotion`, `watchVisibility`/`pageHidden`, `reportError`, `validator`.

## 2. API

```ts
createTimeline(options?: TimelineOptions): Timeline

interface TimelineOptions {
  repeat?: number;            // extra iterations: 0 (default) … 1000, or Infinity (explicit only)
  yoyo?: boolean;             // alternate direction on each repeat (default false)
  timeScale?: number;         // 0.1 … 10 (default 1)
  reducedMotion?: ReducedMotion;     // "user" (default) | "always" | "never"
  whenHidden?: "pause" | "finish";   // page hidden while running (default "pause")
  conflicts?: ConflictPolicy;        // exclusive channels of pose tracks
  onStart?(): void;                  // once per run, on its first frame
  onUpdate?(time: number, progress: number): void; // after each render (frame or seek)
  onRepeat?(iteration: number): void;
  onComplete?(result: MotionResult): void;          // once per completed run, never twice
}

interface Timeline extends TweenControl {          // state, finished, play, pause, reverse, finish, cancel, seek
  readonly duration: number;      // one iteration, ms (max track end)
  readonly time: number;          // ms within the current iteration
  readonly progress: number;      // time / duration (0 when empty)
  readonly iteration: number;
  readonly direction: MotionDirection;
  readonly labels: ReadonlyMap<string, number>;
  timeScale: number;
  add(track: TrackInput, at?: Position): this;
  label(name: string, at?: Position): this;
  call(fn: CallFn, at?: Position, options?: { wait?: boolean; reverse?: CallFn }): this;
  seekTo(at: number | string, options?: { fire?: boolean }): void;
  retarget(trackId: string, to: Partial<Pose> | number): void;
  getTrack(id: string): TrackInfo | undefined;
  destroy(): void;               // idempotent: cancel, release every track (styles restored), drop listeners
}
```

### Positions

`number` (absolute ms) · `"label"`, `"label+=ms"`, `"label-=ms"` · `"<"` start of the previously added
track · `">"` its end (default) · `"<+=ms"`, `">-=ms"` · `"+=ms"` / `"-=ms"` relative to the current end
of the timeline (gap / overlap). Positions resolve when the track is added; an unknown label or a
malformed position throws `NeshelAnimationsError`; negative results clamp to 0.

### Tracks

| Kind     | Input                                                                       | Renders                                                                                                                                                    |
| -------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pose     | `{ id?, target, to, from?, duration?, easing?, fill?, priority? }`          | `Pose` `{ x, y, scale, rotate, opacity, blur }` → one transform layer + one opacity contribution + `filter` (exclusive)                                    |
| value    | `{ id?, value: MotionValue, from, to, duration?, easing?, fill? }`          | the motion value (the caller renders it, e.g. `bindChannel`)                                                                                               |
| effect   | `{ id?, target, effect: definition or preset, options?, duration?, fill? }` | an Entrance definition **triggered** through its own contract (§3): plays in when the playhead crosses the start, out when it crosses back; not scrubbable |
| timeline | `{ id?, timeline: Timeline }`                                               | a nested timeline rendered at the parent's local time (its own clock disabled; finite repeat only)                                                         |
| call     | `call(fn, at, { wait, reverse })`                                           | `fn("forward")` when the playhead crosses `at` forward (`(prev, next]`), `reverse("reverse")` backward (`[next, prev)`)                                    |

`duration` defaults to 400 ms (pose/value) or the definition's span (effect); `easing` to `"standard"`
(pose/value) or the definition's easing. `fill: "both"` (default) renders the from-state before the
track starts; `"forwards"` writes nothing before the start.

## 3. Triggered definitions (no change to Entrance)

Effect tracks coordinate existing Entrance definitions (E01–E09, E11) as values through their public
contract — Phase 011 `hold`/`playback`, Phase 012 `continuous`, `replay` — the same mechanism the scroll
triggers use (ADR 0026 §7). The definition keeps its own clock, poses and reduced-motion behaviour; nothing is
copied. The track's span is the definition's own `delay + duration` (E11: the spring's settle time). Playing
across the start plays the entrance in; crossing back plays it out (continuing from where it is); pausing the
timeline pauses the run. A seek (no `fire`) or `finish()` shows the state at that time without animation:
the held start pose before the start (`fill: "both"`), the visible end state after it. A definition without
that contract is rejected (`NeshelAnimationsError`).

Measured alternative, **not adopted** (bundle budget): a scrubbable `progress` option on Entrance cost +123 B
gzip on `entrance: fadeIn definition` (6605 → 6728 B) against an approved budget of 6656 B. It is proposed to
the owner in evidence.md §8; without approval, scrubbable motion uses pose and value tracks.

## 4. Control semantics

| Call                 | From                  | Result                                                                                                     |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `play()`             | idle / paused         | runs from the current time in the current direction                                                        |
| `play()`             | completed / cancelled | new run from the start of the current direction (`finished` is a new promise)                              |
| `pause()`            | running               | stops the clock (task removed); state kept                                                                 |
| `reverse()`          | any                   | flips the direction; running continues backwards from the current time; settled → new reverse run          |
| `seek(p)` / `seekTo` | any                   | renders at the new time; running keeps running; settled → paused in a new run; calls fire only with `fire` |
| `finish()`           | not settled           | renders the end of the last iteration (current direction), fires remaining calls in order, `completed`     |
| `cancel()`           | not settled           | `cancelled`; rendered state kept until `destroy()`                                                         |
| `destroy()`          | any                   | `cancel()`, release every track (exact restoration), remove listeners; later calls are no-ops              |

`finished` resolves `{ status, direction, value: progress }` for `completed | cancelled | interrupted`
and rejects only when an awaited call rejects (state `failed`).

## 5. Determinism and safety rules

1. One clock task per running timeline; none when paused, settled, hidden or destroyed (FR-004).
2. Same-time tracks render in start order, ties in insertion order; calls at the same time fire in
   insertion order forward and reverse order backward.
3. A frame first renders tracks up to each crossed call, fires it, and stops if the callback changed the
   timeline (pause, seek, reverse, cancel, finish, destroy): the mutation wins and nothing renders past
   it. `onComplete` and the `finished` settlement happen at most once per run.
4. `wait: true` calls returning a thenable freeze the clock at the call time until it settles; a
   rejection fails the timeline (`finished` rejects, tasks released); a settlement after cancel, seek or
   destroy is ignored.
5. A track whose target is disconnected when it would render releases its contributions (styles
   restored) and becomes `detached` (`getTrack(id).detached`); other tracks continue.
6. Reduced motion (policy `"user"` follows the media query live): `play()` finishes immediately; turning
   it on while running calls `finish()`; turning it off changes nothing already finished.
7. Hidden page: `"pause"` stops the clock while `document.hidden` and resumes on visibility; `"finish"`
   finishes. Clamped deltas mean a hidden tab never jumps on return.
8. Callback errors (`onUpdate`, non-awaited calls) are reported with `reportError` and never stop other
   timelines or the scheduler.
9. `retarget(id, to)` re-anchors a pose/value track at its current local progress: the remaining span
   interpolates from the current value to the new target; seeking before the anchor shows the original
   curve (deterministic).

## 6. React (first declarative integration)

`useTimeline(build, deps?, options?)` (`"use client"`): creates the timeline in a layout effect, calls
`build(timeline)` with the current refs, destroys it on cleanup or when `deps` change (StrictMode safe),
and returns a stable `TimelineHandle` that forwards controls to the live timeline — no React state per
frame. On the server it returns an inert handle.
