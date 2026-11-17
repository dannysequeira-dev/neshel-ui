/**
 * Scroll & Parallax effects (Phase 011, catalogue SP01–SP03, SP05–SP09, SP11; contracts/api-011.md §2).
 * SP04 is the `<HorizontalScroll>` component and SP10 the `smooth` option of every timeline.
 *
 * Effects that move the consumer's element contribute transform layers / opacity factors to its motion
 * host (they compose with Tilt3D, Hover, Press and Entrance). Custom-property outputs are exclusive
 * channels; SP03 and SP05 may drive theirs natively (registered property + scroll timeline) after the
 * engine's behavioural check.
 */

import type { Easing, EasingPreset } from "../core/easing.js";
import { attachEffect, defineEffect, type EffectHandle } from "../core/effect.js";
import { clamp, mix } from "../core/interpolate.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import { createSpringRig } from "../core/springs.js";
import { FX_REDUCED_ATTRIBUTE, toggleToken } from "../core/tokens.js";
import { validator } from "../core/validate.js";
import { fixed } from "../core/writers.js";
import { bindNative, type DriverPreference, type NativeBinding } from "./engine/native.js";
import type { ScrollProgress } from "./engine/progress.js";
import { getScrollSource, normaliseSource } from "./engine/source.js";
import {
  attributeWriter,
  type DrawContext,
  type ProgressOptions,
  progressEffect,
  roundTo,
} from "./shared.js";

// --- SP01 depth-layer parallax ----------------------------------------------------------------------

export interface DepthParallaxOptions extends ProgressOptions {
  /** Speed factor: positive moves against the scroll (foreground), negative lags (background). −5…5, default 1. */
  depth?: number;
  /** Travel at depth 1 over the whole range, px (0–2000, default 200). */
  distance?: number;
  /** Movement axis (default `"y"`). */
  axis?: "x" | "y";
}

export const depthParallax = /* @__PURE__ */ progressEffect<
  DepthParallaxOptions,
  { depth: number; distance: number; axis: "x" | "y" }
>({
  id: "scroll/depth-parallax",
  name: "depthParallax",
  channels: [{ channel: "transform", mode: "compose" }],
  reducedMotion: "static",
  range: ["cover 0%", "cover 100%"],
  resolve: (o, v) => ({
    depth: v.number("depth", o.depth, 1, -5, 5),
    distance: v.number("distance", o.distance, 200, 0, 2000),
    axis: v.oneOf("axis", o.axis, ["x", "y"] as const, "y"),
  }),
  render({ context, extra }, p) {
    const offset = roundTo((0.5 - p) * extra.distance * extra.depth);
    if (offset === 0) context.channels.transform.clear();
    else
      context.channels.transform.set(
        extra.axis === "y" ? { translateY: offset } : { translateX: offset },
      );
  },
  clear: ({ context }) => context.channels.transform.clear(),
});

// --- SP02 scrubbed transform ----------------------------------------------------------------------

export interface ScrubPose {
  translateX?: number;
  translateY?: number;
  rotateZ?: number;
  scale?: number;
  opacity?: number;
}

export interface ScrubTransformOptions extends ProgressOptions {
  from?: ScrubPose;
  to?: ScrubPose;
  easing?: Easing | EasingPreset;
}

const POSE_KEYS = ["translateX", "translateY", "rotateZ", "scale", "opacity"] as const;

function resolvePose(
  name: string,
  value: unknown,
  v: ReturnType<typeof validator>,
): Required<ScrubPose> {
  const pose = v.options(value as ScrubPose | undefined);
  for (const key of Object.keys(pose)) {
    if (!(POSE_KEYS as readonly string[]).includes(key))
      v.fail(`"${name}.${key}" is not a scrub property.`);
  }
  return {
    translateX: v.number(`${name}.translateX`, pose.translateX, 0, -5000, 5000),
    translateY: v.number(`${name}.translateY`, pose.translateY, 0, -5000, 5000),
    rotateZ: v.number(`${name}.rotateZ`, pose.rotateZ, 0, -3600, 3600),
    scale: v.number(`${name}.scale`, pose.scale, 1, 0, 20),
    opacity: v.number(`${name}.opacity`, pose.opacity, 1, 0, 1),
  };
}

