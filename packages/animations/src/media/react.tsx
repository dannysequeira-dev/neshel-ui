"use client";
/**
 * React bindings of the Images & Media family (Phase 015; contracts/media-api.md). Engines attach in a layout
 * effect after hydration (server and client markup are identical and show the media without JavaScript), are
 * recreated when option values change, destroyed on cleanup (StrictMode safe) and exposed through `controlRef`.
 * Native `<img>`/`<video>` props pass through untouched. No React state per frame.
 */
import { Slot } from "@radix-ui/react-slot";
import {
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
} from "react";
import type { ProgressControl } from "../core/progress-driver.js";
import { useEngine } from "../react/use-engine.js";
import {
  type CameraPose,
  createHoverPan,
  createKenBurns,
  type HoverPanControl,
  type HoverPanOptions,
  type KenBurnsOptions,
} from "./camera.js";
import { type CompareControl, createCompareSlider } from "./compare.js";
import { createDuotone, type DuotoneOptions } from "./duotone.js";
import {
  type CrossfadeControl,
  type CrossfadeOptions,
  createCrossfade,
  createPixelDissolve,
  type DissolveControl,
  type PixelDissolveOptions,
} from "./gallery.js";
import { createLightboxZoom, type LightboxControl } from "./lightbox.js";
import {
  type BlurUpOptions,
  createBlurUp,
  createLoadReveal,
  type LoadRevealOptions,
  type MediaRevealControl,
} from "./reveal.js";
import { createVideoScrub, type VideoScrubControl, type VideoScrubOptions } from "./video.js";

const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

type WithControl<C> = { controlRef?: RefObject<C | null> };

function useExpose<C>(controlRef: RefObject<C | null> | undefined, handle: RefObject<C | null>) {
  useClientLayoutEffect(() => {
    if (controlRef) controlRef.current = handle.current;
  });
}

/** Latest-value ref for callbacks (engines keep the first identity; this keeps them current). */
function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

const cx = (...names: Array<string | undefined | false>) => names.filter(Boolean).join(" ");

// --- M01 ------------------------------------------------------------------------------------------------

/** M01 — Ken Burns on a media element you render inside a clipping frame. */
export function useKenBurns(ref: RefObject<Element | null>, options: KenBurnsOptions = {}) {
  return useEngine<Element, ProgressControl>(ref, (el) => createKenBurns(el, options), options, [
    options.progress,
  ]);
}

export type KenBurnsProps = KenBurnsOptions &
  WithControl<ProgressControl> &
  Omit<ComponentPropsWithoutRef<"div">, "children"> & { children: ReactElement };

/** M01 — a clipping frame (`div.neshel-kenburns`) around one image or video. */
export function KenBurns(props: KenBurnsProps) {
  const {
    children,
    controlRef,
    className,
    from,
    to,
    repeat,
    yoyo,
    duration,
    easing,
    reducedMotion,
    trigger,
    progress,
    onComplete,
    ...rest
  } = props;
  const options = {
    from,
    to,
    repeat,
    yoyo,
    duration,
    easing,
    reducedMotion,
    trigger,
    progress,
    onComplete,
  };
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, ProgressControl>(
    ref,
    (el) => createKenBurns(el.firstElementChild ?? el, options),
    options,
    [progress],
  );
  useExpose(controlRef, handle);
  return (
    <div ref={ref} className={cx("neshel-kenburns", className)} {...rest}>
      {children}
    </div>
  );
}

// --- M02 / M03 ------------------------------------------------------------------------------------------

export type BlurUpImageProps = ComponentPropsWithoutRef<"img"> &
  Omit<BlurUpOptions, "image" | "onStateChange"> &
  WithControl<MediaRevealControl> & {
    /** Class of the wrapper `span.neshel-blurup`. */
    frameClassName?: string;
    onRevealStateChange?: BlurUpOptions["onStateChange"];
  };

