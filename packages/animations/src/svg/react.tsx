"use client";
/**
 * React bindings of the SVG & Paths family (Phase 014; contracts/svg-api.md). Hooks attach an engine to an
 * element you render (layout effect after hydration; recreated when option values change; destroyed on
 * cleanup; StrictMode safe). Components exist only where the package renders the SVG (`MorphIcon`,
 * `SuccessCheck`) plus `PathDraw` (slot around one SVG geometry child). No React state per frame.
 */
import { Slot } from "@radix-ui/react-slot";
import {
  type ComponentPropsWithoutRef,
  type ReactElement,
  type RefObject,
  useLayoutEffect,
  useRef,
} from "react";
import type { LoopEffectControl } from "../core/loop.js";
import type { ProgressControl } from "../core/progress-driver.js";
import { useEngine } from "../react/use-engine.js";
import {
  type ChartDrawOptions,
  type CheckmarkOptions,
  createChartDraw,
  createCheckmark,
  createPathDraw,
  type PathDrawOptions,
} from "./draw.js";
import { createLogoReveal, type LogoRevealOptions } from "./logo.js";
import {
  createDashFlow,
  createGradientStops,
  createTurbulence,
  type DashFlowOptions,
  type GradientStopsOptions,
  type TurbulenceOptions,
} from "./loops.js";
import {
  createIconMorph,
  createPathMorph,
  type IconMorphControl,
  type PathMorphControl,
  type PathMorphOptions,
} from "./morph.js";
import { createMotionPath, type MotionPathControl, type MotionPathOptions } from "./motion-path.js";

const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

/** S01 */
export function usePathDraw(ref: RefObject<Element | null>, options: PathDrawOptions = {}) {
  return useEngine<Element, ProgressControl>(ref, (el) => createPathDraw(el, options), options, [
    options.progress,
  ]);
}

export type PathDrawProps = PathDrawOptions & {
  /** One SVG geometry element (`<path>`, `<circle>`, …). */
  children: ReactElement;
  controlRef?: RefObject<ProgressControl | null>;
};

/** S01 — draw the single SVG geometry child. */
export function PathDraw({ children, controlRef, ...options }: PathDrawProps) {
  const ref = useRef<Element | null>(null);
  const handle = usePathDraw(ref, options);
  useClientLayoutEffect(() => {
    if (controlRef) controlRef.current = handle.current;
  });
  return <Slot ref={ref as RefObject<HTMLElement | null>}>{children}</Slot>;
}

/** S02 */
export function usePathMorph(ref: RefObject<Element | null>, options: PathMorphOptions) {
  return useEngine<Element, PathMorphControl>(ref, (el) => createPathMorph(el, options), options);
}

/** S03 */
export function useMotionPath(ref: RefObject<Element | null>, options: MotionPathOptions) {
  return useEngine<Element, MotionPathControl>(
    ref,
    (el) => createMotionPath(el, options),
    options,
    [options.progress],
  );
}

export type MorphIconProps = Omit<ComponentPropsWithoutRef<"svg">, "children"> & {
  /** Named compatible shapes in a 24×24 viewBox (e.g. `menuCloseShapes`). */
  shapes: Readonly<Record<string, string>>;
  state: string;
  duration?: number;
  /** Accessible title: omitted → decorative (`aria-hidden`); name the button instead. */
  title?: string;
  controlRef?: RefObject<IconMorphControl | null>;
};

/** S04 — a decorative stroked icon morphing between named states. */
export function MorphIcon({ shapes, state, duration, title, controlRef, ...rest }: MorphIconProps) {
  const ref = useRef<SVGPathElement | null>(null);
  const initial = useRef(state);
  const handle = useEngine<SVGPathElement, IconMorphControl>(
    ref,
    (el) => createIconMorph(el, { shapes, state: initial.current, duration }),
    { shapes, duration },
  );
  useClientLayoutEffect(() => {
    if (controlRef) controlRef.current = handle.current;
    if (handle.current && handle.current.name !== state) void handle.current.set(state);
  }, [state]);
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative (aria-hidden) unless `title` is given, then role="img" + aria-label.
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="neshel-morph-icon"
      focusable="false"
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
      {...rest}
    >
      <path ref={ref} d={shapes[initial.current]} />
    </svg>
  );
}

/** S05 */
export function useGradientStops(ref: RefObject<Element | null>, options: GradientStopsOptions) {
  return useEngine<Element, LoopEffectControl>(
    ref,
    (el) => createGradientStops(el, options),
    options,
  );
}

/** S06 */
export function useChartDraw(ref: RefObject<Element | null>, options: ChartDrawOptions) {
  return useEngine<Element, ProgressControl>(ref, (el) => createChartDraw(el, options), options, [
    options.progress,
  ]);
}

/** S07 */
export function useTurbulence(ref: RefObject<Element | null>, options: TurbulenceOptions = {}) {
  return useEngine<Element, LoopEffectControl>(ref, (el) => createTurbulence(el, options), options);
}

/** S08 */
export function useLogoReveal(ref: RefObject<Element | null>, options: LogoRevealOptions = {}) {
  return useEngine<Element, ProgressControl>(ref, (el) => createLogoReveal(el, options), options, [
    options.progress,
  ]);
}

/** S09 */
export function useDashFlow(ref: RefObject<Element | null>, options: DashFlowOptions = {}) {
  return useEngine<Element, LoopEffectControl>(ref, (el) => createDashFlow(el, options), options);
}

export type SuccessCheckProps = Omit<ComponentPropsWithoutRef<"svg">, "children"> &
  Omit<CheckmarkOptions, "circleElement" | "checkElement"> & {
    /** Accessible title: omitted → decorative (`aria-hidden`); announce success in your own status text. */
    title?: string;
    size?: number;
    controlRef?: RefObject<ProgressControl | null>;
  };

/** S10 — success checkmark (decorative by default; no role or live region is added). */
export function SuccessCheck(props: SuccessCheckProps) {
  const {
    title,
    size = 48,
    controlRef,
    duration,
    easing,
    reducedMotion,
    trigger,
    progress,
    onComplete,
    circle = true,
    ...rest
  } = props;
  const ref = useRef<SVGSVGElement | null>(null);
  const options = { duration, easing, reducedMotion, trigger, progress, onComplete, circle };
  const handle = useEngine<SVGSVGElement, ProgressControl>(
    ref,
    (el) => createCheckmark(el, options),
    options,
    [progress],
  );
  useClientLayoutEffect(() => {
    if (controlRef) controlRef.current = handle.current;
  });
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative (aria-hidden) unless `title` is given, then role="img" + aria-label.
    <svg
      ref={ref}
      viewBox="0 0 52 52"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="neshel-success-check"
      focusable="false"
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
      {...rest}
    >
      {circle ? <circle cx="26" cy="26" r="23" /> : null}
      <path d="M15 27l7 7 15-16" />
    </svg>
  );
}
