/**
 * FLIP animator (Phase 012, internal; contracts/layout-engine.md §3, ADR 0027 §4). Shared by `./layout`
 * (L01, L03–L05, L10) and `./gestures` (G10 drop settle) so no family imports another.
 *
 * Holds one element's layout offset `{x, y, sx, sy}` as a transform layer written by the caller (through the
 * element's motion host) and moves it toward a target with the 009 spring integrator (velocity kept across
 * retargets) or a tween. `from(first, last)` inverts a box change — centre-based, plus the offset the
 * element already shows, so an interrupted animation continues from where it is — and animates to identity.
 * One update task per running animator; none at rest. No layout reads here: boxes come from the caller.
 */
import type { TransformLayer } from "./compose.js";
import type { Easing } from "./easing.js";
import type { Box } from "./layout-box.js";
import type { FrameInfo, FrameScheduler } from "./scheduler.js";
import { type SpringOptions, type SpringState, stepSpring } from "./spring.js";

export type LayoutMode = "position" | "size" | "both";

export type FlipTransition =
  | { type: "spring"; spring: Required<SpringOptions> }
  | { type: "tween"; duration: number; easing: Easing };

export interface FlipOffset {
  x: number;
  y: number;
  sx: number;
  sy: number;
}

export interface FlipAnimator {
  /** Current offset (state, never measured). */
  readonly offset: Readonly<FlipOffset>;
  readonly running: boolean;
  /** Invert `first → last` (plus the current offset) and animate to identity. */
  from(first: Box, last: Box, layout?: LayoutMode): void;
  /** Animate toward an offset (missing parts keep their target). */
  to(target: Partial<FlipOffset>): void;
  /** Show an offset at once (no animation). */
  jump(offset: Partial<FlipOffset>): void;
  setTransition(transition: FlipTransition): void;
  /** Stop and clear the layer (identity). */
  stop(): void;
}

const KEYS = ["x", "y", "sx", "sy"] as const;
const IDENTITY: FlipOffset = { x: 0, y: 0, sx: 1, sy: 1 };

const isIdentity = (o: FlipOffset) =>
  Math.abs(o.x) < 0.5 &&
  Math.abs(o.y) < 0.5 &&
  Math.abs(o.sx - 1) < 0.005 &&
  Math.abs(o.sy - 1) < 0.005;

export function flipLayer(o: FlipOffset): TransformLayer | undefined {
  if (
    Math.abs(o.x) < 1e-3 &&
    Math.abs(o.y) < 1e-3 &&
    Math.abs(o.sx - 1) < 1e-4 &&
    Math.abs(o.sy - 1) < 1e-4
  ) {
    return undefined;
  }
  return { translateX: o.x, translateY: o.y, scaleX: o.sx, scaleY: o.sy };
}

export function createFlipAnimator(
  scheduler: FrameScheduler,
  initial: FlipTransition,
  write: (layer: TransformLayer | undefined) => void,
): FlipAnimator {
  let transition = initial;
  const value: FlipOffset = { ...IDENTITY };
  const target: FlipOffset = { ...IDENTITY };
  const springs: Record<(typeof KEYS)[number], SpringState> = {
    x: { value: 0, velocity: 0 },
    y: { value: 0, velocity: 0 },
    sx: { value: 1, velocity: 0 },
    sy: { value: 1, velocity: 0 },
  };
  // Tween state: start offset and progress.
  let tweenFrom: FlipOffset = { ...IDENTITY };
  let progress = 1;
  let cancel: (() => void) | undefined;

  const render = () => write(flipLayer(value));

  function tick({ delta }: FrameInfo): boolean {
    let settled = true;
    if (transition.type === "spring") {
      for (const key of KEYS) {
        const state = springs[key];
        settled = stepSpring(state, target[key], transition.spring, delta) && settled;
        value[key] = state.value;
      }
    } else {
      const duration = transition.duration;
      progress = duration <= 0 ? 1 : Math.min(1, progress + (delta * 1000) / duration);
      const eased = transition.easing(progress);
      for (const key of KEYS) value[key] = tweenFrom[key] + (target[key] - tweenFrom[key]) * eased;
      settled = progress >= 1;
    }
    if (settled) {
      for (const key of KEYS) {
        value[key] = target[key];
        springs[key].value = target[key];
        springs[key].velocity = 0;
      }
      cancel = undefined;
    }
    render();
    return !settled;
  }

  function run(): void {
    for (const key of KEYS) springs[key].value = value[key];
    tweenFrom = { ...value };
    progress = 0;
    const done = KEYS.every(
      (key) => Math.abs(value[key] - target[key]) < 1e-3 && Math.abs(springs[key].velocity) < 1e-3,
    );
    if (done) {
      cancel?.();
      cancel = undefined;
      for (const key of KEYS) value[key] = target[key];
      render();
      return;
    }
    render();
    cancel ??= scheduler.schedule(tick, "update");
  }

  return {
    offset: value,
    get running() {
      return cancel !== undefined;
    },
    from(first, last, layout = "position") {
      const fcx = first.x + first.width / 2 + value.x;
      const fcy = first.y + first.height / 2 + value.y;
      const next: FlipOffset = {
        x: fcx - (last.x + last.width / 2),
        y: fcy - (last.y + last.height / 2),
        sx: 1,
        sy: 1,
      };
      if (layout !== "position") {
        next.sx = last.width > 0 ? (first.width * value.sx) / last.width : 1;
        next.sy = last.height > 0 ? (first.height * value.sy) / last.height : 1;
      }
      Object.assign(target, IDENTITY);
      if (!cancel && isIdentity(next)) return;
      Object.assign(value, next);
      run();
    },
    to(next) {
      Object.assign(target, next);
      run();
    },
    jump(next) {
      cancel?.();
      cancel = undefined;
      Object.assign(value, next);
      Object.assign(target, next);
      for (const key of KEYS) {
        springs[key].value = value[key];
        springs[key].velocity = 0;
      }
      render();
    },
    setTransition(next) {
      transition = next;
    },
    stop() {
      cancel?.();
      cancel = undefined;
      Object.assign(value, IDENTITY);
      Object.assign(target, IDENTITY);
      for (const key of KEYS) {
        springs[key].value = value[key];
        springs[key].velocity = 0;
      }
      write(undefined);
    },
  };
}