export const scrubTransform = /* @__PURE__ */ progressEffect<
  ScrubTransformOptions,
  { from: Required<ScrubPose>; to: Required<ScrubPose>; easing: Easing }
>({
  id: "scroll/scrub-transform",
  name: "scrubTransform",
  channels: [
    { channel: "transform", mode: "compose" },
    { channel: "opacity", mode: "multiply" },
  ],
  reducedMotion: "static",
  range: ["cover 0%", "cover 100%"],
  resolve: (o, v) => ({
    from: resolvePose("from", o.from, v),
    to: resolvePose("to", o.to, v),
    easing: v.easing(o.easing, "linear"),
  }),
  render({ context, extra }, p) {
    const t = extra.easing(p);
    const { from, to } = extra;
    const layer = {
      translateX: roundTo(mix(from.translateX, to.translateX, t)),
      translateY: roundTo(mix(from.translateY, to.translateY, t)),
      rotateZ: roundTo(mix(from.rotateZ, to.rotateZ, t)),
      scale: roundTo(mix(from.scale, to.scale, t), 4),
    };
    if (
      layer.translateX === 0 &&
      layer.translateY === 0 &&
      layer.rotateZ === 0 &&
      layer.scale === 1
    ) {
      context.channels.transform.clear();
    } else context.channels.transform.set(layer);
    const opacity = roundTo(clamp(mix(from.opacity, to.opacity, t), 0, 1), 4);
    if (opacity >= 1) context.channels.opacity.clear();
    else context.channels.opacity.set(opacity);
  },
  clear({ context }) {
    context.channels.transform.clear();
    context.channels.opacity.clear();
  },
});

// --- custom-property progress (SP03, SP05; shared with ST05) ------------------------------------

export interface PropertyProgressOptions extends ProgressOptions {
  /** `"auto"` (default): native scroll timeline when verified, else JS. */
  driver?: DriverPreference;
}

/**
 * A progress effect that writes `property` (0–1) — natively when allowed and verified, else through the
 * motion host. `reducedValue`: value written while motion is reduced (`undefined` keeps progress).
 */
export function propertyProgress<Options extends PropertyProgressOptions>(config: {
  id: `scroll/${string}` | `scroll-trigger/${string}`;
  name: string;
  property: `--neshel-${string}`;
  reducedMotion: "static" | "reduced";
  range: ProgressOptions["range"] & object;
  subject: "element" | "none";
  reducedValue?: string;
  token?: string;
}) {
  type Extra = { driver: DriverPreference };
  let native: WeakMap<object, NativeBinding | "js">;
  const nativeState = () => {
    native ??= new WeakMap();
    return native;
  };
  return progressEffect<Options, Extra>({
    id: config.id,
    name: config.name,
    channels: [{ channel: config.property, mode: "exclusive" }],
    reducedMotion: config.reducedMotion,
    // Keep drawing under reduced motion: the value is data, `reducedValue` decides what is written.
    keepDrawing: true,
    range: config.range,
    subject: config.subject === "none" ? () => null : undefined,
    resolve: (o, v) => ({
      driver: v.oneOf(
        "driver",
        (o as PropertyProgressOptions).driver,
        ["auto", "native", "js"] as const,
        "auto",
      ),
    }),
    start(draw, redraw) {
      const { context, timeline } = draw;
      const state = nativeState();
      const handle = context.channels.exclusive(config.property);
      const reducedToken = config.token
        ? toggleToken(context.element, FX_REDUCED_ATTRIBUTE, config.token)
        : undefined;
      const sync = () => {
        reducedToken?.(context.reduced);
        const binding = state.get(context);
        const wantNative =
          draw.extra.driver !== "js" && !(context.reduced && config.reducedValue !== undefined);
        if (wantNative && binding === undefined) {
          const created = bindNative(context.element, config.property, timeline, ["0", "1"], () => {
            state.set(context, "js");
            redraw();
          });
          state.set(context, created ?? "js");
          if (created) handle.clear();
        } else if (!wantNative && binding && binding !== "js") {
          binding.cancel();
          state.delete(context);
        }
        redraw();
      };
      sync();
      const stop = context.onReducedChange(sync);
      return () => {
        stop();
        const binding = state.get(context);
        if (binding && binding !== "js") binding.cancel();
        state.delete(context);
        reducedToken?.(false);
      };
    },
    render({ context }, p) {
      const binding = nativeState().get(context);
      const handle = context.channels.exclusive(config.property);
      if (context.reduced && config.reducedValue !== undefined) {
        handle.set(config.reducedValue);
        return;
      }
      if (binding && binding !== "js") return; // the browser drives it
      handle.set(fixed(p, 4));
    },
    clear({ context }) {
      context.channels.exclusive(config.property).clear();
    },
  });
}

