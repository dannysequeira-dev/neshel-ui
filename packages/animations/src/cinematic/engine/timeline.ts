/**
 * C01 — Timeline engine (Phase 013; contracts/timeline-engine.md, ADR 0028 §2).
 *
 * A timeline is a pure function of time. While it runs, ONE `update`-phase task of the shared 009 frame
 * scheduler advances its clock by the clamped frame delta; every frame (and every seek) each track is
 * rendered at its local progress through motion values and Motion Hosts. The timeline owns no frame loop
 * and never writes `element.style`; run state and the `finished` promise are the 009 run core (ADR 0023).
 *
 * Determinism: tracks render in start order (ties: insertion order); calls fire in crossing order; a
 * callback that changes the timeline stops the current frame (the mutation wins); completion settles at
 * most once per run. Safe on the server: nothing is scheduled or rendered without `requestAnimationFrame`.
 */
import type { ConflictPolicy } from "../../core/arbiter.js";
import { createRunCore, type MotionDirection, type MotionResult } from "../../core/controls.js";
import { reportError } from "../../core/dev.js";
import type { Easing, EasingPreset } from "../../core/easing.js";
import { attachEffect, type EffectDefinition, type EffectHandle } from "../../core/effect.js";
import { animationsError } from "../../core/errors.js";
import { clamp, mix } from "../../core/interpolate.js";
import { type MotionValue, motionValue } from "../../core/motion-value.js";
import { isEffectPreset, type PresetInput } from "../../core/preset.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../../core/reduced-motion.js";
import { type FrameInfo, getFrameScheduler } from "../../core/scheduler.js";
import { validator } from "../../core/validate.js";
import { counters } from "./debug.js";
import {
  createPoseWriter,
  identityOf,
  mixPose,
  POSE_KEYS,
  type Pose,
  type PoseKey,
  type PoseWriter,
  type Styled,
} from "./pose.js";

export type { Pose } from "./pose.js";

/** Absolute ms, a label (`"intro"`, `"intro+=200"`), `"<"`/`">"` (± ms) or `"+=ms"`/`"-=ms"`. */
export type TimelinePosition = number | string;
export type CallDirection = "forward" | "reverse";
export type CallFn = (direction: CallDirection) => unknown;
export type TrackFill = "both" | "forwards";

interface TrackTiming {
  /** Stable id for `getTrack`/`retarget`. */
  id?: string;
  /** ms (0–60000). */
  duration?: number;
  easing?: Easing | EasingPreset;
  /** `"both"` (default) renders the from-state before the start; `"forwards"` writes nothing before it. */
  fill?: TrackFill;
}

export interface PoseTrackInput extends TrackTiming {
  target: Styled;
  to: Pose;
  from?: Pose;
  /** Priority of the `filter` claim when the pose blurs (default 0). */
  priority?: number;
}

export interface ValueTrackInput extends TrackTiming {
  value: MotionValue;
  from: number;
  to: number;
}

export interface EffectTrackInput extends TrackTiming {
  target: Styled;
  /** A drivable definition (Entrance E01–E09/E11) or a preset of one. */
  // biome-ignore lint/suspicious/noExplicitAny: definitions of any option types.
  effect: PresetInput<any, any>;
  options?: object;
}

export interface TimelineTrackInput {
  id?: string;
  timeline: Timeline;
}

export type TrackInput = PoseTrackInput | ValueTrackInput | EffectTrackInput | TimelineTrackInput;

export interface TrackInfo {
  readonly id: string | undefined;
  readonly kind: "pose" | "value" | "effect" | "timeline";
  readonly start: number;
  readonly duration: number;
  /** Last rendered local progress (`NaN` before the first render). */
  readonly progress: number;
  readonly detached: boolean;
}

