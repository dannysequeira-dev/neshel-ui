/**
 * Scroll Triggers (Phase 011, catalogue ST01–ST07, ST09; contracts/api-011.md §1). ST08 is
 * `createSectionSpy` and ST10 `inViewPresets` (engine/in-view.ts).
 *
 * ST01–ST03 drive an Entrance definition or preset passed as a value (never a copy, never an import of the
 * entrance family): the entrance is attached with `appear: false` and the additive `hold` / `playback`
 * options; enter replays it, leaving re-arms it according to `mode`. Content is held hidden only for
 * client-only mounts (`initial: "hold"`) or after the first report says the element is outside the trigger
 * area — never under reduced motion, without IntersectionObserver or after `beforeprint`
 * (contracts/accessibility-011.md §2).
 */
import { animateValue, type MotionControl } from "../core/controls.js";
import { attachEffect, defineEffect, type EffectHandle } from "../core/effect.js";
import { motionValue } from "../core/motion-value.js";
import { type PresetInput, resolvePreset } from "../core/preset.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import {
  collectTargets,
  type Measurable,
  registerGeometry,
  subjectStart,
} from "./engine/geometry.js";
import {
  createScrollTrigger,
  type InViewInput,
  observeInView,
  resolveInView,
  type TriggerMode,
} from "./engine/in-view.js";
import { getScrollSource, normaliseSource } from "./engine/source.js";
import { type PropertyProgressOptions, propertyProgress } from "./parallax.js";
import { attributeWriter, roundTo } from "./shared.js";

// biome-ignore lint/suspicious/noExplicitAny: entrance presets of any option types.
type AnyPreset = PresetInput<any, any>;

// --- ST01 / ST02 / ST03 / ST04 reveal on enter --------------------------------------------------------

export interface RevealOnEnterOptions {
  /** An Entrance definition or preset (`fadeUp`, `clipCircle`, …; for ST02 the `stagger` effect). */
  preset: AnyPreset;
  /** Options merged over the preset's (`appear`, `hold`, `replay`, `playback` are managed). */
  options?: Record<string, unknown>;
  /** Trigger area: an `inViewPresets` name or `{ rootMargin, threshold, root }` (default `"default"`). */
  trigger?: InViewInput;
  /** ST03: `"once"` (default), `"repeat"` (re-arm on every leave) or `"reverse"` (play out on leave-back). */
  mode?: TriggerMode;
  /**
   * `"hold"` (default for imperative attachment): hide the start pose now, before paint. `"visible"`:
   * keep the element as rendered until the first report (hydrated server markup).
   */
  initial?: "hold" | "visible";
  /** ST04 callbacks. */
  onEnter?: () => void;
  onLeave?: () => void;
  onEnterBack?: () => void;
  onLeaveBack?: () => void;
  reducedMotion?: ReducedMotion;
}

interface ResolvedReveal {
  preset: AnyPreset;
  options: Record<string, unknown>;
  trigger: InViewInput | undefined;
  mode: TriggerMode;
  initial: "hold" | "visible";
  onEnter: (() => void) | undefined;
  onLeave: (() => void) | undefined;
  onEnterBack: (() => void) | undefined;
  onLeaveBack: (() => void) | undefined;
  reducedMotion: ReducedMotion;
}

