/**
 * Definitions of the press effects that render package-owned DOM (P04, P05, P09, P10; contracts/
 * effects-010.md §3). The visuals are decorative representations: semantics and state stay on the
 * consumer's native control (checkbox, switch, button). The engine animates only on state CHANGES —
 * the static state comes from `data-state` in server markup (correct without JavaScript).
 */
import { animateValue, type MotionControl } from "../core/controls.js";
import type { SpringPreset } from "../core/defaults.js";
import type { Easing, EasingPreset } from "../core/easing.js";
import { defineEffect } from "../core/effect.js";
import { motionValue } from "../core/motion-value.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import { createSpringRig } from "../core/springs.js";
import { addToken, FX_ATTRIBUTE, FX_REDUCED_ATTRIBUTE, toggleToken } from "../core/tokens.js";
import { validator } from "../core/validate.js";
import { fixed, propertyWriter } from "../core/writers.js";

/* P04 — Toggle thumb morph --------------------------------------------------------------------- */
export interface ToggleMorphOptions {
  /** Current state (mirror your switch's `checked` / `aria-checked`). */
  checked: boolean;
  /** Thumb spring (default `"snappy"`). */
  spring?: SpringOptions | SpringPreset;
  /** Peak stretch of the thumb mid-travel (0–0.6, default 0.3). */
  stretch?: number;
  reducedMotion?: ReducedMotion;
}
interface ResolvedToggleMorph {
  checked: boolean;
  spring: Required<SpringOptions>;
  stretch: number;
  reducedMotion: ReducedMotion;
}
const toggleV = /* @__PURE__ */ validator("ToggleMorph");
export const toggleMorph = /* @__PURE__ */ defineEffect<ToggleMorphOptions, ResolvedToggleMorph>({
  id: "press/toggle-morph",
  family: "press",
  channels: [
    { channel: "--neshel-toggle-p", mode: "exclusive" },
    { channel: "--neshel-toggle-stretch", mode: "exclusive" },
  ],
  priority: 0,
  reducedMotion: "instant",
  resolve(input) {
    const o = toggleV.options(input);
    return {
      checked: toggleV.flag("checked", o.checked, false),
      spring: toggleV.spring(o.spring, "snappy"),
      stretch: toggleV.number("stretch", o.stretch, 0.3, 0, 0.6),
      reducedMotion: toggleV.reducedMotion(o.reducedMotion),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const removeToken = addToken(context.element, FX_ATTRIBUTE, "toggle-morph");
    const position = propertyWriter(context.channels.exclusive("--neshel-toggle-p"));
    const stretch = propertyWriter(context.channels.exclusive("--neshel-toggle-stretch"));
    let checked = context.options.checked;
    const rest = () => (checked ? 1 : 0);
    const rig = createSpringRig(
      context.scheduler,
      { p: rest() },
      context.options.spring,
      ({ p }, settled) => {
        if (settled && Math.abs(p - rest()) < 1e-3) {
          position(undefined);
          stretch(undefined);
          return;
        }
        position(fixed(p));
        const mid = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
        stretch(fixed(context.options.stretch * mid));
      },
    );
    return {
      update(next) {
        rig.setSpring(next.spring);
        if (next.checked === checked) return;
        checked = next.checked;
        if (context.reduced) rig.set({ p: rest() });
        else rig.to({ p: rest() });
      },
      destroy() {
        rig.stop();
        position(undefined);
        stretch(undefined);
        removeToken();
      },
    };
  },
});

/* P05 — Checkbox draw ---------------------------------------------------------------------------- */
export interface CheckboxDrawOptions {
  /** Current state (mirror your checkbox). */
  checked: boolean | "indeterminate";
  /** Draw duration in ms or preset (default 240). */
  duration?: number | "fast" | "normal" | "slow" | "deliberate";
  easing?: Easing | EasingPreset;
  reducedMotion?: ReducedMotion;
}
interface ResolvedCheckboxDraw {
  checked: boolean | "indeterminate";
  duration: number;
  easing: Easing;
  reducedMotion: ReducedMotion;
}
const checkV = /* @__PURE__ */ validator("CheckboxDraw");
export const checkboxDraw = /* @__PURE__ */ defineEffect<CheckboxDrawOptions, ResolvedCheckboxDraw>(
  {
    id: "press/checkbox-draw",
    family: "press",
    channels: [{ channel: "--neshel-check-progress", mode: "exclusive" }],
    priority: 0,
    reducedMotion: "instant",
    resolve(input) {
      const o = checkV.options(input);
      if (
        o.checked !== undefined &&
        o.checked !== "indeterminate" &&
        typeof o.checked !== "boolean"
      ) {
        checkV.fail(
          `invalid value ${String(o.checked)} for "checked"; expected a boolean or "indeterminate".`,
        );
      }
      return {
        checked: o.checked ?? false,
        duration: checkV.duration("duration", o.duration, 240),
        easing: checkV.easing(o.easing, "decelerate"),
        reducedMotion: checkV.reducedMotion(o.reducedMotion),
      };
    },
    policy: (o) => o.reducedMotion,
    setup(context) {
      const removeToken = addToken(context.element, FX_ATTRIBUTE, "checkbox-draw");
      const progress = propertyWriter(context.channels.exclusive("--neshel-check-progress"));
      const value = motionValue(1);
      const unsubscribe = value.subscribe((p) => progress(p >= 1 ? undefined : fixed(p)));
      let checked = context.options.checked;
      let control: MotionControl | undefined;
      return {
        update(next) {
          if (next.checked === checked) return;
          const drawing = next.checked !== false;
          checked = next.checked;
          control?.cancel();
          control = undefined;
          if (!drawing || context.reduced) {
            value.set(1);
            return;
          }
          value.set(0);
          control = animateValue(
            value,
            1,
            { type: "tween", duration: next.duration, easing: next.easing },
            { reducedMotion: "never" },
          );
        },
        destroy() {
          control?.cancel();
          unsubscribe();
          progress(undefined);
          removeToken();
        },
      };
    },
  },
);

/* P09 — Number tick ------------------------------------------------------------------------------- */
export interface NumberTickOptions {
  value: number;
  /** Formats the displayed number (default `Intl.NumberFormat(locale, formatOptions)`). */
  format?: (value: number) => string;
  /** Locale of the default formatter (default `"en-US"`, explicit so server and client agree). */
  locale?: string;
  formatOptions?: Intl.NumberFormatOptions;
  /** Count duration in ms or preset (default 600). */
  duration?: number | "fast" | "normal" | "slow" | "deliberate";
  easing?: Easing | EasingPreset;
  reducedMotion?: ReducedMotion;
}
interface ResolvedNumberTick {
  value: number;
  format: (value: number) => string;
  duration: number;
  easing: Easing;
  reducedMotion: ReducedMotion;
}
const numberV = /* @__PURE__ */ validator("NumberTick");
const formatters = new Map<string, Intl.NumberFormat>();
/** Formatter used by `<NumberTick>` and its effect (cached per locale and options). */
export function numberFormatter(
  format: ((value: number) => string) | undefined,
  locale = "en-US",
  options?: Intl.NumberFormatOptions,
): (value: number) => string {
  if (format) return format;
  const key = `${locale} ${JSON.stringify(options ?? {})}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    formatters.set(key, formatter);
  }
  const instance = formatter;
  return (value) => instance.format(value);
}
export const numberTick = /* @__PURE__ */ defineEffect<NumberTickOptions, ResolvedNumberTick>({
  id: "press/number-tick",
  family: "press",
  // Writes the text of its own aria-hidden element, not a style channel.
  channels: [],
  priority: 0,
  reducedMotion: "instant",
  resolve(input) {
    const o = numberV.options(input);
    if (typeof o.value !== "number" || !Number.isFinite(o.value)) {
      numberV.fail(`invalid value ${String(o.value)} for "value"; expected a finite number.`);
    }
    if (o.locale !== undefined && typeof o.locale !== "string")
      numberV.fail('"locale" must be a string.');
    return {
      value: o.value as number,
      format: numberFormatter(numberV.callback("format", o.format), o.locale, o.formatOptions),
      duration: numberV.duration("duration", o.duration, 600),
      easing: numberV.easing(o.easing, "decelerate"),
      reducedMotion: numberV.reducedMotion(o.reducedMotion),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const element = context.element as HTMLElement;
    const shown = motionValue(context.options.value);
    let target = context.options.value;
    let pending = false;
    let cancelWrite: (() => void) | undefined;
    let control: MotionControl | undefined;
    const write = () => {
      pending = false;
      cancelWrite = undefined;
      const text = context.options.format(control ? shown.get() : target);
      const node = element.firstChild;
      if (node && node.nodeType === 3 && !node.nextSibling) {
        if (node.nodeValue !== text) node.nodeValue = text;
      } else if (element.textContent !== text) element.textContent = text;
    };
    const unsubscribe = shown.subscribe(() => {
      if (pending) return;
      pending = true;
      cancelWrite = context.scheduler.schedule(write, "write");
    });
    return {
      update(next) {
        if (next.value === target) return;
        target = next.value;
        control?.cancel();
        control = undefined;
        if (context.reduced) {
          shown.set(target);
          write();
          return;
        }
        const current = animateValue(
          shown,
          target,
          { type: "tween", duration: next.duration, easing: next.easing },
          { reducedMotion: "never" },
        );
        control = current;
        current.finished.then(() => {
          if (control !== current) return;
          control = undefined;
          write();
        });
      },
      destroy() {
        control?.cancel();
        control = undefined;
        unsubscribe();
        cancelWrite?.();
      },
    };
  },
});

/* P10 — Content swap confirmation ---------------------------------------------------------------- */
export interface ContentSwapOptions {
  reducedMotion?: ReducedMotion;
}
const swapV = /* @__PURE__ */ validator("ContentSwap");
export const contentSwap = /* @__PURE__ */ defineEffect<
  ContentSwapOptions,
  { reducedMotion: ReducedMotion }
>({
  id: "press/content-swap",
  family: "press",
  // CSS-token driver on package-owned slots (press.css); no channel of any element is written.
  channels: [],
  priority: 0,
  reducedMotion: "fade",
  resolve: (input) => ({ reducedMotion: swapV.reducedMotion(swapV.options(input).reducedMotion) }),
  policy: (o) => o.reducedMotion,
  setup(context) {
    const removeToken = addToken(context.element, FX_ATTRIBUTE, "content-swap");
    const reduced = toggleToken(context.element, FX_REDUCED_ATTRIBUTE, "content-swap");
    reduced(context.reduced);
    const unsubscribe = context.onReducedChange(reduced);
    return {
      update() {},
      destroy() {
        unsubscribe();
        reduced(false);
        removeToken();
      },
    };
  },
});
