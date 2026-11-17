/**
 * Press & Microinteraction effects P01–P03 and P06–P08 (catalogue §3; contracts/effects-010.md §3).
 *
 * - P01, P03, P07, P08 animate the consumer's element only through `transform` layers of its motion host
 *   (they compose with Tilt3D, hover and entrance layers, and with each other).
 * - P02 and P06 animate transient, package-owned layer elements with WAAPI (aria-hidden, no pointer
 *   events, removed when done); the host's own styles are never touched.
 * Triggered effects (burst, shake, nudge) play when their `trigger` option changes after attachment.
 */
import { animateValue, type MotionControl } from "../core/controls.js";
import type { SpringPreset } from "../core/defaults.js";
import { describeElement, devWarnOnce, elementKey } from "../core/dev.js";
import { toCssEasing } from "../core/easing.js";
import { type ChannelClaim, defineEffect, type EffectContext } from "../core/effect.js";
import { isDisabled, pageHidden, watchPress, watchVisibility } from "../core/interaction.js";
import { motionValue } from "../core/motion-value.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import { createSpringRig } from "../core/springs.js";
import { addToken, FX_ATTRIBUTE } from "../core/tokens.js";
import { type Validator, validator } from "../core/validate.js";

declare const process: { env: { NODE_ENV?: string } } | undefined;

const TRANSFORM: ChannelClaim = { channel: "transform", mode: "compose" };
const near = (value: number, target: number) => Math.abs(value - target) < 5e-4;
const VOID_ELEMENTS = new Set([
  "AREA",
  "BR",
  "COL",
  "EMBED",
  "HR",
  "IMG",
  "INPUT",
  "LINK",
  "META",
  "SOURCE",
  "TRACK",
  "WBR",
  "TEXTAREA",
  "SELECT",
]);

/** Options shared by press effects. */
export interface PressOptions {
  /** Reduced-motion policy (default `"user"`). */
  reducedMotion?: ReducedMotion;
  /** Turn the effect off. Disabled elements (`:disabled`, `aria-disabled="true"`) never react. */
  disabled?: boolean;
}

interface ResolvedPress {
  reducedMotion: ReducedMotion;
  disabled: boolean;
}

const pressCommon = (o: Partial<PressOptions>, v: Validator): ResolvedPress => ({
  reducedMotion: v.reducedMotion(o.reducedMotion),
  disabled: v.flag("disabled", o.disabled, false),
});

/** `trigger` handling: plays when the value changes after attachment. */
export interface TriggerOptions {
  /** Change this value (a counter, a timestamp) to play the effect. The initial value never plays. */
  trigger?: string | number | boolean;
}