function createRevealOnEnter(
  id: "scroll-trigger/reveal-on-enter" | "scroll-trigger/stagger-on-enter",
  name: string,
  accepts: (effectId: string) => boolean,
  expected: string,
) {
  const v = validator(name);
  return defineEffect<RevealOnEnterOptions, ResolvedReveal>({
    id,
    family: "scroll-trigger",
    channels: [],
    reducedMotion: "instant",
    resolve(input) {
      const o = v.options(input) as Partial<RevealOnEnterOptions>;
      if (!o.preset) v.fail(`"preset" is required (${expected}).`);
      const { effect, options } = resolvePreset(o.preset as AnyPreset);
      if (effect?.family !== "entrance" || !accepts(effect.id)) {
        v.fail(`"preset" must be ${expected} (received ${effect?.id}).`);
      }
      const extra = v.options(o.options) as Record<string, unknown>;
      effect.resolve({ ...(options as object), ...extra });
      resolveInView(o.trigger, name);
      return {
        preset: o.preset as AnyPreset,
        options: extra,
        trigger: o.trigger,
        mode: v.oneOf("mode", o.mode, ["once", "repeat", "reverse"] as const, "once"),
        initial: v.oneOf("initial", o.initial, ["hold", "visible"] as const, "hold"),
        onEnter: v.callback("onEnter", o.onEnter),
        onLeave: v.callback("onLeave", o.onLeave),
        onEnterBack: v.callback("onEnterBack", o.onEnterBack),
        onLeaveBack: v.callback("onLeaveBack", o.onLeaveBack),
        reducedMotion: v.reducedMotion(o.reducedMotion),
      };
    },
    policy: (options) => options.reducedMotion,
    setup(context) {
      let o = context.options;
      const { effect, options: presetOptions } = resolvePreset(o.preset);
      let replay = 0;
      let hold = o.initial === "hold" && !context.reduced;
      let playback: "in" | "out" = "in";
      let reports = 0;
      /**
       * The hold was released by reduced motion (content shown, nothing played). When motion is allowed
       * again, content still outside the trigger area is held again off-screen (as on a first report);
       * content that may be on screen is never hidden again and its entrance is not replayed (issue #11).
       */
      let released = false;
      const entranceOptions = () => ({
        ...(presetOptions as object),
        ...o.options,
        reducedMotion: (o.options.reducedMotion as ReducedMotion | undefined) ?? o.reducedMotion,
        appear: false,
        hold,
        playback,
        replay,
      });
      const entrance: EffectHandle<unknown> = attachEffect(
        context.element,
        effect,
        entranceOptions(),
      );
      const push = () => entrance.update(entranceOptions());

      const play = (direction: "in" | "out") => {
        if (context.reduced) {
          // Instant: nothing moves, content stays visible.
          hold = false;
          push();
          return;
        }
        released = false;
        playback = direction;
        hold = direction === "out";
        replay++;
        push();
      };
      const rearm = () => {
        if (context.reduced) return;
        released = false;
        playback = "in";
        hold = true;
        push();
      };
      /** Restore a hold released by reduced motion while the element is outside the trigger area. */
      const restoreHold = () => {
        if (!released || context.reduced) return;
        const state = trigger.state;
        if (state === "before" || (state === "after" && o.mode === "repeat")) rearm();
      };

      const trigger = createScrollTrigger(context.element, {
        trigger: o.trigger,
        mode: o.mode === "once" ? "once" : "repeat",
        onEnter: () => {
          // Hydrated markup already in view on the first report stays as rendered (no re-hide), and so
          // does content shown by reduced motion (never replayed from the hidden start pose).
          if (released) released = false;
          else if (!(reports === 1 && !hold && o.initial === "visible")) play("in");
          o.onEnter?.();
        },
        onEnterBack: () => {
          // Coming back from above: once/reverse content is visible already; repeat replays.
          if (released) released = false;
          else if (o.mode === "repeat" || hold) play("in");
          o.onEnterBack?.();
        },
        onLeave: () => {
          if (o.mode === "repeat") rearm();
          o.onLeave?.();
        },
        onLeaveBack: () => {
          if (o.mode === "repeat") rearm();
          else if (o.mode === "reverse") play("out");
          o.onLeaveBack?.();
        },
        onChange: (state) => {
          reports++;
          // First report outside the area (hydrated markup below the fold): hide it now, off-screen.
          if (state === "before" && !hold && playback === "in" && replay === 0) rearm();
          else restoreHold();
        },
      });
      // Restored in the next update phase: listeners are notified in subscription order and the entrance
      // (attached during this setup) may not have left its reduced state yet.
      let cancelRestore: (() => void) | undefined;
      const stopReduced = context.onReducedChange((reduced) => {
        if (reduced && hold) {
          hold = false;
          released = true;
          push();
        } else if (!reduced && released) {
          cancelRestore ??= context.scheduler.schedule(() => {
            cancelRestore = undefined;
            restoreHold();
          });
        }
      });

      return {
        update(next) {
          o = next;
          push();
        },
        pause: () => entrance.pause(),
        resume: () => entrance.resume(),
        destroy() {
          stopReduced();
          cancelRestore?.();
          trigger.destroy();
          entrance.destroy();
        },
      };
    },
  });
}

