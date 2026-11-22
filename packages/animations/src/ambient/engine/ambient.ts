/**
 * Ambient lifecycle (Phase 015, internal to `./ambient`; contracts/ambient-api.md §1, research R14). One
 * controller per effect decides whether its decoration MOVES: wanted (`play`), on screen (shared observer),
 * page visible (shared listener), not reduced (live), not paused by the page switch, and motion time left
 * (`duration`, finite by default, `Infinity` explicit). CSS-driven effects only flip
 * `data-neshel-ambient="running|paused|static"` on their package layer (paused by default in `ambient.css`);
 * frame-driven effects hold ONE update task of the shared scheduler only while moving, throttled to `fps`.
 * Anything else costs zero tasks.
 */
import { devWarnOnce, isProduction, reportError } from "../../core/dev.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../../core/reduced-motion.js";
import { type FrameInfo, getFrameScheduler } from "../../core/scheduler.js";
import { type Validator, validator } from "../../core/validate.js";
import { ambientMotion, counters, observeVisibility, onPageVisibility } from "./registry.js";

export type AmbientState = "idle" | "running" | "paused" | "completed";
export type AmbientBlock = "offscreen" | "hidden" | "reduced" | "toggle" | "paused";

export interface AmbientOptions {
  /** ms of motion before resting (100–600000, default 5000) or `Infinity` (explicit; offer `<AmbientMotionToggle>`). */
  duration?: number;
  reducedMotion?: ReducedMotion;
  /** `mount` (default) starts at once; `manual` waits for `play()`. */
  trigger?: "mount" | "manual";
}

export interface AmbientControl {
  readonly state: AmbientState;
  /** Why the decoration is not moving right now (empty while it moves). */
  readonly blocked: readonly AmbientBlock[];
  /** Whether it is moving now. */
  readonly moving: boolean;
  play(): void;
  pause(): void;
  /** Stop and show the rest frame. */
  stop(): void;
  destroy(): void;
}

export interface AmbientDriver {
  /** Visibility gate (the container). */
  gate: Element;
  /** CSS-driven: the package layer whose play state is flipped. */
  layer?: Element;
  /** Frame-driven: render at `time` ms of motion (`delta` ms since the last render). */
  frame?(time: number, delta: number): void;
  /** Frames per second cap for `frame` (default 60). */
  fps?: number;
  /** Show the still decoration (reduced, stopped, completed). */
  rest?(): void;
  /** Release everything the effect created. */
  destroy(): void;
  /** Pointer-driven (not autoplaying): no time limit and no WCAG 2.2.2 warning. */
  interactive?: boolean;
}

export interface ResolvedAmbient {
  v: Validator;
  duration: number;
  policy: ReducedMotion;
  trigger: "mount" | "manual";
}

export function resolveAmbient(name: string, options: AmbientOptions | undefined): ResolvedAmbient {
  const v = validator(name);
  const o = v.options(options) as AmbientOptions;
  const duration =
    o.duration === Number.POSITIVE_INFINITY
      ? o.duration
      : v.number("duration", o.duration, 5000, 100, 600000);
  return {
    v,
    duration,
    policy: v.reducedMotion(o.reducedMotion),
    trigger: v.oneOf("trigger", o.trigger, ["mount", "manual"], "mount"),
  };
}

