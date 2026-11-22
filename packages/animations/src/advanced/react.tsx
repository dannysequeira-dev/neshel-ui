"use client";
/**
 * React bindings of the Advanced 3D family (Phase 016; contracts/advanced-api.md). Engines attach in a layout effect
 * after hydration (server and client markup are identical; content is visible without JavaScript), are recreated
 * when option values change, destroyed on cleanup (StrictMode safe) and exposed through `controlRef`. Controlled
 * props (`flipped`, `index`) drive the live engine without recreating it. No React state per frame.
 */
import {
  Children,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
} from "react";
import { useEngine } from "../react/use-engine.js";
import {
  type CornerRecedeControl,
  type CornerRecedeOptions,
  createCornerRecede,
} from "./corner.js";
import { type CubeControl, type CubeRotateOptions, createCubeRotate } from "./cube.js";
import {
  type CardFlipControl,
  type CardFlipOptions,
  createCardFlip,
  type FlipSide,
} from "./flip.js";
import { createGlitch, type GlitchControl, type GlitchOptions } from "./glitch.js";
import { createPerspectiveGrid, type GridControl, type PerspectiveGridOptions } from "./grid.js";
import { createRingCarousel, type RingCarouselOptions, type RingControl } from "./ring.js";
import { createTiltShift, type TiltShiftControl, type TiltShiftOptions } from "./tilt-shift.js";

const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

type WithControl<C> = { controlRef?: RefObject<C | null> };

function useExpose<C>(controlRef: RefObject<C | null> | undefined, handle: RefObject<C | null>) {
  useClientLayoutEffect(() => {
    if (controlRef) controlRef.current = handle.current;
  });
}

function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

const cx = (...names: Array<string | undefined | false>) => names.filter(Boolean).join(" ");

// --- D01 ------------------------------------------------------------------------------------------------

export type CardFlipProps = Omit<ComponentPropsWithoutRef<"div">, "children"> &
  Omit<CardFlipOptions, "inner" | "front" | "back" | "flipped" | "onFlip"> &
  WithControl<CardFlipControl> & {
    front: ReactNode;
    back: ReactNode;
    /** Controlled side (`true` = back). */
    flipped?: boolean;
    defaultFlipped?: boolean;
    onFlippedChange?(flipped: boolean): void;
  };

/** D01 — a card with two faces that flips in 3D (`div.neshel-flip`). */
export function CardFlip(props: CardFlipProps) {
  const {
    front,
    back,
    flipped,
    defaultFlipped,
    onFlippedChange,
    axis,
    direction,
    perspective,
    spring,
    reducedEffect,
    toggleSelector,
    reducedMotion,
    controlRef,
    className,
    ...rest
  } = props;
  const latest = useLatest(onFlippedChange);
  const initial = useRef(flipped ?? defaultFlipped ?? false);
  const options = {
    axis,
    direction,
    perspective,
    spring,
    reducedEffect,
    toggleSelector,
    reducedMotion,
  };
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, CardFlipControl>(
    ref,
    (el) =>
      createCardFlip(el, {
        ...options,
        flipped: initial.current,
        onFlip: (side: FlipSide) => {
          initial.current = side === "back";
          latest.current?.(side === "back");
        },
      }),
    options,
  );
  useClientLayoutEffect(() => {
    if (flipped === undefined) return;
    initial.current = flipped;
    handle.current?.flip(flipped ? "back" : "front");
  }, [flipped]);
  useExpose(controlRef, handle);
  return (
    <div ref={ref} className={cx("neshel-flip", className)} {...rest}>
      <div className="neshel-flip-inner">
        <div className="neshel-flip-face neshel-flip-front">{front}</div>
        <div className="neshel-flip-face neshel-flip-back">{back}</div>
      </div>
    </div>
  );
}

// --- D02 ------------------------------------------------------------------------------------------------

export type CubeRotateProps = Omit<ComponentPropsWithoutRef<"div">, "onChange"> &
  Omit<CubeRotateOptions, "index" | "onChange"> &
  WithControl<CubeControl> & {
    /** Controlled panel index. */
    index?: number;
    defaultIndex?: number;
    onIndexChange?(index: number): void;
  };

/** D02 — panels (children) that change through a cube rotation (`div.neshel-cube`). */
export function CubeRotate(props: CubeRotateProps) {
  const {
    children,
    index,
    defaultIndex,
    onIndexChange,
    axis,
    duration,
    easing,
    perspective,
    loop,
    reducedMotion,
    controlRef,
    className,
    ...rest
  } = props;
  const latest = useLatest(onIndexChange);
  const current = useRef(index ?? defaultIndex ?? 0);
  const options = { axis, duration, easing, perspective, loop, reducedMotion };
  const count = Children.count(children);
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, CubeControl>(
    ref,
    (el) =>
      createCubeRotate(el, {
        ...options,
        index: current.current,
        onChange: (i) => {
          current.current = i;
          latest.current?.(i);
        },
      }),
    options,
    [count],
  );
  useClientLayoutEffect(() => {
    if (index === undefined || !handle.current || handle.current.index === index) return;
    handle.current.go(index);
  }, [index]);
  useExpose(controlRef, handle);
  return (
    <div ref={ref} className={cx("neshel-cube", className)} {...rest}>
      {children}
    </div>
  );
}

// --- D03 ------------------------------------------------------------------------------------------------

export type RingCarouselProps = Omit<ComponentPropsWithoutRef<"div">, "onChange"> &
  Omit<RingCarouselOptions, "index" | "onChange" | "label"> &
  WithControl<RingControl> & {
    /** Accessible name of the carousel. */
    label: string;
    index?: number;
    defaultIndex?: number;
    onIndexChange?(index: number): void;
  };