/** ST01 — play an Entrance preset when the element enters the trigger area. */
export const revealOnEnter = /* @__PURE__ */ createRevealOnEnter(
  "scroll-trigger/reveal-on-enter",
  "revealOnEnter",
  (effectId) => effectId !== "entrance/stagger",
  "an entrance definition or preset (use staggerOnEnter for stagger)",
);

/** ST02 — play the E10 `stagger` (children) when the container enters the trigger area. */
export const staggerOnEnter = /* @__PURE__ */ createRevealOnEnter(
  "scroll-trigger/stagger-on-enter",
  "staggerOnEnter",
  (effectId) => effectId === "entrance/stagger",
  "the entrance `stagger` effect or a stagger preset",
);

// --- ST05 in-view progress variable -------------------------------------------------------------

export type InViewProgressOptions = PropertyProgressOptions;

/** ST05 — `--neshel-view-progress` (0–1) while the element crosses the viewport; `1` under reduced motion. */
export const inViewProgress = /* @__PURE__ */ propertyProgress<InViewProgressOptions>({
  id: "scroll-trigger/in-view-progress",
  name: "inViewProgress",
  property: "--neshel-view-progress",
  reducedMotion: "static",
  range: ["cover 0%", "cover 100%"],
  subject: "element",
  reducedValue: "1",
});

// --- ST06 direction-aware header ----------------------------------------------------------------

export interface DirectionHeaderOptions {
  /** Never hide above this scroll offset, px (0–2000, default 80). */
  offset?: number;
  /** Scroll distance in one direction before toggling, px (0–400, default 12). */
  tolerance?: number;
  /** Slide duration in ms (default 220). */
  duration?: number;
  source?: Element | Window | null;
  onChange?: (hidden: boolean) => void;
  reducedMotion?: ReducedMotion;
}

interface ResolvedHeader {
  offset: number;
  tolerance: number;
  duration: number;
  source: Element | Window | null | undefined;
  onChange: ((hidden: boolean) => void) | undefined;
  reducedMotion: ReducedMotion;
}

const headerValidator = /* @__PURE__ */ validator("directionHeader");

/**
 * ST06 — hides a sticky/fixed header (transform layer `translateY(−height)`) while scrolling forward past
 * `offset`; shows it on backward scroll, near the top and while focus is inside it (keyboard users never
 * lose a hidden header). `data-neshel-header="hidden"` while hidden. Height is measured on invalidation.
 */