// --- SP03 scroll progress bar ---------------------------------------------------------------------

export type ScrollProgressOptions = PropertyProgressOptions;

/** SP03: `--neshel-scroll-progress` (0–1) of the page (or `source`) on the element. */
export const scrollProgress = /* @__PURE__ */ propertyProgress<ScrollProgressOptions>({
  id: "scroll/scroll-progress",
  name: "scrollProgress",
  property: "--neshel-scroll-progress",
  reducedMotion: "reduced",
  range: [0, "100%"],
  subject: "none",
});

// --- SP05 pinned scene ----------------------------------------------------------------------------

export type PinnedSceneOptions = PropertyProgressOptions;

/**
 * SP05: `--neshel-scene-progress` (0–1) over the pinned span of a tall section (`contain` range: from its
 * top reaching the viewport top to its bottom reaching the viewport bottom). Pinning itself is CSS sticky
 * (`.neshel-scene-stage`). Reduced motion keeps the variable and adds the `scene` token to
 * `data-neshel-fx-reduced` so decor can freeze.
 */
export const pinnedScene = /* @__PURE__ */ propertyProgress<PinnedSceneOptions>({
  id: "scroll/pinned-scene",
  name: "pinnedScene",
  property: "--neshel-scene-progress",
  reducedMotion: "static",
  range: ["contain 0%", "contain 100%"],
  subject: "element",
  token: "scene",
});

// --- SP06 image parallax inside a frame -----------------------------------------------------------

export interface ImageParallaxOptions extends ProgressOptions {
  /** Travel each way in px (0–400, default 48). The media is scaled to keep the frame covered. */
  amount?: number;
  /** The clipping frame (default: the element's parent). */
  frame?: Element;
}

export const imageParallax = /* @__PURE__ */ progressEffect<
  ImageParallaxOptions,
  { amount: number; frame: Element | undefined }
>({
  id: "scroll/image-parallax",
  name: "imageParallax",
  channels: [{ channel: "transform", mode: "compose" }],
  reducedMotion: "static",
  range: ["cover 0%", "cover 100%"],
  subject: (element, extra) => extra.frame ?? element.parentElement ?? element,
  resolve: (o, v) => {
    if (o.frame !== undefined && (typeof o.frame !== "object" || !("nodeType" in o.frame))) {
      v.fail('"frame" must be an element.');
    }
    return { amount: v.number("amount", o.amount, 48, 0, 400), frame: o.frame };
  },
  render({ context, extra, timeline }, p) {
    const size = timeline.geometry.subjectSize;
    if (extra.amount === 0 || size <= 0) {
      context.channels.transform.clear();
      return;
    }
    context.channels.transform.set({
      translateY: roundTo((0.5 - p) * 2 * extra.amount),
      scale: roundTo((size + 2 * extra.amount) / size, 4),
    });
  },
  clear: ({ context }) => context.channels.transform.clear(),
});

// --- SP07 zoom on scroll --------------------------------------------------------------------------

