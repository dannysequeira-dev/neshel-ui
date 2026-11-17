/**
 * Hover & Pointer effects H01, H02 and H04–H10 (catalogue §2; contracts/effects-010.md §2). H03 is Tilt3D
 * (unchanged, `./tilt`). Every effect writes the consumer's element only through its motion host:
 * `transform` layers (compose with Tilt3D, entrances and presses) or namespaced `--neshel-<effect>-*`
 * custom properties (exclusive channels, restored on release) that the opt-in `hover.css` renders on the
 * package's own `::before` decor layer or `::after` ring layer. No CSS transition or animation is ever
 * declared on the consumer's element.
 */
import { animateValue, type MotionControl } from "../core/controls.js";
import { type ChannelClaim, defineEffect, type EffectContext } from "../core/effect.js";
import { getMotionHost } from "../core/host.js";
import { clamp } from "../core/interpolate.js";
import { motionValue } from "../core/motion-value.js";
import { FX_REDUCED_ATTRIBUTE, toggleToken } from "../core/tokens.js";
import { validator } from "../core/validate.js";
import {
  createHoverDriver,
  fixed,
  type HoverOptions,
  propertyWriter,
  type ResolvedHover,
  resolveHover,
} from "./shared.js";

const exclusive = (...channels: `--neshel-${string}`[]): ChannelClaim[] =>
  channels.map((channel) => ({ channel, mode: "exclusive" as const }));
const TRANSFORM: ChannelClaim = { channel: "transform", mode: "compose" };
const near = (value: number, target: number) => Math.abs(value - target) < 5e-4;

/** Write `value` when it differs from `fallback`, else clear (CSS fallbacks keep the default). */
function param(context: EffectContext<unknown>, channel: `--neshel-${string}`) {
  const write = propertyWriter(context.channels.exclusive(channel));
  return (value: string, fallback: string) => write(value === fallback ? undefined : value);
}