export const directionHeader = /* @__PURE__ */ defineEffect<DirectionHeaderOptions, ResolvedHeader>(
  {
    id: "scroll-trigger/direction-header",
    family: "scroll-trigger",
    channels: [{ channel: "transform", mode: "compose" }],
    reducedMotion: "instant",
    resolve(input) {
      const v = headerValidator;
      const o = v.options(input);
      return {
        offset: v.number("offset", o.offset, 80, 0, 2000),
        tolerance: v.number("tolerance", o.tolerance, 12, 0, 400),
        duration: v.duration("duration", o.duration, 220),
        source: o.source,
        onChange: v.callback("onChange", o.onChange),
        reducedMotion: v.reducedMotion(o.reducedMotion),
      };
    },
    policy: (options) => options.reducedMotion,
    setup(context) {
      let o = context.options;
      const element = context.element as HTMLElement;
      const source = getScrollSource(normaliseSource(o.source));
      const amount = motionValue(0); // 0 shown … 1 hidden
      const attribute = attributeWriter(element, "data-neshel-header");
      let height = 0;
      let hidden = false;
      let focusInside = false;
      let travel = 0;
      let lastPosition: number | undefined;
      let control: MotionControl | undefined;

      const render = (value: number) => {
        const y = roundTo(-height * value);
        if (y === 0) context.channels.transform.clear();
        else context.channels.transform.set({ translateY: y });
      };
      const unsubscribeValue = amount.subscribe(render);

      function setHidden(next: boolean): void {
        if (next === hidden) return;
        hidden = next;
        attribute.set(next ? "hidden" : null);
        control?.cancel();
        if (context.reduced) amount.set(next ? 1 : 0);
        else {
          control = animateValue(
            amount,
            next ? 1 : 0,
            { type: "tween", duration: o.duration, easing: "standard" },
            { reducedMotion: "never" },
          );
        }
        o.onChange?.(next);
      }

      const item: Measurable = {
        source,
        targets: () => [element],
        ancestors: () => [],
        measure() {
          height = element.offsetHeight;
        },
        measured: () => render(amount.get()),
      };

      function onScroll(): void {
        const position = source.position.block;
        const previous = lastPosition ?? position;
        lastPosition = position;
        const delta = position - previous;
        if (delta === 0) return;
        travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
        if (position <= o.offset || focusInside) setHidden(false);
        else if (travel > o.tolerance) setHidden(true);
        else if (travel < -o.tolerance) setHidden(false);
      }

      const onFocusIn = () => {
        focusInside = true;
        setHidden(false);
      };
      const onFocusOut = (event: FocusEvent) => {
        focusInside = element.contains(event.relatedTarget as Node | null);
      };
      element.addEventListener("focusin", onFocusIn);
      element.addEventListener("focusout", onFocusOut);
      const unsubscribe = source.subscribe(onScroll);
      const unregister = registerGeometry(item);
      const stopReduced = context.onReducedChange((reduced) => {
        if (!reduced) return;
        control?.cancel();
        amount.set(hidden ? 1 : 0);
      });

      return {
        update(next) {
          o = next;
        },
        destroy() {
          control?.cancel();
          unsubscribe();
          unregister();
          stopReduced();
          unsubscribeValue();
          element.removeEventListener("focusin", onFocusIn);
          element.removeEventListener("focusout", onFocusOut);
          attribute.restore();
          context.channels.transform.clear();
        },
      };
    },
  },
);

// --- ST07 stuck-state detection -----------------------------------------------------------------

export interface StuckStateOptions {
  onChange?: (stuck: boolean) => void;
  source?: Element | Window | null;
}

interface ResolvedStuck {
  onChange: ((stuck: boolean) => void) | undefined;
  source: Element | Window | null | undefined;
}

const stuckValidator = /* @__PURE__ */ validator("stuckState");

/**
 * ST07 — `data-neshel-stuck` while a `position: sticky` element (block-start offset `top`) is pinned.
 * An IntersectionObserver with `rootMargin: -(top + 1)px 0 0 0` and thresholds 0/1 reports the pinned edge
 * (no sentinel element); the release point (bottom of the containing block) comes from cached geometry
 * and the source position, so scrolling reads no layout.
 */
export const stuckState = /* @__PURE__ */ defineEffect<StuckStateOptions, ResolvedStuck>({
  id: "scroll-trigger/stuck-state",
  family: "scroll-trigger",
  channels: [],
  reducedMotion: "off",
  resolve(input) {
    const o = stuckValidator.options(input);
    return { onChange: stuckValidator.callback("onChange", o.onChange), source: o.source };
  },
  setup(context) {
    let o = context.options;
    const element = context.element as HTMLElement;
    const sourceElement = normaliseSource(o.source);
    const source = getScrollSource(sourceElement);
    const attribute = attributeWriter(element, "data-neshel-stuck");
    let top: number | undefined;
    let release = Number.POSITIVE_INFINITY;
    let pinnedEdge = false;
    let stuck = false;
    let stopObserver: (() => void) | undefined;

    const evaluate = () => {
      const next = pinnedEdge && source.position.block <= release;
      if (next === stuck) return;
      stuck = next;
      attribute.set(next ? "" : null);
      o.onChange?.(next);
    };

    const observe = () => {
      stopObserver?.();
      if (top === undefined) return;
      const offset = top;
      stopObserver = observeInView(
        element,
        // Thresholds 0 and 1: a jump from far away into the pinned state crosses 0, a pinned edge
        // makes the box cross 1 (its top passes the shrunken root edge).
        { rootMargin: `${-(offset + 1)}px 0px 0px 0px`, threshold: [0, 1], root: sourceElement },
        (report) => {
          pinnedEdge =
            report.ratio > 0 && report.ratio < 0.999 && Math.abs(report.top - offset) <= 1.5;
          evaluate();
        },
      );
    };

    const item: Measurable = {
      source,
      targets: () => collectTargets(element, sourceElement).targets,
      ancestors: () => collectTargets(element, sourceElement).ancestors,
      measure() {
        const style = getComputedStyle(element);
        const parsed = Number.parseFloat(style.top);
        const nextTop = Number.isFinite(parsed) ? parsed : undefined;
        const parent = element.parentElement;
        if (parent && nextTop !== undefined) {
          const parentStyle = getComputedStyle(parent);
          const contentEnd =
            subjectStart(parent, sourceElement, "block") +
            parent.clientTop +
            parent.clientHeight -
            Number.parseFloat(parentStyle.paddingBottom || "0");
          const margin = Number.parseFloat(style.marginBottom || "0") || 0;
          release = contentEnd - element.offsetHeight - margin - nextTop;
        }
        if (nextTop !== top) {
          top = nextTop;
          queueMicrotask(observe);
        }
      },
    };
    const unsubscribe = source.subscribe(evaluate);
    const unregister = registerGeometry(item);
    return {
      update(next) {
        o = next;
      },
      destroy() {
        stopObserver?.();
        unsubscribe();
        unregister();
        attribute.restore();
      },
    };
  },
});