export interface ZoomOnScrollOptions extends ProgressOptions {
  /** Scale at progress 0 (0.1–5, default 1). */
  from?: number;
  /** Scale at progress 1 (0.1–5, default 1.2). */
  to?: number;
  easing?: Easing | EasingPreset;
}

export const zoomOnScroll = /* @__PURE__ */ progressEffect<
  ZoomOnScrollOptions,
  { from: number; to: number; easing: Easing }
>({
  id: "scroll/zoom-on-scroll",
  name: "zoomOnScroll",
  channels: [{ channel: "transform", mode: "compose" }],
  reducedMotion: "static",
  range: ["cover 0%", "cover 100%"],
  resolve: (o, v) => ({
    from: v.number("from", o.from, 1, 0.1, 5),
    to: v.number("to", o.to, 1.2, 0.1, 5),
    easing: v.easing(o.easing, "linear"),
  }),
  render({ context, extra }, p) {
    const scale = roundTo(mix(extra.from, extra.to, extra.easing(p)), 4);
    if (scale === 1) context.channels.transform.clear();
    else context.channels.transform.set({ scale });
  },
  clear: ({ context }) => context.channels.transform.clear(),
});

// --- SP08 scroll-linked colour / theme shift ------------------------------------------------------

export interface ScrollColorShiftOptions extends ProgressOptions {
  /** Two or more CSS colours (at most 8). */
  stops: readonly string[];
  /** Interpolation space of `color-mix()` (default `"oklab"`). */
  space?: "oklab" | "oklch" | "srgb";
  /** Optional theme names (one per stop) written to `data-neshel-theme` on `themeTarget`. */
  themes?: readonly string[];
  /** Element receiving `data-neshel-theme` (default: the element). */
  themeTarget?: Element;
}

interface ColorExtra {
  stops: string[];
  space: string;
  themes: string[] | undefined;
  themeTarget: Element | undefined;
}

const themeWriters = /* @__PURE__ */ new WeakMap<object, ReturnType<typeof attributeWriter>>();

/** Colour at progress `p` between stops (stepped when `step`). */
export function colorAt(stops: readonly string[], space: string, p: number, step: boolean): string {
  const segments = stops.length - 1;
  const position = clamp(p, 0, 1) * segments;
  if (step) return stops[Math.round(position)] as string;
  const index = Math.min(segments - 1, Math.floor(position));
  const local = position - index;
  const a = stops[index] as string;
  const b = stops[index + 1] as string;
  if (local <= 0.0005) return a;
  if (local >= 0.9995) return b;
  return `color-mix(in ${space}, ${a}, ${b} ${fixed(local * 100, 2)}%)`;
}

export const scrollColorShift = /* @__PURE__ */ progressEffect<ScrollColorShiftOptions, ColorExtra>(
  {
    id: "scroll/color-shift",
    name: "scrollColorShift",
    channels: [{ channel: "--neshel-scroll-color", mode: "exclusive" }],
    reducedMotion: "instant",
    range: ["cover 0%", "cover 100%"],
    resolve(o, v) {
      if (!Array.isArray(o.stops) || o.stops.length < 2 || o.stops.length > 8) {
        v.fail('"stops" must be 2–8 CSS colours.');
      }
      const stops = (o.stops as string[]).map((stop, index) => v.css(`stops[${index}]`, stop, ""));
      let themes: string[] | undefined;
      if (o.themes !== undefined) {
        if (!Array.isArray(o.themes) || o.themes.length !== stops.length) {
          v.fail('"themes" must have one name per stop.');
        }
        themes = (o.themes as string[]).map((theme, index) => {
          if (typeof theme !== "string" || !/^[a-z0-9][a-z0-9-]*$/i.test(theme)) {
            v.fail(`invalid theme name ${JSON.stringify(theme)} at themes[${index}].`);
          }
          return theme;
        });
      }
      if (
        o.themeTarget !== undefined &&
        (typeof o.themeTarget !== "object" || !("nodeType" in o.themeTarget))
      ) {
        v.fail('"themeTarget" must be an element.');
      }
      return {
        stops,
        space: v.oneOf("space", o.space, ["oklab", "oklch", "srgb"] as const, "oklab"),
        themes,
        themeTarget: o.themeTarget,
      };
    },
    start({ context }) {
      return () => {
        themeWriters.get(context)?.restore();
        themeWriters.delete(context);
      };
    },
    render({ context, extra }, p) {
      const step = context.reduced;
      context.channels
        .exclusive("--neshel-scroll-color")
        .set(colorAt(extra.stops, extra.space, p, step));
      if (extra.themes) {
        const target = extra.themeTarget ?? context.element;
        let writer = themeWriters.get(context);
        if (!writer) {
          writer = attributeWriter(target, "data-neshel-theme");
          themeWriters.set(context, writer);
        }
        const index = Math.round(clamp(p, 0, 1) * (extra.themes.length - 1));
        writer.set(extra.themes[index] as string);
      }
    },
    clear({ context }) {
      context.channels.exclusive("--neshel-scroll-color").clear();
    },
  },
);