/** M02 — a native `<img>` with a blurred placeholder until it is decoded (visible without JavaScript). */
export function BlurUpImage(props: BlurUpImageProps) {
  const {
    placeholder,
    blur,
    duration,
    easing,
    replay,
    revealTimeout,
    reducedMotion,
    controlRef,
    frameClassName,
    onRevealStateChange,
    alt,
    ...img
  } = props;
  const latest = useLatest(onRevealStateChange);
  const options = { placeholder, blur, duration, easing, replay, revealTimeout, reducedMotion };
  const ref = useRef<HTMLSpanElement | null>(null);
  const handle = useEngine<HTMLSpanElement, MediaRevealControl>(
    ref,
    (el) => createBlurUp(el, { ...options, onStateChange: (s) => latest.current?.(s) }),
    { ...options, src: img.src, srcSet: img.srcSet },
  );
  useExpose(controlRef, handle);
  return (
    <span ref={ref} className={cx("neshel-blurup", frameClassName)}>
      {/* biome-ignore lint/performance/noImgElement: a native <img> on purpose (no proprietary loader; works with any framework). */}
      <img alt={alt} {...img} />
    </span>
  );
}

export type LoadRevealProps = LoadRevealOptions &
  WithControl<MediaRevealControl> & {
    /** One native `<img>`. */
    children: ReactElement;
  };

/** M03 — reveal the single `<img>` child when (and only if) it finishes loading. */
export function LoadReveal({ children, controlRef, ...options }: LoadRevealProps) {
  const ref = useRef<HTMLImageElement | null>(null);
  const handle = useEngine<HTMLImageElement, MediaRevealControl>(
    ref,
    (el) => createLoadReveal(el, options),
    options,
  );
  useExpose(controlRef, handle);
  return <Slot ref={ref as RefObject<HTMLElement | null>}>{children}</Slot>;
}

// --- M04 ------------------------------------------------------------------------------------------------

export type CompareSliderProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "onChange"> &
  WithControl<CompareControl> & {
    before: ReactNode;
    after: ReactNode;
    /** Accessible name of the slider (required). */
    label: string;
    defaultValue?: number;
    /** Controlled value 0–100. */
    value?: number;
    onValueChange?(value: number): void;
    valueText?(value: number): string;
    orientation?: "horizontal" | "vertical";
    step?: number;
    /** Labels of optional "show before"/"show after" buttons (comparison without dragging). */
    jumps?: { before: string; after: string };
  };

/** M04 — before/after comparison with a native range input (keyboard, touch, pointer, value text). */
export function CompareSlider(props: CompareSliderProps) {
  const {
    before,
    after,
    label,
    defaultValue = 50,
    value,
    onValueChange,
    valueText,
    orientation = "horizontal",
    step,
    jumps,
    controlRef,
    className,
    ...rest
  } = props;
  const latest = useLatest(onValueChange);
  const latestText = useLatest(valueText);
  const ref = useRef<HTMLDivElement | null>(null);
  const initial = useRef(value ?? defaultValue);
  // The last value survives an engine re-creation (orientation/step change, StrictMode).
  const current = useRef(initial.current);
  const handle = useEngine<HTMLDivElement, CompareControl>(
    ref,
    (el) =>
      createCompareSlider(el, {
        value: current.current,
        orientation,
        step,
        valueText: (v) =>
          latestText.current?.(v) ?? `${Math.round(v)}% before, ${Math.round(100 - v)}% after`,
        onValueChange: (v) => {
          current.current = v;
          latest.current?.(v);
        },
      }),
    { orientation, step },
  );
  useExpose(controlRef, handle);
  useClientLayoutEffect(() => {
    if (value === undefined) return;
    current.current = value;
    if (handle.current && handle.current.value !== value) handle.current.set(value);
  }, [value]);
  const frame = (
    <div
      ref={ref}
      className={cx("neshel-compare", className)}
      data-orientation={orientation}
      {...rest}
    >
      <div className="neshel-compare-before">{before}</div>
      <div className="neshel-compare-after" data-neshel-compare-after="">
        {after}
      </div>
      <span className="neshel-compare-handle" aria-hidden="true" />
      <input
        type="range"
        className="neshel-compare-input"
        aria-label={label}
        defaultValue={initial.current}
      />
    </div>
  );
  if (!jumps) return frame;
  return (
    <>
      {frame}
      <div className="neshel-compare-jumps">
        <button type="button" onClick={() => handle.current?.set(100)}>
          {jumps.before}
        </button>
        <button type="button" onClick={() => handle.current?.set(0)}>
          {jumps.after}
        </button>
      </div>
    </>
  );
}