/* ------------------------------------------------------------------------------------------------ */
/** P01 — Press scale: shrink while pressed, spring back on release (pointer, Space/Enter). */
export interface PressScaleOptions extends PressOptions {
  /** Scale while pressed (0.5–1, default 0.96). Reduced motion keeps half the amplitude, without spring. */
  scale?: number;
  spring?: SpringOptions | SpringPreset;
}
interface ResolvedPressScale extends ResolvedPress {
  scale: number;
  spring: Required<SpringOptions>;
}
const scaleV = /* @__PURE__ */ validator("pressScale");
export const pressScale = /* @__PURE__ */ defineEffect<PressScaleOptions, ResolvedPressScale>({
  id: "press/scale",
  family: "press",
  channels: [TRANSFORM],
  priority: 0,
  reducedMotion: "reduced",
  resolve(input) {
    const o = scaleV.options(input);
    return {
      ...pressCommon(o, scaleV),
      scale: scaleV.number("scale", o.scale, 0.96, 0.5, 1),
      spring: scaleV.spring(o.spring, { stiffness: 520, damping: 32 }),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const element = context.element as HTMLElement;
    const removeToken = addToken(element, FX_ATTRIBUTE, "press-scale");
    let pressed = false;
    const rig = createSpringRig(context.scheduler, { s: 1 }, context.options.spring, ({ s }) => {
      if (near(s, 1)) context.channels.transform.clear();
      else context.channels.transform.set({ scale: s });
    });
    const apply = () => {
      const o = context.options;
      rig.setSpring(o.spring);
      const amplitude = context.reduced ? (1 - o.scale) / 2 : 1 - o.scale;
      const target = pressed && !o.disabled ? 1 - amplitude : 1;
      if (context.reduced) rig.set({ s: target });
      else rig.to({ s: target });
    };
    const unwatch = watchPress(element, (next) => {
      pressed = next;
      apply();
    });
    const unsubscribe = context.onReducedChange(apply);
    return {
      update: apply,
      destroy() {
        unwatch();
        unsubscribe();
        rig.stop();
        removeToken();
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** P03 — Tap bounce: a springy squash after each activation (click, including keyboard). */
export interface TapBounceOptions extends PressOptions {
  /** Impulse strength (0–1, default 0.3). */
  strength?: number;
  /** Spring (default `"bouncy"`). */
  spring?: SpringOptions | SpringPreset;
}
interface ResolvedTapBounce extends ResolvedPress {
  strength: number;
  spring: Required<SpringOptions>;
}
const bounceV = /* @__PURE__ */ validator("tapBounce");
export const tapBounce = /* @__PURE__ */ defineEffect<TapBounceOptions, ResolvedTapBounce>({
  id: "press/tap-bounce",
  family: "press",
  channels: [TRANSFORM],
  priority: 0,
  reducedMotion: "off",
  resolve(input) {
    const o = bounceV.options(input);
    return {
      ...pressCommon(o, bounceV),
      strength: bounceV.number("strength", o.strength, 0.3, 0, 1),
      spring: bounceV.spring(o.spring, "bouncy"),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const element = context.element as HTMLElement;
    const removeToken = addToken(element, FX_ATTRIBUTE, "tap-bounce");
    const rig = createSpringRig(context.scheduler, { s: 1 }, context.options.spring, ({ s }) => {
      if (near(s, 1)) context.channels.transform.clear();
      else context.channels.transform.set({ scale: s });
    });
    const onClick = () => {
      const o = context.options;
      if (o.disabled || context.reduced || isDisabled(element)) return;
      rig.setSpring(o.spring);
      rig.kick("s", -o.strength * 4);
    };
    element.addEventListener("click", onClick);
    const unsubscribe = context.onReducedChange((reduced) => {
      if (reduced) rig.set({ s: 1 });
    });
    return {
      update: () => rig.setSpring(context.options.spring),
      destroy() {
        element.removeEventListener("click", onClick);
        unsubscribe();
        rig.stop();
        context.channels.transform.clear();
        removeToken();
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
type Animatable = HTMLElement & {
  animate?: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => Animation;
};

/** A package-owned, decorative layer appended to the host (created lazily, removed on destroy). */
function ownedLayer(host: HTMLElement, className: string, overflow: "hidden" | "visible") {
  let layer: HTMLSpanElement | undefined;
  return {
    get(): HTMLSpanElement {
      if (layer?.isConnected) return layer;
      layer = host.ownerDocument.createElement("span");
      layer.className = className;
      layer.setAttribute("aria-hidden", "true");
      layer.setAttribute("inert", "");
      Object.assign(layer.style, {
        position: "absolute",
        inset: "0",
        overflow,
        borderRadius: "inherit",
        pointerEvents: "none",
      });
      host.appendChild(layer);
      return layer;
    },
    removeIfEmpty() {
      if (layer && layer.childElementCount === 0) {
        layer.remove();
        layer = undefined;
      }
    },
    remove() {
      layer?.remove();
      layer = undefined;
    },
  };
}

function canHostLayers(context: EffectContext<unknown>, effect: string): boolean {
  const element = context.element as HTMLElement;
  if (!VOID_ELEMENTS.has(element.tagName)) return true;
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    devWarnOnce(
      `layers:${effect}:${elementKey(element)}`,
      `${effect} needs an element that can contain children; ${describeElement(element)} cannot, so the effect does nothing (wrap it, e.g. a <label> or <span>).`,
    );
  }
  return false;
}

/** P02 — Ripple: an expanding circle from the press point on a clipped, owned layer. */
export interface RippleOptions extends PressOptions {
  /** Ripple colour (default `currentColor`). */
  color?: string;
  /** Ripple opacity (0–1, default 0.22). */
  opacity?: number;
  /** Expansion duration in ms (100–3000, default 550). */
  duration?: number;
}
interface ResolvedRipple extends ResolvedPress {
  color: string;
  opacity: number;
  duration: number;
}
const rippleV = /* @__PURE__ */ validator("ripple");
export const ripple = /* @__PURE__ */ defineEffect<RippleOptions, ResolvedRipple>({
  id: "press/ripple",
  family: "press",
  channels: [],
  priority: 0,
  reducedMotion: "fade",
  resolve(input) {
    const o = rippleV.options(input);
    return {
      ...pressCommon(o, rippleV),
      color: rippleV.css("color", o.color, "currentColor"),
      opacity: rippleV.number("opacity", o.opacity, 0.22, 0, 1),
      duration: rippleV.number("duration", o.duration, 550, 100, 3000),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const element = context.element as HTMLElement;
    if (!canHostLayers(context, "ripple")) return { update() {}, destroy() {} };
    const removeToken = addToken(element, FX_ATTRIBUTE, "ripple");
    const layer = ownedLayer(element, "neshel-ripple-layer", "hidden");
    const live = new Set<{ node: HTMLSpanElement; animations: Animation[] }>();
    let current: { node: HTMLSpanElement; animations: Animation[] } | undefined;
    const easing = toCssEasing("decelerate");

    function drop(entry: { node: HTMLSpanElement; animations: Animation[] }): void {
      for (const animation of entry.animations) animation.cancel();
      entry.node.remove();
      live.delete(entry);
      layer.removeIfEmpty();
    }
    function release(): void {
      const entry = current;
      current = undefined;
      if (!entry) return;
      const fade = (entry.node as Animatable).animate?.(
        [{ opacity: String(context.options.opacity) }, { opacity: "0" }],
        {
          duration: Math.round(context.options.duration * 0.6),
          easing: "linear",
          fill: "forwards",
        },
      );
      if (!fade) {
        drop(entry);
        return;
      }
      entry.animations.push(fade);
      fade.onfinish = () => drop(entry);
    }
    const unwatch = watchPress(element, (pressed, point) => {
      const o = context.options;
      if (!pressed) return release();
      if (o.disabled || !point || typeof (element as Animatable).animate !== "function") return;
      release();
      const radius = Math.hypot(
        Math.max(point.left, point.width - point.left),
        Math.max(point.top, point.height - point.top),
      );
      const node = element.ownerDocument.createElement("span");
      node.className = "neshel-ripple";
      Object.assign(node.style, {
        position: "absolute",
        left: `${point.left - radius}px`,
        top: `${point.top - radius}px`,
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        borderRadius: "50%",
        background: o.color,
        opacity: "0",
        pointerEvents: "none",
      });
      layer.get().appendChild(node);
      const reduced = context.reduced;
      const grow = (node as Animatable).animate?.(
        reduced
          ? [{ opacity: "0" }, { opacity: String(o.opacity) }]
          : [
              { transform: "scale(0)", opacity: String(o.opacity) },
              { transform: "scale(1)", opacity: String(o.opacity) },
            ],
        { duration: reduced ? Math.round(o.duration / 2) : o.duration, easing, fill: "forwards" },
      );
      const entry = { node, animations: grow ? [grow] : [] };
      live.add(entry);
      current = entry;
    });
    return {
      update() {},
      destroy() {
        unwatch();
        for (const entry of [...live]) drop(entry);
        layer.remove();
        removeToken();
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** P06 — Burst: particles radiate from the centre on an owned layer when `trigger` changes. */
export interface BurstOptions extends PressOptions, TriggerOptions {
  /** Number of particles (3–24, default 10). */
  count?: number;
  /** Travel distance in px (8–160, default 34). */
  distance?: number;
  /** Particle size in px (2–16, default 6). */
  size?: number;
  /** Particle colours, cycled (default theme-friendly warm colours). */
  colors?: readonly string[];
  /** Duration in ms (200–3000, default 650). */
  duration?: number;
}
interface ResolvedBurst extends ResolvedPress {
  trigger: string | number | boolean | undefined;
  count: number;
  distance: number;
  size: number;
  colors: readonly string[];
  duration: number;
}
const BURST_COLORS = ["#f43f5e", "#f59e0b", "#6366f1", "#10b981"] as const;
const burstV = /* @__PURE__ */ validator("burst");
export const burst = /* @__PURE__ */ defineEffect<BurstOptions, ResolvedBurst>({
  id: "press/burst",
  family: "press",
  channels: [],
  priority: 0,
  reducedMotion: "static",
  resolve(input) {
    const o = burstV.options(input);
    const colors = o.colors ?? BURST_COLORS;
    if (!Array.isArray(colors) || colors.length === 0)
      burstV.fail('"colors" must be a non-empty array.');
    return {
      ...pressCommon(o, burstV),
      trigger: burstV.key("trigger", o.trigger),
      count: Math.round(burstV.number("count", o.count, 10, 3, 24)),
      distance: burstV.number("distance", o.distance, 34, 8, 160),
      size: burstV.number("size", o.size, 6, 2, 16),
      colors: colors.map((color) => burstV.css("colors", color, BURST_COLORS[0])),
      duration: burstV.number("duration", o.duration, 650, 200, 3000),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const element = context.element as HTMLElement;
    if (!canHostLayers(context, "burst")) return { update() {}, destroy() {} };
    const removeToken = addToken(element, FX_ATTRIBUTE, "burst");
    const layer = ownedLayer(element, "neshel-burst-layer", "visible");
    const live = new Set<Animation>();
    let trigger = context.options.trigger;
    const easing = toCssEasing("decelerate");

    function play(): void {
      const o = context.options;
      if (o.disabled || context.reduced || pageHidden()) return;
      if (typeof (element as Animatable).animate !== "function") return;
      const container = layer.get();
      for (let index = 0; index < o.count; index++) {
        const angle = (index / o.count) * Math.PI * 2 + (index % 2 ? 0.18 : -0.12);
        const reach = o.distance * (index % 3 === 0 ? 1 : 0.78);
        const node = element.ownerDocument.createElement("span");
        node.className = "neshel-burst-particle";
        Object.assign(node.style, {
          position: "absolute",
          left: "50%",
          top: "50%",
          width: `${o.size}px`,
          height: `${o.size}px`,
          margin: `${-o.size / 2}px 0 0 ${-o.size / 2}px`,
          borderRadius: "50%",
          background: o.colors[index % o.colors.length],
          pointerEvents: "none",
        });
        container.appendChild(node);
        const dx = Math.round(Math.cos(angle) * reach * 100) / 100;
        const dy = Math.round(Math.sin(angle) * reach * 100) / 100;
        const animation = (node as Animatable).animate?.(
          [
            { transform: "translate(0px, 0px) scale(1)", opacity: "1" },
            { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: "0" },
          ],
          { duration: o.duration, easing, fill: "forwards" },
        );
        if (!animation) {
          node.remove();
          continue;
        }
        live.add(animation);
        animation.onfinish = () => {
          live.delete(animation);
          animation.cancel();
          node.remove();
          layer.removeIfEmpty();
        };
      }
      layer.removeIfEmpty();
    }
    return {
      update(next) {
        if (next.trigger === trigger) return;
        trigger = next.trigger;
        play();
      },
      destroy() {
        for (const animation of [...live]) animation.cancel();
        live.clear();
        layer.remove();
        removeToken();
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** Shared one-shot oscillation for shake and nudge (tween of a progress value). */
function oscillator(
  context: EffectContext<{ duration: number }>,
  render: (t: number) => void,
  onDone: () => void,
) {
  const value = motionValue(0);
  const unsubscribe = value.subscribe(render);
  let control: MotionControl | undefined;
  return {
    play(duration: number) {
      control?.cancel();
      value.set(0);
      control = animateValue(
        value,
        1,
        { type: "tween", duration, easing: "linear" },
        { reducedMotion: "never" },
      );
      const current = control;
      current.finished.then(
        () => {
          if (control !== current) return;
          control = undefined;
          context.channels.transform.clear();
          onDone();
        },
        () => context.channels.transform.clear(),
      );
    },
    stop() {
      control?.cancel();
      control = undefined;
      context.channels.transform.clear();
    },
    destroy() {
      this.stop();
      unsubscribe();
    },
  };
}

/** P07 — Shake (error): a short damped horizontal shake. Never the only error signal. */
export interface ShakeOptions extends PressOptions, TriggerOptions {
  /** Amplitude in px (1–30, default 8). Reduced motion: a third, fewer cycles. */
  distance?: number;
  /** Oscillations (1–8, default 4). */
  cycles?: number;
  /** Duration in ms (100–2000, default 420). */
  duration?: number;
}
interface ResolvedShake extends ResolvedPress {
  trigger: string | number | boolean | undefined;
  distance: number;
  cycles: number;
  duration: number;
}
const shakeV = /* @__PURE__ */ validator("shake");
const hasErrorSemantics = (element: Element) =>
  element.matches("[aria-invalid='true'], [aria-errormessage], [role='alert']") ||
  element.querySelector("[aria-invalid='true'], [aria-errormessage], [role='alert']") !== null;
export const shake = /* @__PURE__ */ defineEffect<ShakeOptions, ResolvedShake>({
  id: "press/shake",
  family: "press",
  channels: [TRANSFORM],
  priority: 0,
  reducedMotion: "reduced",
  resolve(input) {
    const o = shakeV.options(input);
    return {
      ...pressCommon(o, shakeV),
      trigger: shakeV.key("trigger", o.trigger),
      distance: shakeV.number("distance", o.distance, 8, 1, 30),
      cycles: Math.round(shakeV.number("cycles", o.cycles, 4, 1, 8)),
      duration: shakeV.number("duration", o.duration, 420, 100, 2000),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    let trigger = context.options.trigger;
    let amplitude = 0;
    let cycles = 0;
    const motion = oscillator(
      context,
      (t) => {
        const x = amplitude * Math.sin(Math.PI * 2 * cycles * t) * (1 - t);
        if (Math.abs(x) < 0.01) context.channels.transform.clear();
        else context.channels.transform.set({ translateX: Math.round(x * 100) / 100 });
      },
      () => {},
    );
    return {
      update(next) {
        if (next.trigger === trigger) return;
        trigger = next.trigger;
        if (next.disabled || pageHidden()) return;
        if (
          typeof process !== "undefined" &&
          process.env.NODE_ENV !== "production" &&
          !hasErrorSemantics(context.element)
        ) {
          devWarnOnce(
            `shake:${elementKey(context.element)}`,
            `shake on ${describeElement(context.element)}: the shake is never the only error signal; also convey the error with text and ARIA (aria-invalid, aria-errormessage or role="alert").`,
          );
        }
        const reduced = context.reduced;
        amplitude = reduced ? next.distance / 3 : next.distance;
        cycles = reduced ? Math.min(2, next.cycles) : next.cycles;
        motion.play(reduced ? Math.round(next.duration * 0.6) : next.duration);
      },
      destroy: () => motion.destroy(),
    };
  },
});

/** P08 — Nudge / attention jiggle: a short rotation wiggle, optionally repeated a few times. */
export interface NudgeOptions extends PressOptions, TriggerOptions {
  /** Amplitude in degrees (1–20, default 6). */
  angle?: number;
  /** Oscillations (1–6, default 3). */
  cycles?: number;
  /** Duration in ms (100–2000, default 600). */
  duration?: number;
  /** Extra plays after the first (0–3, default 0); never more than 4 plays in total (WCAG 2.2.2). */
  repeat?: number;
  /** Pause between plays in ms (1000–10000, default 2500). */
  interval?: number;
}
interface ResolvedNudge extends ResolvedPress {
  trigger: string | number | boolean | undefined;
  angle: number;
  cycles: number;
  duration: number;
  repeat: number;
  interval: number;
}
const nudgeV = /* @__PURE__ */ validator("nudge");
export const nudge = /* @__PURE__ */ defineEffect<NudgeOptions, ResolvedNudge>({
  id: "press/nudge",
  family: "press",
  channels: [TRANSFORM],
  priority: 0,
  reducedMotion: "off",
  resolve(input) {
    const o = nudgeV.options(input);
    return {
      ...pressCommon(o, nudgeV),
      trigger: nudgeV.key("trigger", o.trigger),
      angle: nudgeV.number("angle", o.angle, 6, 1, 20),
      cycles: Math.round(nudgeV.number("cycles", o.cycles, 3, 1, 6)),
      duration: nudgeV.number("duration", o.duration, 600, 100, 2000),
      repeat: Math.round(nudgeV.number("repeat", o.repeat, 0, 0, 3)),
      interval: nudgeV.number("interval", o.interval, 2500, 1000, 10_000),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    let trigger = context.options.trigger;
    let left = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancelRepeats = () => {
      left = 0;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };
    const motion = oscillator(
      context,
      (t) => {
        const o = context.options;
        const angle = o.angle * Math.sin(Math.PI * 2 * o.cycles * t) * (1 - t);
        if (Math.abs(angle) < 0.01) context.channels.transform.clear();
        else context.channels.transform.set({ rotateZ: Math.round(angle * 100) / 100 });
      },
      () => {
        if (left <= 0) return;
        timer = setTimeout(() => {
          timer = undefined;
          if (pageHidden() || context.reduced) return cancelRepeats();
          left -= 1;
          motion.play(context.options.duration);
        }, context.options.interval);
      },
    );
    const unsubscribeVisibility = watchVisibility(() => {
      cancelRepeats();
      motion.stop();
    });
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (!reduced) return;
      cancelRepeats();
      motion.stop();
    });
    return {
      update(next) {
        if (next.trigger === trigger) return;
        trigger = next.trigger;
        cancelRepeats();
        if (next.disabled || context.reduced || pageHidden()) return;
        left = next.repeat;
        motion.play(next.duration);
      },
      destroy() {
        cancelRepeats();
        unsubscribeVisibility();
        unsubscribeReduced();
        motion.destroy();
      },
    };
  },
});
