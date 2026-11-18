"use client";
/**
 * Press family components (Phase 010): `<Press>` (generic primitive) and the components that render
 * package-owned, decorative DOM — `<ToggleMorph>`, `<CheckboxDraw>`, `<NumberTick>`, `<ContentSwap>`.
 * They never replace a control: place them inside your native, labelled control, which keeps the state
 * and the semantics (contracts/accessibility-010.md §3).
 */
import { type CSSProperties, type HTMLAttributes, type ReactNode, type Ref, useRef } from "react";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import {
  type EffectHostProps,
  type EffectPrimitiveProps,
  useEffectPrimitive,
} from "../react/effect-primitive.js";
import { joinClass, useHostRef } from "../react/motion-host.js";
import { useMotionPresets } from "../react/use-motion-presets.js";
import {
  type CheckboxDrawOptions,
  checkboxDraw,
  contentSwap,
  type NumberTickOptions,
  numberFormatter,
  numberTick,
  toggleMorph,
} from "./controls.js";
import { type LongPressOptions, longPress } from "./long-press.js";

export type PressProps<Options, Resolved> = EffectPrimitiveProps<Options, Resolved>;

/** `<Press>`: press & microinteraction effects on a `<div>` or, with `asChild`, your own element. */
export function Press<Options, Resolved>(props: PressProps<Options, Resolved>) {
  return useEffectPrimitive("Press", ["press"], "neshel-press", props);
}

/* P11 ---------------------------------------------------------------------------------------------- */
export interface LongPressProps
  extends Omit<EffectHostProps, "children">,
    Omit<LongPressOptions, "pointerTypes"> {
  pointerTypes?: LongPressOptions["pointerTypes"];
  children?: ReactNode;
}

/**
 * P11 `<LongPress>`: hold to activate, with a progress layer (`press.css`). Usually `asChild` on your own
 * `<button>`; describe the hold in its label or nearby text, and keep a non-timed path for destructive actions.
 */
export function LongPress(props: LongPressProps) {
  const {
    duration,
    moveTolerance,
    keyboard,
    pointerTypes,
    onLongPress,
    onCancel,
    reducedMotion,
    disabled,
    ...rest
  } = props;
  return useEffectPrimitive("LongPress", ["press"], "neshel-press", {
    ...rest,
    preset: longPress,
    options: {
      duration,
      moveTolerance,
      keyboard,
      pointerTypes,
      onLongPress,
      onCancel,
      reducedMotion,
      disabled,
    },
  });
}

/* P04 ---------------------------------------------------------------------------------------------- */
export interface ToggleMorphProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Mirror of your switch's state. */
  checked: boolean;
  spring?: SpringOptions | "gentle" | "snappy" | "bouncy";
  /** Peak thumb stretch mid-travel (0–0.6, default 0.3). */
  stretch?: number;
  reducedMotion?: ReducedMotion;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Decorative switch track and thumb (aria-hidden). Use inside a native control, e.g.
 * `<button role="switch" aria-checked={on}>` or a `<label>` with an `<input type="checkbox" role="switch">`.
 */
export function ToggleMorph({
  checked,
  spring,
  stretch,
  reducedMotion,
  className,
  ref,
  ...rest
}: ToggleMorphProps) {
  const thumb = useRef<HTMLSpanElement | null>(null);
  useMotionPresets(thumb, [
    { effect: toggleMorph, options: { checked, spring, stretch, reducedMotion } },
  ]);
  return (
    <span
      {...rest}
      ref={ref}
      aria-hidden="true"
      data-state={checked ? "on" : "off"}
      className={joinClass("neshel-toggle", className)}
    >
      <span ref={thumb} className="neshel-toggle-thumb" />
    </span>
  );
}

/* P05 ---------------------------------------------------------------------------------------------- */
export interface CheckboxDrawProps
  extends Omit<HTMLAttributes<SVGSVGElement>, "children">,
    Omit<CheckboxDrawOptions, "checked"> {
  checked: boolean;
  indeterminate?: boolean;
  ref?: Ref<SVGSVGElement>;
}