/** D03 — items (children) on a rotating 3D ring (`div.neshel-ring`). */
export function RingCarousel(props: RingCarouselProps) {
  const {
    children,
    label,
    index,
    defaultIndex,
    onIndexChange,
    radius,
    gap,
    perspective,
    spring,
    keyboard,
    drag,
    announce,
    reducedMotion,
    controlRef,
    className,
    ...rest
  } = props;
  const latest = useLatest(onIndexChange);
  const announceRef = useLatest(announce);
  const current = useRef(index ?? defaultIndex ?? 0);
  const options = { label, radius, gap, perspective, spring, keyboard, drag, reducedMotion };
  const count = Children.count(children);
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, RingControl>(
    ref,
    (el) =>
      createRingCarousel(el, {
        ...options,
        index: current.current,
        announce: announce ? (i, n) => announceRef.current?.(i, n) ?? "" : undefined,
        onChange: (i) => {
          current.current = i;
          latest.current?.(i);
        },
      }),
    options,
    [count],
  );
  useClientLayoutEffect(() => {
    if (index === undefined || !handle.current || handle.current.index === index) return;
    handle.current.go(index);
  }, [index]);
  useExpose(controlRef, handle);
  return (
    <div ref={ref} className={cx("neshel-ring", className)} {...rest}>
      {children}
    </div>
  );
}

// --- D05 ------------------------------------------------------------------------------------------------

export type CornerRecedeProps = Omit<ComponentPropsWithoutRef<"div">, "children"> &
  Omit<CornerRecedeOptions, "surface"> &
  WithControl<CornerRecedeControl> & {
    /** One element: the live surface whose corner recedes. */
    children: ReactElement;
  };

/** D05 — the corner under the pointer recedes like a folded page (`div.neshel-corner`). */
export function CornerRecede(props: CornerRecedeProps) {
  const {
    children,
    size,
    angle,
    reverse,
    corners,
    threshold,
    spring,
    focusCorner,
    flap,
    shade,
    perspective,
    pointerTypes,
    reducedMotion,
    controlRef,
    className,
    ...rest
  } = props;
  const options = {
    size,
    angle,
    reverse,
    corners,
    threshold,
    spring,
    focusCorner,
    flap,
    shade,
    perspective,
    pointerTypes,
    reducedMotion,
  };
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, CornerRecedeControl>(
    ref,
    (el) => createCornerRecede(el, options),
    options,
  );
  useExpose(controlRef, handle);
  return (
    <div ref={ref} className={cx("neshel-corner", className)} {...rest}>
      {children}
    </div>
  );
}

// --- D07 ------------------------------------------------------------------------------------------------

export type GlitchProps = ComponentPropsWithoutRef<"span"> &
  GlitchOptions &
  WithControl<GlitchControl>;

/** D07 — RGB split / glitch bursts on text (`span.neshel-glitch`); the text exists once. */
export function Glitch(props: GlitchProps) {
  const {
    children,
    intensity,
    duration,
    rate,
    trigger,
    colors,
    seed,
    reducedMotion,
    controlRef,
    className,
    ...rest
  } = props;
  const options = { intensity, duration, rate, trigger, colors, seed, reducedMotion };
  const ref = useRef<HTMLSpanElement | null>(null);
  const handle = useEngine<HTMLSpanElement, GlitchControl>(
    ref,
    (el) => createGlitch(el, options),
    options,
  );
  useExpose(controlRef, handle);
  return (
    <span ref={ref} className={cx("neshel-glitch", className)} {...rest}>
      {children}
    </span>
  );
}

// --- D09 ------------------------------------------------------------------------------------------------

export type PerspectiveGridProps = ComponentPropsWithoutRef<"div"> &
  PerspectiveGridOptions &
  WithControl<GridControl>;

/** D09 — a decorative perspective grid floor behind the children (`div.neshel-grid-host`). */
export function PerspectiveGrid(props: PerspectiveGridProps) {
  const {
    children,
    horizon,
    vanishing,
    angle,
    cell,
    line,
    color,
    opacity,
    fade,
    speed,
    drift,
    duration,
    reducedMotion,
    controlRef,
    className,
    ...rest
  } = props;
  const options = {
    horizon,
    vanishing,
    angle,
    cell,
    line,
    color,
    opacity,
    fade,
    speed,
    drift,
    duration,
    reducedMotion,
  };
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, GridControl>(
    ref,
    (el) => createPerspectiveGrid(el, options),
    options,
  );
  useExpose(controlRef, handle);
  return (
    <div ref={ref} className={cx("neshel-grid-host", className)} {...rest}>
      {children}
    </div>
  );
}

// --- D11 ------------------------------------------------------------------------------------------------

export type TiltShiftProps = ComponentPropsWithoutRef<"div"> &
  TiltShiftOptions &
  WithControl<TiltShiftControl>;

/** D11 — tilt-shift depth of field over the children (`div.neshel-tiltshift-host`). */
export function TiltShift(props: TiltShiftProps) {
  const {
    children,
    orientation,
    focus,
    size,
    blur,
    bands,
    fallback,
    tint,
    progress,
    spring,
    reducedMotion,
    controlRef,
    className,
    ...rest
  } = props;
  const options = { orientation, size, blur, bands, fallback, tint, spring, reducedMotion };
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, TiltShiftControl>(
    ref,
    (el) => createTiltShift(el, { ...options, focus, progress }),
    options,
    [progress],
  );
  useClientLayoutEffect(() => {
    if (focus !== undefined) handle.current?.setFocus(focus);
  }, [focus]);
  useExpose(controlRef, handle);
  return (
    <div ref={ref} className={cx("neshel-tiltshift-host", className)} {...rest}>
      {children}
    </div>
  );
}