export interface TimelineOptions {
  /** Extra iterations: 0 (default) … 1000, or `Infinity` (explicit only). */
  repeat?: number;
  /** Alternate the direction of every repeat (default false). */
  yoyo?: boolean;
  /** 0.1–10 (default 1). */
  timeScale?: number;
  reducedMotion?: ReducedMotion;
  /** While the page is hidden: stop the clock (default) or finish. */
  whenHidden?: "pause" | "finish";
  /** Conflict reporting of exclusive channels (pose blur, effect tracks). */
  conflicts?: ConflictPolicy;
  onStart?(): void;
  onUpdate?(time: number, progress: number): void;
  onRepeat?(iteration: number): void;
  /** Once per completed run. */
  onComplete?(result: MotionResult): void;
}

export interface Timeline {
  readonly state: MotionResult["status"] | "idle" | "running" | "paused" | "failed";
  readonly finished: Promise<MotionResult>;
  /** One iteration in ms. */
  readonly duration: number;
  readonly time: number;
  readonly progress: number;
  readonly iteration: number;
  readonly direction: MotionDirection;
  readonly labels: ReadonlyMap<string, number>;
  timeScale: number;
  add(track: TrackInput, at?: TimelinePosition): this;
  label(name: string, at?: TimelinePosition): this;
  call(fn: CallFn, at?: TimelinePosition, options?: { wait?: boolean; reverse?: CallFn }): this;
  play(): void;
  pause(): void;
  reverse(): void;
  finish(): void;
  cancel(): void;
  /** Progress 0–1 of the current iteration. */
  seek(progress: number): void;
  seekTo(at: number | string, options?: { fire?: boolean }): void;
  retarget(trackId: string, to: Partial<Pose> | number): void;
  getTrack(id: string): TrackInfo | undefined;
  /** Idempotent: cancel, release every track (styles restored), drop listeners. */
  destroy(): void;
}

interface Segment<V> {
  p0: number;
  from: V;
  to: V;
}

interface Track {
  id: string | undefined;
  kind: TrackInfo["kind"];
  start: number;
  order: number;
  fill: TrackFill;
  last: number;
  detached: boolean;
  target: Styled | undefined;
  duration(): number;
  render(local: number, time: number, fire: boolean): void;
  release(): void;
  retarget?(to: Partial<Pose> | number): void;
}

interface CallEntry {
  time: number;
  order: number;
  fn: CallFn;
  reverse: CallFn | undefined;
  wait: boolean;
}

interface Internal {
  nested: boolean;
  totalDuration(): number;
  drive(total: number, fire: boolean): void;
  releaseAll(): void;
}

// biome-ignore lint/suspicious/noExplicitAny: definitions of any option types.
type AnyDefinition = EffectDefinition<any, any>;

const internals = new WeakMap<Timeline, Internal>();
const v = /* @__PURE__ */ validator("createTimeline");

const POSITION = /^(?:(<|>)|([a-zA-Z_][\w:-]*))?(?:([+-])=(\d+(?:\.\d+)?))?$/;