/* ------------------------------------------------------------------------------------------------ */
/** H01 — Lift: translate up (transform layer) plus a shadow on the decor layer. */
export interface LiftOptions extends HoverOptions {
  /** Lift distance in px (0–40, default 4). */
  distance?: number;
  /** Scale while lifted (1–1.2, default 1). */
  scale?: number;
  /** Render the lift shadow on the decor layer (default true; needs hover.css). */
  shadow?: boolean;
}
interface ResolvedLift extends ResolvedHover {
  distance: number;
  scale: number;
  shadow: boolean;
}
const liftV = /* @__PURE__ */ validator("lift");
export const lift = /* @__PURE__ */ defineEffect<LiftOptions, ResolvedLift>({
  id: "hover/lift",
  family: "hover",
  channels: [TRANSFORM, ...exclusive("--neshel-lift-progress")],
  priority: 0,
  reducedMotion: "static",
  resolve(input) {
    const o = liftV.options(input);
    return {
      ...resolveHover(o, liftV),
      distance: liftV.number("distance", o.distance, 4, 0, 40),
      scale: liftV.number("scale", o.scale, 1, 1, 1.2),
      shadow: liftV.flag("shadow", o.shadow, true),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const progress = propertyWriter(context.channels.exclusive("--neshel-lift-progress"));
    const driver = createHoverDriver(context, {
      token: "lift",
      decor: true,
      rest: { p: 0 },
      target: () => ({ p: 1 }),
      render({ p }, o, reduced) {
        if (reduced || near(p, 0)) context.channels.transform.clear();
        else
          context.channels.transform.set({
            translateY: -o.distance * p,
            scale: 1 + (o.scale - 1) * p,
          });
        progress(o.shadow && !near(p, 0) ? fixed(p) : undefined);
      },
    });
    return { update: () => driver.refresh(), destroy: () => driver.destroy() };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** H02 — Glow / ring: a soft ring and glow on the decor layer (additive; never replaces focus styles). */
export interface GlowOptions extends HoverOptions {
  /** Glow colour (CSS colour; default the theme ring colour or indigo). */
  color?: string;
  /** Ring spread in px (0–16, default 3). */
  size?: number;
  /** Glow blur in px (0–64, default 16). */
  blur?: number;
}
interface ResolvedGlow extends ResolvedHover {
  color: string;
  size: number;
  blur: number;
}
const GLOW_COLOR = "var(--neshel-ring, #6366f1)";
const glowV = /* @__PURE__ */ validator("glow");
export const glow = /* @__PURE__ */ defineEffect<GlowOptions, ResolvedGlow>({
  id: "hover/glow",
  family: "hover",
  channels: exclusive(
    "--neshel-glow-progress",
    "--neshel-glow-color",
    "--neshel-glow-size",
    "--neshel-glow-blur",
  ),
  priority: 0,
  reducedMotion: "static",
  resolve(input) {
    const o = glowV.options(input);
    return {
      ...resolveHover(o, glowV),
      color: glowV.css("color", o.color, GLOW_COLOR),
      size: glowV.number("size", o.size, 3, 0, 16),
      blur: glowV.number("blur", o.blur, 16, 0, 64),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const progress = propertyWriter(context.channels.exclusive("--neshel-glow-progress"));
    const color = param(context, "--neshel-glow-color");
    const size = param(context, "--neshel-glow-size");
    const blur = param(context, "--neshel-glow-blur");
    const params = () => {
      const o = context.options;
      color(o.color, GLOW_COLOR);
      size(`${o.size}px`, "3px");
      blur(`${o.blur}px`, "16px");
    };
    params();
    const driver = createHoverDriver(context, {
      token: "glow",
      decor: true,
      rest: { p: 0 },
      target: () => ({ p: 1 }),
      render: ({ p }) => progress(near(p, 0) ? undefined : fixed(p)),
    });
    return {
      update() {
        params();
        driver.refresh();
      },
      destroy: () => driver.destroy(),
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** H04 — Magnetic pull: the element follows the pointer a little (transform layer, spring). */
export interface MagneticOptions extends HoverOptions {
  /** Share of the pointer offset followed (0–1, default 0.35). */
  strength?: number;
  /** Largest displacement in px (0–64, default 12). */
  max?: number;
}
interface ResolvedMagnetic extends ResolvedHover {
  strength: number;
  max: number;
}
const magneticV = /* @__PURE__ */ validator("magnetic");
export const magnetic = /* @__PURE__ */ defineEffect<MagneticOptions, ResolvedMagnetic>({
  id: "hover/magnetic",
  family: "hover",
  channels: [TRANSFORM],
  priority: 0,
  reducedMotion: "off",
  resolve(input) {
    const o = magneticV.options(input);
    return {
      ...resolveHover(o, magneticV, { stiffness: 220, damping: 18 }),
      strength: magneticV.number("strength", o.strength, 0.35, 0, 1),
      max: magneticV.number("max", o.max, 12, 0, 64),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    let pull = { x: 0, y: 0 };
    const driver = createHoverDriver(context, {
      token: "magnetic",
      focus: false,
      rest: { x: 0, y: 0 },
      target: (_o, reduced) => (reduced ? {} : pull),
      onMove(sample, o, reduced) {
        if (reduced) return;
        pull = {
          x: clamp(sample.x * (sample.width / 2) * o.strength, -o.max, o.max),
          y: clamp(sample.y * (sample.height / 2) * o.strength, -o.max, o.max),
        };
        driver.rig.to(pull);
      },
      onActiveChange(active) {
        if (!active) pull = { x: 0, y: 0 };
      },
      render({ x, y }, _o, reduced) {
        if (reduced || (near(x, 0) && near(y, 0))) context.channels.transform.clear();
        else context.channels.transform.set({ translateX: x, translateY: y });
      },
    });
    return { update: () => driver.refresh(), destroy: () => driver.destroy() };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** H05 — Spotlight: a radial highlight that follows the pointer on the decor layer. */
export interface SpotlightOptions extends HoverOptions {
  /** Highlight colour (default white). */
  color?: string;
  /** Radius in px (40–1000, default 240). */
  size?: number;
  /** Strength of the highlight (0–1, default 0.22). */
  intensity?: number;
}
interface ResolvedSpotlight extends ResolvedHover {
  color: string;
  size: number;
  intensity: number;
}
const spotlightV = /* @__PURE__ */ validator("spotlight");
export const spotlight = /* @__PURE__ */ defineEffect<SpotlightOptions, ResolvedSpotlight>({
  id: "hover/spotlight",
  family: "hover",
  channels: exclusive(
    "--neshel-spotlight-progress",
    "--neshel-spotlight-x",
    "--neshel-spotlight-y",
    "--neshel-spotlight-color",
    "--neshel-spotlight-size",
    "--neshel-spotlight-intensity",
  ),
  priority: 0,
  reducedMotion: "static",
  resolve(input) {
    const o = spotlightV.options(input);
    return {
      ...resolveHover(o, spotlightV),
      color: spotlightV.css("color", o.color, "#fff"),
      size: spotlightV.number("size", o.size, 240, 40, 1000),
      intensity: spotlightV.number("intensity", o.intensity, 0.22, 0, 1),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const progress = propertyWriter(context.channels.exclusive("--neshel-spotlight-progress"));
    const x = propertyWriter(context.channels.exclusive("--neshel-spotlight-x"));
    const y = propertyWriter(context.channels.exclusive("--neshel-spotlight-y"));
    const color = param(context, "--neshel-spotlight-color");
    const size = param(context, "--neshel-spotlight-size");
    const intensity = param(context, "--neshel-spotlight-intensity");
    const params = () => {
      const o = context.options;
      color(o.color, "#fff");
      size(`${o.size}px`, "240px");
      intensity(`${Math.round(o.intensity * 100)}%`, "22%");
    };
    params();
    let active = false;
    const driver = createHoverDriver(context, {
      token: "spotlight",
      decor: true,
      rest: { p: 0 },
      target: () => ({ p: 1 }),
      onMove(sample, _o, reduced) {
        // Reduced motion: a static highlight at the centre (the follow is motion).
        if (reduced) return;
        x(`${Math.round(sample.left)}px`);
        y(`${Math.round(sample.top)}px`);
      },
      onActiveChange(next, _o, reduced) {
        active = next;
        if (reduced) {
          x(undefined);
          y(undefined);
        }
      },
      render({ p }) {
        progress(near(p, 0) ? undefined : fixed(p));
        // Keep the last position while fading out; drop it once invisible.
        if (near(p, 0) && !active) {
          x(undefined);
          y(undefined);
        }
      },
    });
    return {
      update() {
        params();
        driver.refresh();
      },
      destroy: () => driver.destroy(),
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** H06 — Border gradient sweep: a rotating conic gradient ring on the `::after` layer. */
export interface BorderSweepOptions extends HoverOptions {
  /** Ring width in px (1–8, default 2). */
  width?: number;
  /** Two gradient colours (default indigo and pink). */
  colors?: readonly [string, string];
  /** Duration of one turn in ms (500–20000, default 3000). */
  duration?: number;
}
interface ResolvedBorderSweep extends ResolvedHover {
  width: number;
  colors: readonly [string, string];
  duration: number;
}
const SWEEP_COLORS = ["#6366f1", "#ec4899"] as const;
const sweepV = /* @__PURE__ */ validator("borderSweep");
export const borderSweep = /* @__PURE__ */ defineEffect<BorderSweepOptions, ResolvedBorderSweep>({
  id: "hover/border-sweep",
  family: "hover",
  // `--neshel-layer-after` is a sentinel claim: this effect owns the host's `::after` layer.
  channels: exclusive(
    "--neshel-layer-after",
    "--neshel-sweep-progress",
    "--neshel-sweep-width",
    "--neshel-sweep-color-a",
    "--neshel-sweep-color-b",
    "--neshel-sweep-duration",
  ),
  priority: 0,
  reducedMotion: "static",
  resolve(input) {
    const o = sweepV.options(input);
    const colors = o.colors ?? SWEEP_COLORS;
    if (!Array.isArray(colors) || colors.length !== 2)
      sweepV.fail('"colors" must be two CSS colours.');
    return {
      ...resolveHover(o, sweepV),
      width: sweepV.number("width", o.width, 2, 1, 8),
      colors: [
        sweepV.css("colors", colors[0], SWEEP_COLORS[0]),
        sweepV.css("colors", colors[1], SWEEP_COLORS[1]),
      ],
      duration: sweepV.number("duration", o.duration, 3000, 500, 20_000),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const progress = propertyWriter(context.channels.exclusive("--neshel-sweep-progress"));
    const width = param(context, "--neshel-sweep-width");
    const colorA = param(context, "--neshel-sweep-color-a");
    const colorB = param(context, "--neshel-sweep-color-b");
    const duration = param(context, "--neshel-sweep-duration");
    const params = () => {
      const o = context.options;
      width(`${o.width}px`, "2px");
      colorA(o.colors[0], SWEEP_COLORS[0]);
      colorB(o.colors[1], SWEEP_COLORS[1]);
      duration(`${o.duration}ms`, "3000ms");
    };
    params();
    const reducedToken = toggleToken(context.element, FX_REDUCED_ATTRIBUTE, "border-sweep");
    reducedToken(context.reduced);
    const unsubscribe = context.onReducedChange(reducedToken);
    const driver = createHoverDriver(context, {
      token: "border-sweep",
      activeToken: true,
      rest: { p: 0 },
      target: () => ({ p: 1 }),
      render: ({ p }) => progress(near(p, 0) ? undefined : fixed(p)),
    });
    return {
      update() {
        params();
        driver.refresh();
      },
      destroy() {
        unsubscribe();
        reducedToken(false);
        driver.destroy();
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** H07 — Underline grow: a bar that grows along the bottom edge (decor layer). */
export interface UnderlineOptions extends HoverOptions {
  /** Bar thickness in px (1–8, default 2). */
  thickness?: number;
  /** Bar colour (default `currentColor`). */
  color?: string;
  /** Where the bar grows from (default `"left"`; logical start/end are not mirrored in RTL). */
  origin?: "left" | "center" | "right";
}
interface ResolvedUnderline extends ResolvedHover {
  thickness: number;
  color: string;
  origin: "left" | "center" | "right";
}
const ORIGINS = { left: "0%", center: "50%", right: "100%" } as const;
const underlineV = /* @__PURE__ */ validator("underline");
export const underline = /* @__PURE__ */ defineEffect<UnderlineOptions, ResolvedUnderline>({
  id: "hover/underline",
  family: "hover",
  channels: exclusive(
    "--neshel-underline-progress",
    "--neshel-underline-thickness",
    "--neshel-underline-color",
    "--neshel-underline-origin",
  ),
  priority: 0,
  reducedMotion: "instant",
  resolve(input) {
    const o = underlineV.options(input);
    return {
      ...resolveHover(o, underlineV),
      thickness: underlineV.number("thickness", o.thickness, 2, 1, 8),
      color: underlineV.css("color", o.color, "currentColor"),
      origin: underlineV.oneOf("origin", o.origin, ["left", "center", "right"] as const, "left"),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const progress = propertyWriter(context.channels.exclusive("--neshel-underline-progress"));
    const thickness = param(context, "--neshel-underline-thickness");
    const color = param(context, "--neshel-underline-color");
    const origin = param(context, "--neshel-underline-origin");
    const params = () => {
      const o = context.options;
      thickness(`${o.thickness}px`, "2px");
      color(o.color, "currentColor");
      origin(ORIGINS[o.origin], "0%");
    };
    params();
    const driver = createHoverDriver(context, {
      token: "underline",
      decor: true,
      rest: { p: 0 },
      target: () => ({ p: 1 }),
      render: ({ p }) => progress(near(p, 0) ? undefined : fixed(p)),
    });
    return {
      update() {
        params();
        driver.refresh();
      },
      destroy: () => driver.destroy(),
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** H08 — Media zoom inside frame: the frame clips; its media child scales (child transform layer). */
export interface MediaZoomOptions extends HoverOptions {
  /** Zoom factor (1–2, default 1.08). */
  scale?: number;
}
interface ResolvedMediaZoom extends ResolvedHover {
  scale: number;
}
const mediaV = /* @__PURE__ */ validator("mediaZoom");
export const mediaZoom = /* @__PURE__ */ defineEffect<MediaZoomOptions, ResolvedMediaZoom>({
  id: "hover/media-zoom",
  family: "hover",
  // The frame's own channels are untouched; the media child is written through ITS motion host.
  channels: [],
  priority: 0,
  reducedMotion: "static",
  resolve(input) {
    const o = mediaV.options(input);
    return {
      ...resolveHover(o, mediaV, "gentle"),
      scale: mediaV.number("scale", o.scale, 1.08, 1, 2),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const key = Symbol("hover/media-zoom");
    const media = () =>
      (context.element.querySelector("[data-neshel-media]") ?? context.element.firstElementChild) as
        | (Element & { style: CSSStyleDeclaration })
        | null;
    let target = media();
    const driver = createHoverDriver(context, {
      token: "media-zoom",
      rest: { p: 0 },
      target: () => ({ p: 1 }),
      render({ p }, o, reduced) {
        if (!target || !("style" in target)) return;
        const host = getMotionHost(target);
        if (reduced || near(p, 0)) host.setLayer(key, undefined);
        else host.setLayer(key, { scale: 1 + (o.scale - 1) * p });
      },
    });
    return {
      update() {
        const next = media();
        if (next !== target && target) getMotionHost(target).setLayer(key, undefined);
        target = next;
        driver.refresh();
      },
      destroy() {
        driver.destroy();
        if (target) getMotionHost(target).setLayer(key, undefined);
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** H09 — Pointer parallax layers: children with `data-neshel-depth` move by depth (transform layers). */
export interface ParallaxOptions extends HoverOptions {
  /** Displacement in px at depth 1 and the box edge (0–100, default 16). */
  strength?: number;
}
interface ResolvedParallax extends ResolvedHover {
  strength: number;
}
const parallaxV = /* @__PURE__ */ validator("parallax");
export const parallax = /* @__PURE__ */ defineEffect<ParallaxOptions, ResolvedParallax>({
  id: "hover/parallax",
  family: "hover",
  channels: [],
  priority: 0,
  reducedMotion: "off",
  resolve(input) {
    const o = parallaxV.options(input);
    return {
      ...resolveHover(o, parallaxV, "gentle"),
      strength: parallaxV.number("strength", o.strength, 16, 0, 100),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const key = Symbol("hover/parallax");
    let layers: Array<{ element: Element & { style: CSSStyleDeclaration }; depth: number }> = [];
    const collect = () => {
      for (const layer of layers) getMotionHost(layer.element).setLayer(key, undefined);
      layers = [...context.element.querySelectorAll("[data-neshel-depth]")].flatMap((element) => {
        const depth = Number(element.getAttribute("data-neshel-depth"));
        return "style" in element && Number.isFinite(depth)
          ? [
              {
                element: element as Element & { style: CSSStyleDeclaration },
                depth: clamp(depth, -2, 2),
              },
            ]
          : [];
      });
    };
    collect();
    let pull = { x: 0, y: 0 };
    const driver = createHoverDriver(context, {
      token: "parallax",
      focus: false,
      rest: { x: 0, y: 0 },
      target: (_o, reduced) => (reduced ? {} : pull),
      onMove(sample, _o, reduced) {
        if (reduced) return;
        pull = { x: sample.x, y: sample.y };
        driver.rig.to(pull);
      },
      onActiveChange(active) {
        if (!active) pull = { x: 0, y: 0 };
      },
      render({ x, y }, o, reduced) {
        const rest = reduced || (near(x, 0) && near(y, 0));
        for (const layer of layers) {
          const host = getMotionHost(layer.element);
          if (rest) host.setLayer(key, undefined);
          else
            host.setLayer(key, {
              translateX: -x * o.strength * layer.depth,
              translateY: -y * o.strength * layer.depth,
            });
        }
      },
    });
    return {
      update() {
        collect();
        driver.refresh();
      },
      destroy() {
        driver.destroy();
        for (const layer of layers) getMotionHost(layer.element).setLayer(key, undefined);
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** H10 — Shine / glare sweep: one highlight sweep across the decor layer on each activation. */
export interface ShineOptions extends Omit<HoverOptions, "spring"> {
  /** Highlight colour (default translucent white). */
  color?: string;
  /** Gradient angle in degrees (0–360, default 110). */
  angle?: number;
  /** Sweep duration in ms (100–5000, default 700). */
  duration?: number;
}
interface ResolvedShine extends ResolvedHover {
  color: string;
  angle: number;
  duration: number;
}
const SHINE_COLOR = "rgb(255 255 255 / 0.45)";
const shineV = /* @__PURE__ */ validator("shine");
export const shine = /* @__PURE__ */ defineEffect<ShineOptions, ResolvedShine>({
  id: "hover/shine",
  family: "hover",
  channels: exclusive("--neshel-shine-progress", "--neshel-shine-color", "--neshel-shine-angle"),
  priority: 0,
  reducedMotion: "static",
  resolve(input) {
    const o = shineV.options(input);
    return {
      ...resolveHover(o, shineV),
      color: shineV.css("color", o.color, SHINE_COLOR),
      angle: shineV.number("angle", o.angle, 110, 0, 360),
      duration: shineV.number("duration", o.duration, 700, 100, 5000),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const progress = propertyWriter(context.channels.exclusive("--neshel-shine-progress"));
    const color = param(context, "--neshel-shine-color");
    const angle = param(context, "--neshel-shine-angle");
    const params = () => {
      color(context.options.color, SHINE_COLOR);
      angle(`${context.options.angle}deg`, "110deg");
    };
    params();
    const value = motionValue(0);
    const unsubscribe = value.subscribe((p) => progress(p <= 0 || p >= 1 ? undefined : fixed(p)));
    let control: MotionControl | undefined;
    const driver = createHoverDriver(context, {
      token: "shine",
      decor: true,
      rest: {},
      target: () => ({}),
      onActiveChange(active, o, reduced) {
        if (!active || reduced) return;
        control?.cancel();
        value.set(0);
        control = animateValue(
          value,
          1,
          { type: "tween", duration: o.duration, easing: "standard" },
          { reducedMotion: "never" },
        );
      },
      render: () => {},
    });
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (reduced) {
        control?.cancel();
        value.set(0);
      }
    });
    return {
      update() {
        params();
        driver.refresh();
      },
      destroy() {
        control?.cancel();
        unsubscribe();
        unsubscribeReduced();
        driver.destroy();
        progress(undefined);
      },
    };
  },
});