// --- SP09 sticky stacking cards -------------------------------------------------------------------

export interface StickyStackOptions extends ProgressOptions {
  /** Scale removed from a fully covered card (0–0.5, default 0.05; 0 = CSS-only stacking). */
  scale?: number;
}

interface StackItemOptions {
  index: number;
  count: number;
  scale: number;
  reducedMotion: ReducedMotion;
}

/** Covered-card scale writers of mounted stack items (through each child's own attachment). */
const stackItem = /* @__PURE__ */ defineEffect<StackItemOptions, StackItemOptions>({
  id: "scroll/stack-item",
  family: "scroll",
  channels: [
    { channel: "transform", mode: "compose" },
    { channel: "--neshel-stack-index", mode: "exclusive" },
  ],
  reducedMotion: "static",
  resolve: (options) => options as StackItemOptions,
  policy: (options) => options.reducedMotion,
  setup(context) {
    let o = context.options;
    const index = context.channels.exclusive("--neshel-stack-index");
    index.set(String(o.index));
    let lastScale = 1;
    childScale.set(context.element, (scale) => {
      if (scale === lastScale) return;
      lastScale = scale;
      if (scale === 1) context.channels.transform.clear();
      else context.channels.transform.set({ scale });
    });
    return {
      update(next) {
        o = next;
        index.set(String(o.index));
      },
      destroy() {
        childScale.delete(context.element);
        index.clear();
        context.channels.transform.clear();
      },
    };
  },
});

/** Scale of a card `index` of `count` at stack progress `p` (equal-slot model, documented). */
export function coveredScale(index: number, count: number, p: number, scale: number): number {
  if (index >= count - 1 || scale === 0) return 1;
  const covered = clamp(p * (count - 1) - index, 0, 1);
  return 1 - scale * covered;
}

type StackDraw = DrawContext<{ scale: number }>;
const stackHandles = /* @__PURE__ */ new WeakMap<object, EffectHandle<StackItemOptions>[]>();

/**
 * SP09: attached to a container whose element children are the cards. Each child gets
 * `--neshel-stack-index` (scroll.css offsets its sticky `top`) and, unless `scale: 0`, a covered-card
 * scale layer driven by the container's `contain` progress (exact for equal-height cards). Without
 * JavaScript `<StickyStack>` renders the index inline, so stacking works from the server markup.
 */