const hasFrames = () =>
  typeof (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame === "function";

function safe(fn: (() => void) | undefined): void {
  if (!fn) return;
  try {
    fn();
  } catch (error) {
    reportError(error);
  }
}

function resolveEase(easing: Easing | EasingPreset | undefined, fallback: Easing): Easing {
  if (easing === undefined) return fallback;
  return v.easing(easing);
}

function trackDuration(name: string, value: unknown, fallback: number): number {
  return v.number(name, value, fallback, 0, 60_000);
}

export function createTimeline(options: TimelineOptions = {}): Timeline {
  const o = v.options(options);
  const repeat =
    o.repeat === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : v.number("repeat", o.repeat, 0, 0, 1000);
  if (!Number.isInteger(repeat) && Number.isFinite(repeat)) v.fail(`"repeat" must be an integer.`);
  const yoyo = v.flag("yoyo", o.yoyo, false);
  let timeScale = v.number("timeScale", o.timeScale, 1, 0.1, 10);
  const policy = v.reducedMotion(o.reducedMotion);
  const whenHidden = v.oneOf("whenHidden", o.whenHidden, ["pause", "finish"] as const, "pause");
  const onStart = v.callback<() => void>("onStart", o.onStart);
  const onUpdate = v.callback<(time: number, progress: number) => void>("onUpdate", o.onUpdate);
  const onRepeat = v.callback<(iteration: number) => void>("onRepeat", o.onRepeat);
  const onComplete = v.callback<(result: MotionResult) => void>("onComplete", o.onComplete);
  const standard = v.easing(undefined);
  const scheduler = getFrameScheduler();
  const core = createRunCore();

  const tracks: Track[] = [];
  const calls: CallEntry[] = [];
  const labels = new Map<string, number>();
  let order = 0;
  let previous: { start: number; end: number } | undefined;
  let total = 0; // time across iterations
  let time = 0; // time within the iteration (rendered)
  let generation = 0;
  let waitToken = 0;
  let waiting = false;
  let started = false;
  let edge = true; // a fresh run: calls exactly at the start edge fire
  let destroyed = false;
  let nested = false;
  let cancelTask: (() => void) | undefined;
  let unsubscribeReduced: (() => void) | undefined;
  let visibilityListener: (() => void) | undefined;
  let hiddenPaused = false;

  const duration = () => {
    let end = 0;
    for (const track of tracks) end = Math.max(end, track.start + track.duration());
    for (const call of calls) end = Math.max(end, call.time);
    return end;
  };
  const totalDuration = () => duration() * (repeat + 1);
  const settled = () => ["completed", "cancelled", "interrupted", "failed"].includes(core.state);

  // --- positions ---------------------------------------------------------------------------------

  function resolvePosition(at: TimelinePosition | undefined): number {
    if (at === undefined) return previous ? previous.end : duration();
    if (typeof at === "number") {
      if (!Number.isFinite(at)) v.fail(`invalid position ${String(at)}.`);
      return Math.max(0, at);
    }
    if (typeof at !== "string") return v.fail(`invalid position ${String(at)}.`);
    const match = POSITION.exec(at.trim());
    if (!match || at.trim() === "") return v.fail(`invalid position ${JSON.stringify(at)}.`);
    const [, anchor, label, sign, amount] = match;
    let base: number;
    if (anchor === "<") base = previous ? previous.start : 0;
    else if (anchor === ">") base = previous ? previous.end : 0;
    else if (label !== undefined) {
      const found = labels.get(label);
      if (found === undefined) return v.fail(`unknown label ${JSON.stringify(label)}.`);
      base = found;
    } else base = duration();
    const offset = sign ? (sign === "+" ? 1 : -1) * Number(amount) : 0;
    return Math.max(0, base + offset);
  }

  // --- tracks ------------------------------------------------------------------------------------

  function guardTarget(target: unknown, kind: string): Styled {
    const element = target as Styled | null | undefined;
    if (!element || typeof element !== "object" || !element.style) {
      v.fail(`${kind} track: "target" must be an element.`);
    }
    return element as Styled;
  }

  function detachIfGone(track: Track): boolean {
    if (track.detached) return true;
    if (track.target && track.target.isConnected === false) {
      track.release();
      track.detached = true;
      counters.detached++;
      return true;
    }
    return false;
  }

  function poseTrack(input: PoseTrackInput, start: number): Track {
    const target = guardTarget(input.target, "pose");
    const to = v.options(input.to) as Pose;
    const from = (v.options(input.from) ?? {}) as Pose;
    const keys: PoseKey[] = POSE_KEYS.filter((key) => key in to || key in from);
    for (const key of keys) {
      for (const pose of [to, from]) {
        const value = pose[key];
        if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
          v.fail(`pose "${key}" must be a finite number.`);
        }
      }
    }
    const ease = resolveEase(input.easing, standard);
    const length = trackDuration("duration", input.duration, 400);
    const segments: Segment<Pose>[] = [{ p0: 0, from, to }];
    let writer: PoseWriter | undefined;
    const valueAt = (p: number): Pose => {
      let segment = segments[0] as Segment<Pose>;
      for (const candidate of segments) if (candidate.p0 <= p) segment = candidate;
      const e0 = segment.p0 === 0 ? 0 : ease(segment.p0);
      const f = e0 >= 1 ? 1 : (ease(p) - e0) / (1 - e0);
      return mixPose(segment.from, segment.to, f, keys);
    };
    const track: Track = {
      id: input.id,
      kind: "pose",
      start,
      order: order++,
      fill: input.fill ?? "both",
      last: Number.NaN,
      detached: false,
      target,
      duration: () => length,
      render(local) {
        if (detachIfGone(track)) return;
        writer ??= createPoseWriter(target, {
          id: `cinematic/timeline${input.id ? `:${input.id}` : ""}`,
          priority: input.priority,
          conflicts: o.conflicts,
        });
        writer.set(valueAt(local));
      },
      release() {
        writer?.clear();
        writer = undefined;
      },
      retarget(next) {
        if (typeof next === "number") v.fail("retarget: a pose track needs a pose.");
        const p = Number.isNaN(track.last) ? 0 : track.last;
        const current = valueAt(p);
        const merged: Pose = {
          ...(segments[segments.length - 1] as Segment<Pose>).to,
          ...(next as Partial<Pose>),
        };
        for (const key of Object.keys(next as object) as PoseKey[]) {
          if (!keys.includes(key)) {
            keys.push(key);
            current[key] = identityOf(key);
          }
        }
        if (p === 0) segments.splice(0, segments.length, { p0: 0, from, to: merged });
        else segments.push({ p0: p, from: current, to: merged });
      },
    };
    return track;
  }

  function valueTrack(input: ValueTrackInput, start: number): Track {
    const value = input.value;
    if (!value || typeof value.set !== "function" || typeof value.get !== "function") {
      v.fail(`value track: "value" must be a motion value.`);
    }
    const from = v.number("from", input.from, 0, -1e9, 1e9);
    const to = v.number("to", input.to, 1, -1e9, 1e9);
    const ease = resolveEase(input.easing, standard);
    const length = trackDuration("duration", input.duration, 400);
    const segments: Segment<number>[] = [{ p0: 0, from, to }];
    const valueAt = (p: number) => {
      let segment = segments[0] as Segment<number>;
      for (const candidate of segments) if (candidate.p0 <= p) segment = candidate;
      const e0 = segment.p0 === 0 ? 0 : ease(segment.p0);
      const f = e0 >= 1 ? 1 : (ease(p) - e0) / (1 - e0);
      return mix(segment.from, segment.to, f);
    };
    const track: Track = {
      id: input.id,
      kind: "value",
      start,
      order: order++,
      fill: input.fill ?? "both",
      last: Number.NaN,
      detached: false,
      target: undefined,
      duration: () => length,
      render(local) {
        value.set(valueAt(local));
      },
      release() {},
      retarget(next) {
        if (typeof next !== "number" || !Number.isFinite(next)) {
          v.fail("retarget: a value track needs a finite number.");
        }
        const p = Number.isNaN(track.last) ? 0 : track.last;
        if (p === 0) segments.splice(0, segments.length, { p0: 0, from, to: next as number });
        else segments.push({ p0: p, from: valueAt(p), to: next as number });
      },
    };
    return track;
  }

  function effectTrack(input: EffectTrackInput, start: number): Track {
    const target = guardTarget(input.target, "effect");
    if (!input.effect) v.fail(`effect track: "effect" is required.`);
    const definition = (
      isEffectPreset(input.effect) ? input.effect.effect : input.effect
    ) as AnyDefinition;
    if (!definition || typeof definition.setup !== "function") {
      v.fail(`effect track: "effect" must be an effect definition or a preset.`);
    }
    if (!definition.drivable) {
      v.fail(
        `effect track: "${definition.id}" is not drivable by a timeline (Entrance definitions are).`,
      );
    }
    const base = isEffectPreset(input.effect) ? (input.effect.options as object) : undefined;
    const progress = motionValue(0);
    const merged = { ...base, ...(input.options as object | undefined), progress };
    const span = definition.drivable?.span(definition.resolve(merged)) ?? {
      duration: 400,
      delay: 0,
      easing: standard,
    };
    const explicit = input.duration !== undefined;
    const length = explicit
      ? trackDuration("duration", input.duration, 400)
      : span.delay + span.duration;
    const delay = explicit ? 0 : span.delay;
    const ease = resolveEase(input.easing, span.easing);
    let handle: EffectHandle<unknown> | undefined;
    const track: Track = {
      id: input.id,
      kind: "effect",
      start,
      order: order++,
      fill: input.fill ?? "both",
      last: Number.NaN,
      detached: false,
      target,
      duration: () => length,
      render(local) {
        if (detachIfGone(track)) return;
        const elapsed = local * length;
        const p = length === 0 ? local : clamp((elapsed - delay) / (length - delay || 1), 0, 1);
        progress.set(ease(p));
        handle ??= attachEffect(target, definition, merged, { conflicts: o.conflicts });
      },
      release() {
        handle?.destroy();
        handle = undefined;
      },
    };
    return track;
  }

  function nestedTrack(input: TimelineTrackInput, start: number): Track {
    const child = input.timeline;
    const inner = child ? internals.get(child) : undefined;
    if (!inner) v.fail(`timeline track: "timeline" must be a timeline.`);
    const childInternal = inner as Internal;
    if (childInternal.nested) v.fail("timeline track: this timeline is already nested.");
    if (!Number.isFinite(childInternal.totalDuration())) {
      v.fail("timeline track: a nested timeline cannot repeat infinitely.");
    }
    childInternal.nested = true;
    const track: Track = {
      id: input.id,
      kind: "timeline",
      start,
      order: order++,
      fill: "both",
      last: Number.NaN,
      detached: false,
      target: undefined,
      duration: () => childInternal.totalDuration(),
      render(local, _time, fire) {
        childInternal.drive(local * childInternal.totalDuration(), fire);
      },
      release() {
        childInternal.releaseAll();
      },
    };
    return track;
  }

  function insert(track: Track): void {
    tracks.push(track);
    tracks.sort((a, b) => a.start - b.start || a.order - b.order);
    previous = { start: track.start, end: track.start + track.duration() };
  }

  // --- rendering ---------------------------------------------------------------------------------

  function renderTracks(t: number, fire: boolean): void {
    for (const track of tracks) {
      if (track.detached) continue;
      const length = track.duration();
      if (track.fill === "forwards" && t < track.start) {
        if (!Number.isNaN(track.last)) {
          track.release();
          track.last = Number.NaN;
        }
        continue;
      }
      const local =
        length === 0 ? (t >= track.start ? 1 : 0) : clamp((t - track.start) / length, 0, 1);
      if (local === track.last && track.kind !== "timeline") continue;
      track.last = local;
      try {
        track.render(local, t, fire);
        counters.renders++;
      } catch (error) {
        reportError(error);
      }
    }
    time = t;
  }

  /** Move the local time from `a` to `b` within one iteration, firing crossed calls. */
  function sweep(iteration: number, a: number, b: number, fire: boolean, gen: number): boolean {
    if (fire && calls.length > 0) {
      const forward = b >= a;
      const from =
        edge && forward && a === 0 ? -1 : edge && !forward && a === duration() ? a + 1 : a;
      const crossed = calls
        .filter((call) =>
          forward ? from < call.time && call.time <= b : b <= call.time && call.time < from,
        )
        .sort((x, y) =>
          forward ? x.time - y.time || x.order - y.order : y.time - x.time || y.order - x.order,
        );
      edge = false;
      for (const call of crossed) {
        renderTracks(call.time, fire);
        // The playhead is AT the call: a callback that pauses or waits resumes from here (never re-fires).
        total = toTotal(iteration, call.time);
        const fn = forward ? call.fn : call.reverse;
        if (!fn) continue;
        let result: unknown;
        try {
          result = fn(forward ? "forward" : "reverse");
        } catch (error) {
          reportError(error);
        }
        if (gen !== generation || destroyed) return false;
        if (call.wait && result && typeof (result as PromiseLike<unknown>).then === "function") {
          startWait(result as PromiseLike<unknown>);
          return false;
        }
      }
    }
    edge = false;
    renderTracks(b, fire);
    return true;
  }

  function iterationOf(at: number, forward: boolean): number {
    const length = duration();
    if (length === 0) return 0;
    const raw = forward ? Math.floor(at / length) : Math.ceil(at / length) - 1;
    return clamp(raw, 0, Number.isFinite(repeat) ? repeat : raw);
  }

  function toTotal(iteration: number, local: number): number {
    const length = duration();
    return iteration * length + (yoyo && iteration % 2 === 1 ? length - local : local);
  }

  function localOf(iteration: number, at: number): number {
    const length = duration();
    const t = clamp(at - iteration * length, 0, length);
    return yoyo && iteration % 2 === 1 ? length - t : t;
  }

  /** Advance the total time to `target`; `false` when a callback interrupted the frame. */
  function advance(target: number, fire: boolean): boolean {
    const gen = generation;
    const length = duration();
    if (length === 0) {
      total = 0;
      return sweep(0, 0, 0, fire, gen);
    }
    if (target === total) {
      const iteration = iterationOf(total, true);
      const local = localOf(iteration, total);
      return sweep(iteration, local, local, fire, gen);
    }
    const forward = target > total;
    while (total !== target) {
      const iteration = iterationOf(total, forward);
      const boundary = forward
        ? Math.min(target, (iteration + 1) * length)
        : Math.max(target, iteration * length);
      const ok = sweep(
        iteration,
        localOf(iteration, total),
        localOf(iteration, boundary),
        fire,
        gen,
      );
      if (!ok) return false;
      total = boundary;
      const crossedEdge = forward
        ? boundary === (iteration + 1) * length && boundary < totalDuration()
        : boundary === iteration * length && boundary > 0;
      if (crossedEdge) {
        const next = forward ? iteration + 1 : iteration - 1;
        edge = true;
        if (fire && onRepeat) safe(() => onRepeat(next));
        if (gen !== generation || destroyed) return false;
      }
    }
    return true;
  }

  function emitUpdate(): void {
    if (onUpdate) safe(() => onUpdate(time, progressValue()));
  }

  const progressValue = () => {
    const length = duration();
    return length === 0 ? (total > 0 || core.state === "completed" ? 1 : 0) : time / length;
  };

  // --- clock ---------------------------------------------------------------------------------------

  function stopClock(): void {
    cancelTask?.();
    cancelTask = undefined;
    counters.clocks = Math.max(0, counters.clocks - (clockCounted ? 1 : 0));
    clockCounted = false;
  }
  let clockCounted = false;
  function startClock(): void {
    if (cancelTask || nested || !hasFrames()) return;
    cancelTask = scheduler.schedule(tick, "update");
    if (!clockCounted) {
      counters.clocks++;
      clockCounted = true;
    }
  }

  function atEnd(): boolean {
    return core.direction === "forward" ? total >= totalDuration() : total <= 0;
  }

  function tick({ delta }: FrameInfo): boolean {
    if (core.state !== "running" || waiting || destroyed) {
      cancelTask = undefined;
      if (clockCounted) {
        counters.clocks = Math.max(0, counters.clocks - 1);
        clockCounted = false;
      }
      return false;
    }
    const gen = generation;
    if (!started) {
      started = true;
      safe(onStart);
      if (gen !== generation) return core.state === "running" && !waiting;
    }
    const step = delta * 1000 * timeScale;
    const end = totalDuration();
    const target =
      core.direction === "forward" ? Math.min(end, total + step) : Math.max(0, total - step);
    const ok = advance(target, true);
    if (!ok) return core.state === "running" && !waiting && !destroyed;
    emitUpdate();
    if (gen !== generation) return core.state === "running" && !waiting && !destroyed;
    if (atEnd()) {
      settle("completed");
      cancelTask = undefined;
      return false;
    }
    return true;
  }

  // --- lifecycle -----------------------------------------------------------------------------------

  function listen(): void {
    unsubscribeReduced ??= subscribeReducedMotion((reduced) => {
      if (reduced && shouldReduceMotion(policy, reduced) && core.state === "running")
        control.finish();
    });
    if (!visibilityListener && typeof document !== "undefined") {
      visibilityListener = () => {
        if (document.hidden) {
          if (core.state !== "running") return;
          if (whenHidden === "finish") control.finish();
          else {
            hiddenPaused = true;
            stopClock();
          }
        } else if (hiddenPaused) {
          hiddenPaused = false;
          if (core.state === "running" && !waiting) startClock();
        }
      };
      document.addEventListener("visibilitychange", visibilityListener);
      counters.listeners++;
    }
  }

  function unlisten(): void {
    unsubscribeReduced?.();
    unsubscribeReduced = undefined;
    if (visibilityListener) {
      document.removeEventListener("visibilitychange", visibilityListener);
      visibilityListener = undefined;
      counters.listeners = Math.max(0, counters.listeners - 1);
    }
    hiddenPaused = false;
  }

  function settle(status: MotionResult["status"]): void {
    if (settled()) return;
    stopClock();
    waiting = false;
    waitToken++;
    unlisten();
    core.settle(status, progressValue());
    if (status === "completed" && onComplete) {
      const result: MotionResult = { status, direction: core.direction, value: progressValue() };
      safe(() => onComplete(result));
    }
  }

  function fail(error: unknown): void {
    if (settled()) return;
    stopClock();
    waiting = false;
    unlisten();
    core.fail(error);
  }

  function startWait(promise: PromiseLike<unknown>): void {
    waiting = true;
    stopClock();
    const token = ++waitToken;
    counters.waits++;
    promise.then(
      () => {
        if (token !== waitToken || destroyed) return;
        waiting = false;
        if (core.state === "running") startClock();
      },
      (error: unknown) => {
        if (token !== waitToken || destroyed) return;
        waiting = false;
        fail(error);
      },
    );
  }

  function newRun(): void {
    core.newRun();
    core.state = "idle";
    started = false;
    edge = true;
    total =
      core.direction === "forward" ? 0 : Number.isFinite(totalDuration()) ? totalDuration() : 0;
  }

  function reduced(): boolean {
    return shouldReduceMotion(policy, prefersReducedMotion());
  }

  function mutate(): void {
    generation++;
    waitToken++;
    if (waiting) {
      waiting = false;
    }
  }

  function guardAlive(name: string): boolean {
    if (destroyed) return false;
    if (nested && name === "play") {
      reportError(animationsError("createTimeline", "a nested timeline is driven by its parent."));
      return false;
    }
    return true;
  }

  const control: Timeline = {
    get state() {
      return core.state as Timeline["state"];
    },
    get finished() {
      return core.finished;
    },
    get duration() {
      return duration();
    },
    get time() {
      return time;
    },
    get progress() {
      return progressValue();
    },
    get iteration() {
      return iterationOf(total, core.direction === "forward");
    },
    get direction() {
      return core.direction;
    },
    get labels() {
      return labels;
    },
    get timeScale() {
      return timeScale;
    },
    set timeScale(value) {
      timeScale = v.number("timeScale", value, 1, 0.1, 10);
    },
    add(input, at) {
      if (destroyed) return control;
      const track = input as Partial<TimelineTrackInput & EffectTrackInput & ValueTrackInput>;
      const start = resolvePosition(at);
      if (track.timeline) insert(nestedTrack(input as TimelineTrackInput, start));
      else if (track.effect) insert(effectTrack(input as EffectTrackInput, start));
      else if (track.value) insert(valueTrack(input as ValueTrackInput, start));
      else if ((input as PoseTrackInput).to) insert(poseTrack(input as PoseTrackInput, start));
      else v.fail("add: unknown track (expected target+to, value, effect or timeline).");
      return control;
    },
    label(name, at) {
      if (typeof name !== "string" || !/^[a-zA-Z_][\w:-]*$/.test(name)) {
        v.fail(`invalid label ${JSON.stringify(name)}.`);
      }
      labels.set(name, at === undefined ? duration() : resolvePosition(at));
      return control;
    },
    call(fn, at, callOptions = {}) {
      if (typeof fn !== "function") v.fail(`call: "fn" must be a function.`);
      const when = at === undefined ? duration() : resolvePosition(at);
      calls.push({
        time: when,
        order: order++,
        fn,
        reverse: v.callback("reverse", callOptions.reverse),
        wait: v.flag("wait", callOptions.wait, false),
      });
      previous = { start: when, end: when };
      return control;
    },
    play() {
      if (!guardAlive("play") || core.state === "running" || core.state === "failed") return;
      if (!hasFrames()) return; // server: nothing to render
      if (settled()) newRun();
      mutate();
      core.state = "running";
      listen();
      if (reduced()) {
        control.finish();
        return;
      }
      if (atEnd() && duration() > 0) {
        // Playing from the end of the current direction completes at once.
        settle("completed");
        return;
      }
      startClock();
    },
    pause() {
      if (destroyed || core.state !== "running") return;
      mutate();
      core.state = "paused";
      stopClock();
    },
    reverse() {
      if (destroyed || core.state === "failed") return;
      mutate();
      core.direction = core.direction === "forward" ? "reverse" : "forward";
      if (core.state === "running") return;
      if (core.state === "paused") return;
      if (settled()) {
        const at = total;
        core.newRun();
        core.state = "idle";
        started = false;
        edge = false;
        total = at;
      }
      control.play();
    },
    finish() {
      if (destroyed || settled()) return;
      mutate();
      const gen = generation;
      const end =
        core.direction === "forward"
          ? Number.isFinite(totalDuration())
            ? totalDuration()
            : (iterationOf(total, true) + 1) * duration()
          : 0;
      if (core.state === "idle") core.state = "running";
      const ok = advance(end, true);
      if (!ok || gen !== generation) return;
      emitUpdate();
      if (gen !== generation) return;
      settle("completed");
    },
    cancel() {
      if (destroyed || settled()) return;
      mutate();
      settle("cancelled");
    },
    seek(progress) {
      const length = duration();
      const p = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
      const iteration = iterationOf(total, core.direction === "forward");
      control.seekTo(iteration * length + p * length);
    },
    seekTo(at, seekOptions = {}) {
      if (destroyed || core.state === "failed") return;
      let target: number;
      if (typeof at === "string") {
        const found = labels.get(at);
        if (found === undefined) {
          v.fail(`seekTo: unknown label ${JSON.stringify(at)}.`);
          return;
        }
        target = found;
      } else target = Number.isFinite(at) ? at : 0;
      const end = totalDuration();
      target = clamp(target, 0, Number.isFinite(end) ? end : target);
      if (settled()) {
        const keep = core.direction;
        core.newRun();
        core.direction = keep;
        core.state = "paused";
        started = true;
      }
      mutate();
      edge = false;
      const fire = v.flag("fire", seekOptions.fire, false);
      if (advance(target, fire)) emitUpdate();
    },
    retarget(trackId, to) {
      const track = tracks.find((candidate) => candidate.id === trackId);
      if (!track) {
        v.fail(`retarget: unknown track ${JSON.stringify(trackId)}.`);
        return;
      }
      if (!track.retarget) {
        v.fail(`retarget: ${track.kind} tracks cannot be retargeted.`);
        return;
      }
      track.retarget(to);
      const local = Number.isNaN(track.last) ? undefined : track.last;
      if (local !== undefined && !track.detached) {
        track.render(local, time, false);
      }
    },
    getTrack(id) {
      const track = tracks.find((candidate) => candidate.id === id);
      if (!track) return undefined;
      return {
        id: track.id,
        kind: track.kind,
        start: track.start,
        duration: track.duration(),
        progress: track.last,
        detached: track.detached,
      };
    },
    destroy() {
      if (destroyed) return;
      if (!settled()) {
        mutate();
        settle("cancelled");
      }
      destroyed = true;
      unlisten();
      releaseAll();
      counters.timelines = Math.max(0, counters.timelines - 1);
    },
  };

  function releaseAll(): void {
    for (const track of tracks) {
      try {
        track.release();
      } catch (error) {
        reportError(error);
      }
      track.last = Number.NaN;
    }
  }

  internals.set(control, {
    get nested() {
      return nested;
    },
    set nested(value: boolean) {
      nested = value;
    },
    totalDuration,
    drive(at, fire) {
      if (destroyed) return;
      const end = totalDuration();
      const target = clamp(at, 0, end);
      if (!started && target > 0) {
        started = true;
        safe(onStart);
      }
      if (advance(target, fire)) emitUpdate();
    },
    releaseAll,
  });
  counters.timelines++;
  return control;
}