/** Decorative checkbox glyph (aria-hidden SVG) that draws its check mark. Mirror a native checkbox. */
export function CheckboxDraw({
  checked,
  indeterminate = false,
  duration,
  easing,
  reducedMotion,
  className,
  ref,
  ...rest
}: CheckboxDrawProps) {
  const [svg, setRef] = useHostRef<SVGSVGElement>(ref);
  const state = indeterminate ? "indeterminate" : checked ? "checked" : "unchecked";
  useMotionPresets(svg, [
    {
      effect: checkboxDraw,
      options: {
        checked: indeterminate ? "indeterminate" : checked,
        duration,
        easing,
        reducedMotion,
      },
    },
  ]);
  return (
    <svg
      {...rest}
      ref={setRef}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-state={state}
      className={joinClass("neshel-checkbox", className)}
    >
      <rect
        className="neshel-checkbox-box"
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      {state === "checked" ? (
        <path
          className="neshel-checkbox-mark"
          d="M7 12.5l3.2 3.2L17 8.8"
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {state === "indeterminate" ? (
        <path
          className="neshel-checkbox-mark"
          d="M7.5 12h9"
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

/* P09 ---------------------------------------------------------------------------------------------- */
const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export interface NumberTickProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    NumberTickOptions {
  /**
   * Announce changes politely (default `"off"`). Announcements carry the final value once per change,
   * never per frame.
   */
  live?: "off" | "polite";
  ref?: Ref<HTMLSpanElement>;
}

/**
 * A number that counts to each new value. The counting copy is aria-hidden and written without React
 * renders; assistive technologies read a visually hidden copy with the final value.
 */
export function NumberTick({
  value,
  format,
  locale,
  formatOptions,
  duration,
  easing,
  reducedMotion,
  live = "off",
  className,
  ref,
  ...rest
}: NumberTickProps) {
  const visual = useRef<HTMLSpanElement | null>(null);
  const text = numberFormatter(format, locale, formatOptions)(value);
  useMotionPresets(visual, [
    {
      effect: numberTick,
      options: { value, format, locale, formatOptions, duration, easing, reducedMotion },
    },
  ]);
  return (
    <span {...rest} ref={ref} className={joinClass("neshel-number", className)}>
      <span ref={visual} aria-hidden="true">
        {text}
      </span>
      <span style={VISUALLY_HIDDEN} aria-live={live === "polite" ? "polite" : undefined}>
        {text}
      </span>
    </span>
  );
}

/* P10 ---------------------------------------------------------------------------------------------- */
export interface ContentSwapProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Show `confirm` instead of `children` (e.g. `copied`). */
  active: boolean;
  /** Content while idle (e.g. "Copy"). */
  children: ReactNode;
  /** Content while active (e.g. "Copied ✓"). */
  confirm: ReactNode;
  /** Announce the new content politely when it changes (default `"off"`). */
  live?: "off" | "polite";
  reducedMotion?: ReducedMotion;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Cross-fades two contents in place. The inactive one is `hidden` (correct without CSS or JavaScript);
 * with `press.css` the swap fades and slides (opacity only under reduced motion).
 */
export function ContentSwap({
  active,
  children,
  confirm,
  live = "off",
  reducedMotion,
  className,
  ref,
  ...rest
}: ContentSwapProps) {
  const [element, setRef] = useHostRef<HTMLSpanElement>(ref);
  useMotionPresets(element, [{ effect: contentSwap, options: { reducedMotion } }]);
  return (
    <span
      {...rest}
      ref={setRef}
      aria-live={live === "polite" ? "polite" : undefined}
      data-state={active ? "active" : "idle"}
      className={joinClass("neshel-swap", className)}
    >
      <span data-slot="idle" hidden={active}>
        {children}
      </span>
      <span data-slot="confirm" hidden={!active}>
        {confirm}
      </span>
    </span>
  );
}