export const stickyStack = /* @__PURE__ */ progressEffect<StickyStackOptions, { scale: number }>({
  id: "scroll/sticky-stack",
  name: "stickyStack",
  channels: [],
  reducedMotion: "static",
  range: ["contain 0%", "contain 100%"],
  resolve: (o, v) => ({ scale: v.number("scale", o.scale, 0.05, 0, 0.5) }),
  start({ context, extra }) {
    const children = [...context.element.children].filter(
      (child): child is HTMLElement => "style" in child,
    );
    const handles = children.map((child, index) =>
      attachEffect(child, stackItem, {
        index,
        count: children.length,
        scale: extra.scale,
        reducedMotion: context.options.reducedMotion,
      }),
    );
    stackHandles.set(context, handles);
    return () => {
      for (const handle of handles) handle.destroy();
      stackHandles.delete(context);
    };
  },
  render(draw: StackDraw, p) {
    const children = [...draw.context.element.children] as HTMLElement[];
    const count = children.length;
    // Covered-card scale goes through each child's own host (its stack-item attachment declared it).
    children.forEach((child, index) => {
      const s = roundTo(coveredScale(index, count, p, draw.extra.scale), 4);
      writeChildScale(child, s);
    });
  },
  clear(draw: StackDraw) {
    for (const child of [...draw.context.element.children] as HTMLElement[])
      writeChildScale(child, 1);
  },
});

const childScale = /* @__PURE__ */ new WeakMap<Element, (scale: number) => void>();
function writeChildScale(child: Element, scale: number): void {
  childScale.get(child)?.(scale);
}

// --- SP11 scroll-velocity skew --------------------------------------------------------------------

export interface VelocitySkewOptions {
  /** Degrees per px/s (0–0.05, default 0.003). */
  factor?: number;
  /** Maximum skew in degrees (0–30, default 8). */
  max?: number;
  axis?: "x" | "y";
  source?: Element | Window | null;
  spring?: SpringOptions;
  reducedMotion?: ReducedMotion;
}

interface ResolvedSkew {
  factor: number;
  max: number;
  axis: "x" | "y";
  source: Element | Window | null | undefined;
  spring: Required<SpringOptions>;
  reducedMotion: ReducedMotion;
}

const skewValidator = /* @__PURE__ */ validator("velocitySkew");

export const velocitySkew = /* @__PURE__ */ defineEffect<VelocitySkewOptions, ResolvedSkew>({
  id: "scroll/velocity-skew",
  family: "scroll",
  channels: [{ channel: "transform", mode: "compose" }],
  reducedMotion: "off",
  resolve(input) {
    const v = skewValidator;
    const o = v.options(input);
    return {
      factor: v.number("factor", o.factor, 0.003, 0, 0.05),
      max: v.number("max", o.max, 8, 0, 30),
      axis: v.oneOf("axis", o.axis, ["x", "y"] as const, "y"),
      source: o.source,
      spring: v.spring(o.spring, { stiffness: 260, damping: 30 }),
      reducedMotion: v.reducedMotion(o.reducedMotion),
    };
  },
  policy: (options) => options.reducedMotion,
  setup(context) {
    let o = context.options;
    let source = getScrollSource(normaliseSource(o.source));
    const rig = createSpringRig(context.scheduler, { skew: 0 }, o.spring, ({ skew }, settled) => {
      const value = settled ? 0 : roundTo(skew, 2);
      if (Math.abs(value) < 0.01) context.channels.transform.clear();
      else context.channels.transform.set(o.axis === "y" ? { skewY: value } : { skewX: value });
    });
    const onScroll = () => {
      if (context.reduced) return;
      const velocity = source.velocity.block;
      rig.to({ skew: clamp(-velocity * o.factor, -o.max, o.max) });
    };
    let unsubscribe = source.subscribe(onScroll);
    const stopReduced = context.onReducedChange((reduced) => {
      if (reduced) {
        rig.set({ skew: 0 });
        rig.stop();
        context.channels.transform.clear();
      }
    });
    return {
      update(next) {
        const sourceChanged = next.source !== o.source;
        o = next;
        rig.setSpring(o.spring);
        if (sourceChanged) {
          unsubscribe();
          source = getScrollSource(normaliseSource(o.source));
          unsubscribe = source.subscribe(onScroll);
        }
      },
      destroy() {
        unsubscribe();
        stopReduced();
        rig.stop();
        context.channels.transform.clear();
      },
    };
  },
});

export type { ScrollProgress };