// --- M05 ------------------------------------------------------------------------------------------------

export type DuotoneProps = DuotoneOptions &
  WithControl<ProgressControl> & { children: ReactElement };

/** M05 — duotone transition on the single child (image untouched; filter restored on cleanup). */
export function Duotone({ children, controlRef, ...options }: DuotoneProps) {
  const ref = useRef<Element | null>(null);
  const handle = useEngine<Element, ProgressControl>(
    ref,
    (el) => createDuotone(el, options),
    options,
    [options.progress],
  );
  useExpose(controlRef, handle);
  return <Slot ref={ref as RefObject<HTMLElement | null>}>{children}</Slot>;
}

// --- M06 ------------------------------------------------------------------------------------------------

/** M06 — scrub a `<video>` you render from a 0–1 progress source (never plays it). */
export function useVideoScrub(ref: RefObject<HTMLVideoElement | null>, options: VideoScrubOptions) {
  return useEngine<HTMLVideoElement, VideoScrubControl>(
    ref,
    (el) => createVideoScrub(el, options),
    options,
    [options.progress],
  );
}

// --- M07 ------------------------------------------------------------------------------------------------

export type LightboxProps = WithControl<LightboxControl> & {
  /** The thumbnail (usually an `<img>`); rendered inside the trigger button. */
  thumbnail: ReactElement;
  /** Large content; its first element zooms from the thumbnail. */
  children: ReactNode;
  /** Accessible name of the dialog (required). */
  label: string;
  /** Accessible name of the trigger (default: the thumbnail's alt text). */
  triggerLabel?: string;
  closeLabel?: string;
  duration?: number;
  reducedMotion?: LightboxOptionsPolicy;
  onOpenChange?(open: boolean): void;
  className?: string;
};
type LightboxOptionsPolicy = "user" | "always" | "never";

/** M07 — thumbnail button + native modal `<dialog>` with a FLIP zoom (focus, Escape, scroll lock). */
export function Lightbox(props: LightboxProps) {
  const {
    thumbnail,
    children,
    label,
    triggerLabel,
    closeLabel = "Close",
    duration,
    reducedMotion,
    onOpenChange,
    controlRef,
    className,
  } = props;
  const trigger = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const latest = useLatest(onOpenChange);
  const handle = useEngine<HTMLDialogElement, LightboxControl>(
    dialog,
    (el) =>
      createLightboxZoom({
        dialog: el,
        image:
          (body.current?.firstElementChild as HTMLElement | null) ?? (body.current as HTMLElement),
        getThumbnail: () => trigger.current?.firstElementChild ?? trigger.current,
        duration,
        reducedMotion,
        onOpenChange: (open) => latest.current?.(open),
      }),
    { duration, reducedMotion },
  );
  useExpose(controlRef, handle);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={cx("neshel-lightbox-trigger", className)}
        aria-haspopup="dialog"
        aria-label={triggerLabel}
        onClick={() => handle.current?.open()}
      >
        {thumbnail}
      </button>
      <dialog ref={dialog} className="neshel-lightbox" aria-label={label}>
        <button
          type="button"
          className="neshel-lightbox-close"
          data-neshel-lightbox-close=""
          aria-label={closeLabel}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div ref={body} className="neshel-lightbox-body">
          {children}
        </div>
      </dialog>
    </>
  );
}

// --- M08 / M09 ------------------------------------------------------------------------------------------