// --- ST09 lazy activation of heavy effects -----------------------------------------------------

export interface LazyEffectOptions {
  /** Any effect definition or preset (Tilt3D-like heavy effects, …). */
  preset: AnyPreset;
  options?: Record<string, unknown>;
  /** Activation area (default `"lazy"`: two viewports around the viewport). */
  trigger?: InViewInput;
  /** Keep the effect attached after it first activates (default false: destroy when far). */
  keepAlive?: boolean;
  onActiveChange?: (active: boolean) => void;
}

interface ResolvedLazy {
  preset: AnyPreset;
  options: Record<string, unknown> | undefined;
  trigger: InViewInput;
  keepAlive: boolean;
  onActiveChange: ((active: boolean) => void) | undefined;
}

const lazyValidator = /* @__PURE__ */ validator("lazyEffect");

export const lazyEffect = /* @__PURE__ */ defineEffect<LazyEffectOptions, ResolvedLazy>({
  id: "scroll-trigger/lazy-effect",
  family: "scroll-trigger",
  channels: [],
  reducedMotion: "off",
  resolve(input) {
    const v = lazyValidator;
    const o = v.options(input) as Partial<LazyEffectOptions>;
    if (!o.preset) v.fail('"preset" is required (an effect definition or preset).');
    const { effect, options } = resolvePreset(o.preset as AnyPreset);
    if (!effect || typeof effect.setup !== "function") v.fail('"preset" must be an effect.');
    if (effect.id === "scroll-trigger/lazy-effect") v.fail('"preset" cannot be lazyEffect itself.');
    const extra =
      o.options === undefined ? undefined : (v.options(o.options) as Record<string, unknown>);
    effect.resolve(extra ? { ...(options as object), ...extra } : options);
    const trigger = o.trigger ?? "lazy";
    resolveInView(trigger, "lazyEffect");
    return {
      preset: o.preset as AnyPreset,
      options: extra,
      trigger,
      keepAlive: v.flag("keepAlive", o.keepAlive, false),
      onActiveChange: v.callback("onActiveChange", o.onActiveChange),
    };
  },
  setup(context) {
    let o = context.options;
    let handle: EffectHandle<unknown> | undefined;
    let paused = false;
    const activate = (on: boolean) => {
      if (on && !handle) {
        const { effect, options } = resolvePreset(o.preset, o.options);
        handle = attachEffect(context.element, effect, options);
        if (paused) handle.pause();
        o.onActiveChange?.(true);
      } else if (!on && handle && !o.keepAlive) {
        handle.destroy();
        handle = undefined;
        o.onActiveChange?.(false);
      }
    };
    const stop = observeInView(context.element, o.trigger, (report) => activate(report.inView));
    return {
      update(next) {
        o = next;
        if (handle) handle.update(resolvePreset(o.preset, o.options).options);
      },
      pause() {
        paused = true;
        handle?.pause();
      },
      resume() {
        paused = false;
        handle?.resume();
      },
      destroy() {
        stop();
        handle?.destroy();
        handle = undefined;
      },
    };
  },
});
