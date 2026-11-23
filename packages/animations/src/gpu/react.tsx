"use client";
/**
 * React bindings of the GPU entries (Phase 016; contracts/gpu-api.md). Each component renders a positioned frame
 * (`div.neshel-gpu-frame`) around native content — the `<img>` keeps every prop and attribute and is what the server
 * renders. Engines attach in a layout effect after hydration, are recreated when option values change, destroyed on
 * cleanup (StrictMode safe) and exposed through `controlRef`. No React state per frame.
 */
import {
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
} from "react";
import { useEngine } from "../react/use-engine.js";
import {
  createDepthParallax,
  type DepthParallaxControl,
  type DepthParallaxOptions,
} from "./depth-parallax.js";
import {
  createDisplacementHover,
  type DisplacementControl,
  type DisplacementHoverOptions,
} from "./displacement.js";
import { createPageCurl, type PageCurlControl, type PageCurlOptions } from "./page-curl.js";
import { createRipple, type RippleControl, type RippleOptions } from "./ripple.js";

const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

type WithControl<C> = { controlRef?: RefObject<C | null> };
type FrameProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  /** One native `<img>` (or `<canvas>`): the content that stays accessible. */
  children: ReactElement;
};

function useExpose<C>(controlRef: RefObject<C | null> | undefined, handle: RefObject<C | null>) {
  useClientLayoutEffect(() => {
    if (controlRef) controlRef.current = handle.current;
  });
}

const cx = (...names: Array<string | undefined | false>) => names.filter(Boolean).join(" ");

// --- D04 ------------------------------------------------------------------------------------------------

export type PageCurlProps = Omit<ComponentPropsWithoutRef<"div">, "children"> &
  Omit<PageCurlOptions, "front" | "under"> &
  WithControl<PageCurlControl> & {
    /** The page that turns (an `<img>` for the GPU driver, any element for `driver="css"`). */
    front: ReactNode;
    /** The page underneath (any accessible content). */
    under?: ReactNode;
  };

/** D04 — page curl: the front page peels off and reveals the page underneath (`div.neshel-pagecurl`). */
export function PageCurl(props: PageCurlProps) {
  const {
    front,
    under,
    driver,
    back,
    corner,
    radius,
    mesh,
    shading,
    duration,
    easing,
    reducedMotion,
    trigger,
    progress,
    onComplete,
    maxDpr,
    controlRef,
    className,
    ...rest
  } = props;
  const options = {
    driver,
    back,
    corner,
    radius,
    mesh,
    shading,
    duration,
    easing,
    reducedMotion,
    trigger,
    maxDpr,
  };
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, PageCurlControl>(
    ref,
    (el) => createPageCurl(el, { ...options, progress, onComplete }),
    options,
    [progress],
  );
  useExpose(controlRef, handle);
  return (
    <div ref={ref} className={cx("neshel-gpu-frame neshel-pagecurl", className)} {...rest}>
      {front}
      {under}
    </div>
  );
}

// --- D06 ------------------------------------------------------------------------------------------------

export type RippleProps = FrameProps & Omit<RippleOptions, "image"> & WithControl<RippleControl>;

/** D06 — liquid ripples on an image (`div.neshel-gpu-frame`). */
export function Ripple(props: RippleProps) {
  const {
    children,
    amplitude,
    frequency,
    damping,
    speed,
    maxImpacts,
    trigger,
    seed,
    duration,
    maxDpr,
    reducedMotion,
    controlRef,
    className,
    ...rest
  } = props;
  const options = {
    amplitude,
    frequency,
    damping,
    speed,
    maxImpacts,
    trigger,
    seed,
    duration,
    maxDpr,
    reducedMotion,
  };
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, RippleControl>(
    ref,
    (el) => createRipple(el, options),
    options,
  );
  useExpose(controlRef, handle);
  return (
    <div ref={ref} className={cx("neshel-gpu-frame", className)} {...rest}>
      {children}
    </div>
  );
}

// --- D08 ------------------------------------------------------------------------------------------------

export type DisplacementHoverProps = FrameProps &
  Omit<DisplacementHoverOptions, "image"> &
  WithControl<DisplacementControl>;

/** D08 — displacement-map distortion on hover/focus (`div.neshel-gpu-frame`). */
export function DisplacementHover(props: DisplacementHoverProps) {
  const {
    children,
    map,
    strength,
    scale,
    channels,
    edge,
    focus,
    spring,
    crossOrigin,
    seed,
    pointerTypes,
    maxDpr,
    reducedMotion,
    controlRef,
    className,
    ...rest
  } = props;
  const options = {
    strength,
    scale,
    channels,
    edge,
    focus,
    spring,
    crossOrigin,
    seed,
    pointerTypes,
    maxDpr,
    reducedMotion,
  };
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, DisplacementControl>(
    ref,
    (el) => createDisplacementHover(el, { ...options, map }),
    options,
    [map],
  );
  useExpose(controlRef, handle);
  return (
    <div ref={ref} className={cx("neshel-gpu-frame", className)} {...rest}>
      {children}
    </div>
  );
}

// --- D10 ------------------------------------------------------------------------------------------------

export type DepthParallaxProps = FrameProps &
  Omit<DepthParallaxOptions, "image"> &
  WithControl<DepthParallaxControl>;

/** D10 — 2.5D parallax from an explicit depth map (`div.neshel-gpu-frame`). */
export function DepthParallax(props: DepthParallaxProps) {
  const {
    children,
    depth,
    invert,
    intensity,
    focus,
    steps,
    pointer,
    from,
    to,
    spring,
    crossOrigin,
    pointerTypes,
    maxDpr,
    reducedMotion,
    controlRef,
    className,
    ...rest
  } = props;
  const options = {
    invert,
    intensity,
    focus,
    steps,
    pointer,
    from,
    to,
    spring,
    crossOrigin,
    pointerTypes,
    maxDpr,
    reducedMotion,
  };
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, DepthParallaxControl>(
    ref,
    (el) => createDepthParallax(el, { ...options, depth }),
    options,
    [depth],
  );
  useExpose(controlRef, handle);
  return (
    <div ref={ref} className={cx("neshel-gpu-frame", className)} {...rest}>
      {children}
    </div>
  );
}