export type CrossfadeProps = Omit<CrossfadeOptions, "onIndexChange"> &
  WithControl<CrossfadeControl> &
  Omit<ComponentPropsWithoutRef<"div">, "children"> & {
    children: ReactNode;
    onIndexChange?(index: number): void;
  };

/** M08 — stacked slides cross-fading to `index` (inactive slides inert and hidden from AT). */
export function Crossfade(props: CrossfadeProps) {
  const {
    children,
    index = 0,
    duration,
    easing,
    reducedMotion,
    interval,
    onIndexChange,
    controlRef,
    className,
    ...rest
  } = props;
  const ref = useRef<HTMLDivElement | null>(null);
  const latest = useLatest(onIndexChange);
  const current = useRef(index);
  const handle = useEngine<HTMLDivElement, CrossfadeControl>(
    ref,
    (el) =>
      createCrossfade(el, {
        index: current.current,
        duration,
        easing,
        reducedMotion,
        interval,
        onIndexChange: (i) => {
          current.current = i;
          latest.current?.(i);
        },
      }),
    { duration, easing, reducedMotion, interval },
  );
  useExpose(controlRef, handle);
  useClientLayoutEffect(() => {
    current.current = index;
    handle.current?.show(index);
  }, [index]);
  return (
    <div ref={ref} className={cx("neshel-crossfade", className)} {...rest}>
      {children}
    </div>
  );
}

export type PixelDissolveProps = Omit<PixelDissolveOptions, "onIndexChange"> &
  WithControl<DissolveControl> &
  Omit<ComponentPropsWithoutRef<"div">, "children"> & {
    children: ReactNode;
    onIndexChange?(index: number): void;
  };

/** M09 — block dissolve between stacked images on a decorative canvas (cross-fade fallback). */
export function PixelDissolve(props: PixelDissolveProps) {
  const {
    children,
    index = 0,
    duration,
    easing,
    reducedMotion,
    cell,
    seed,
    maxCells,
    maxDpr,
    onIndexChange,
    controlRef,
    className,
    ...rest
  } = props;
  const ref = useRef<HTMLDivElement | null>(null);
  const latest = useLatest(onIndexChange);
  const current = useRef(index);
  const handle = useEngine<HTMLDivElement, DissolveControl>(
    ref,
    (el) =>
      createPixelDissolve(el, {
        index: current.current,
        duration,
        easing,
        reducedMotion,
        cell,
        seed,
        maxCells,
        maxDpr,
        onIndexChange: (i) => {
          current.current = i;
          latest.current?.(i);
        },
      }),
    { duration, easing, reducedMotion, cell, seed, maxCells, maxDpr },
  );
  useExpose(controlRef, handle);
  useClientLayoutEffect(() => {
    current.current = index;
    handle.current?.show(index);
  }, [index]);
  return (
    <div ref={ref} className={cx("neshel-crossfade", "neshel-dissolve", className)} {...rest}>
      {children}
    </div>
  );
}

// --- M10 ------------------------------------------------------------------------------------------------

export type HoverPanProps = Omit<HoverPanOptions, "media"> &
  WithControl<HoverPanControl> &
  Omit<ComponentPropsWithoutRef<"div">, "children"> & {
    children: ReactElement;
    /** Accessible name of the focusable frame (required with `keyboard`). */
    label?: string;
  };

/** M10 — the single media child follows the pointer inside a clipping frame. */
export function HoverPan(props: HoverPanProps) {
  const {
    children,
    scale,
    spring,
    pointerTypes,
    keyboard,
    step,
    reducedMotion,
    label,
    controlRef,
    className,
    ...rest
  } = props;
  const options = { scale, spring, pointerTypes, keyboard, step, reducedMotion };
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, HoverPanControl>(
    ref,
    (el) => createHoverPan(el, options),
    options,
  );
  useExpose(controlRef, handle);
  return (
    <div
      ref={ref}
      className={cx("neshel-hoverpan", className)}
      {...(keyboard ? { role: "group", "aria-label": label, tabIndex: 0 } : {})}
      {...rest}
    >
      {children}
    </div>
  );
}

export type { CameraPose };