export function createAmbient(
  name: string,
  resolved: ResolvedAmbient,
  driver: AmbientDriver,
): AmbientControl {
  const { policy, trigger } = resolved;
  const duration = driver.interactive ? Number.POSITIVE_INFINITY : resolved.duration;
  const scheduler = getFrameScheduler();
  const minFrame = 1000 / Math.min(60, Math.max(1, driver.fps ?? 60));
  let state: AmbientState = "idle";
  let time = 0;
  let sinceRender = 0;
  let onScreen = true;
  let hidden = typeof document !== "undefined" && document.hidden;
  let systemReduced = prefersReducedMotion();
  let cancelTask: (() => void) | undefined;
  let cssRunning = false;
  let cssStarted = 0;
  let cssTimer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;
  let rendered = false;
  const reduced = () => shouldReduceMotion(policy, systemReduced);
  counters.effects++;

  const safe = (fn: (() => void) | undefined) => {
    try {
      fn?.();
    } catch (error) {
      reportError(error);
    }
  };

  function blocked(): AmbientBlock[] {
    const list: AmbientBlock[] = [];
    if (state !== "running") list.push("paused");
    if (!onScreen) list.push("offscreen");
    if (hidden) list.push("hidden");
    if (reduced()) list.push("reduced");
    if (ambientMotion.paused) list.push("toggle");
    return list;
  }
  const moving = () => !destroyed && blocked().length === 0;

  function complete(): void {
    state = "completed";
    update();
  }

  function tick({ delta }: FrameInfo): boolean {
    if (!moving()) {
      cancelTask = undefined;
      counters.ticking--;
      return false;
    }
    const ms = delta * 1000;
    time += ms;
    sinceRender += ms;
    if (sinceRender >= minFrame - 0.5 || !rendered) {
      rendered = true;
      const step = sinceRender;
      sinceRender = 0;
      safe(() => driver.frame?.(time, step));
      counters.draws++;
    }
    if (time >= duration) {
      cancelTask = undefined;
      counters.ticking--;
      complete();
      return false;
    }
    return true;
  }

  function setCss(next: "running" | "paused" | "static"): void {
    if (!driver.layer) return;
    driver.layer.setAttribute("data-neshel-ambient", next);
    const running = next === "running";
    if (running !== cssRunning) {
      cssRunning = running;
      counters.cssRunning += running ? 1 : -1;
    }
  }

  function update(): void {
    if (destroyed) return;
    const go = moving();
    if (driver.frame) {
      if (go && !cancelTask) {
        cancelTask = scheduler.schedule(tick, "update");
        counters.ticking++;
      } else if (!go && cancelTask) {
        cancelTask();
        cancelTask = undefined;
        counters.ticking--;
      }
    }
    if (driver.layer) {
      if (go && !cssRunning) {
        cssStarted = Date.now();
        if (Number.isFinite(duration))
          cssTimer = setTimeout(
            () => {
              cssTimer = undefined;
              time += Date.now() - cssStarted;
              cssStarted = Date.now();
              complete();
            },
            Math.max(0, duration - time),
          );
        setCss("running");
      } else if (!go && cssRunning) {
        if (cssTimer !== undefined) clearTimeout(cssTimer);
        cssTimer = undefined;
        time += Date.now() - cssStarted;
      }
      if (!go) setCss(reduced() || state === "idle" ? "static" : "paused");
    }
    if (!go && (reduced() || state === "idle")) safe(driver.rest);
  }

  const unobserve = observeVisibility(driver.gate, (visible) => {
    onScreen = visible;
    update();
  });
  const unpage = onPageVisibility((next) => {
    hidden = next;
    update();
  });
  const unswitch = ambientMotion.subscribe(() => update());
  const unreduced = subscribeReducedMotion((next) => {
    systemReduced = next;
    update();
  });

  const control: AmbientControl = {
    get state() {
      return state;
    },
    get blocked() {
      return blocked();
    },
    get moving() {
      return moving();
    },
    play() {
      if (destroyed || state === "running") return;
      if (state === "completed" || state === "idle") time = 0;
      state = "running";
      if (
        duration === Number.POSITIVE_INFINITY &&
        !driver.interactive &&
        !isProduction() &&
        counters.toggles === 0
      ) {
        devWarnOnce(
          `ambient-infinite:${name}`,
          `${name}: "duration: Infinity" runs for more than 5 s — render <AmbientMotionToggle> (or another pause control) so users can stop it (WCAG 2.2.2).`,
        );
      }
      update();
    },
    pause() {
      if (state !== "running") return;
      state = "paused";
      update();
    },
    stop() {
      if (destroyed) return;
      state = "idle";
      time = 0;
      update();
      safe(driver.rest);
    },
    destroy() {
      if (destroyed) return;
      state = "idle";
      update();
      destroyed = true;
      if (cancelTask) {
        cancelTask();
        cancelTask = undefined;
        counters.ticking--;
      }
      if (cssTimer !== undefined) clearTimeout(cssTimer);
      if (cssRunning) counters.cssRunning--;
      cssRunning = false;
      unobserve();
      unpage();
      unswitch();
      unreduced();
      safe(driver.destroy);
      counters.effects--;
    },
  };
  safe(driver.rest);
  setCss("static");
  if (trigger === "mount") control.play();
  return control;
}
