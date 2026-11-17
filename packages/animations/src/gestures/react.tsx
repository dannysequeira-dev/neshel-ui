"use client";
/**
 * React bindings of the gestures family (Phase 012; contracts/api-012.md §1, accessibility-012.md). `<Gesture>`
 * is the generic primitive (`preset={drag}`, `preset={[drag, squashStretch]}`); the other components render the
 * package-owned parts the alternatives need (dismiss/refresh/zoom buttons, live regions, reorder handles).
 * Server markup never depends on measurements; effects attach after hydration; nothing renders per frame.
 */
import {
  Children,
  createContext,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { animateValue } from "../core/controls.js";
import type { SpringPreset } from "../core/defaults.js";
import { type MotionValue, motionValue } from "../core/motion-value.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { prefersReducedMotion, shouldReduceMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import { type EffectPrimitiveProps, useEffectPrimitive } from "../react/effect-primitive.js";
import { joinClass, renderHost, useHostRef } from "../react/motion-host.js";
import { useMotionPresets } from "../react/use-motion-presets.js";
import { type SwipeDismissOptions, swipeDismiss } from "./drag.js";
import { createGestureControls, type GestureControls } from "./engine/controls.js";
import { type ReorderOptions, reorder, reorderMove } from "./reorder.js";
import {
  type ElasticEdgeOptions,
  elasticEdge,
  type PullToRefreshOptions,
  pullToRefresh,
} from "./scroller.js";
import { type PinchZoomOptions, pinchZoom } from "./transform.js";

export type GestureProps<Options, Resolved> = EffectPrimitiveProps<Options, Resolved>;

/** `<Gesture>`: physics & gesture effects on a `<div>` or, with `asChild`, your own element. */
export function Gesture<Options, Resolved>(props: GestureProps<Options, Resolved>) {
  return useEffectPrimitive("Gesture", ["physics"], "neshel-gesture", props);
}

/** A stable controls object for buttons and commands (the non-gesture alternatives). */
export function useGestureControls(): GestureControls {
  const [controls] = useState(createGestureControls);
  return controls;
}

/**
 * G05 as a hook: a motion value that chases `source` with a spring (no React render per change). Reduced
 * motion jumps.
 */
export function useSpringFollow(
  source: MotionValue,
  spring: SpringOptions | SpringPreset = { stiffness: 120, damping: 18 },
  reducedMotion: ReducedMotion = "user",
): MotionValue {
  const [follower] = useState(() => motionValue(source.get()));
  const latest = useRef({ spring, reducedMotion });
  latest.current = { spring, reducedMotion };
  useEffect(() => {
    const chase = (value: number) => {
      if (shouldReduceMotion(latest.current.reducedMotion, prefersReducedMotion()))
        follower.set(value);
      else animateValue(follower, value, { type: "spring", spring: latest.current.spring });
    };
    chase(source.get());
    return source.subscribe(chase);
  }, [source, follower]);
  return follower;
}

type DivProps = Omit<HTMLAttributes<HTMLDivElement>, "children">;

/* G03 ---------------------------------------------------------------------------------------------- */
export interface SwipeDismissProps extends DivProps, Omit<SwipeDismissOptions, "controls"> {
  /** Accessible name of the built-in dismiss button (default "Dismiss"). */
  dismissLabel?: string;
  /** Render the built-in dismiss button (default true). Provide your own accessible control when false. */
  dismissButton?: boolean;
  controls?: GestureControls;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/** Swipe to dismiss with a built-in, accessible dismiss button (WCAG 2.5.7). */
export function SwipeDismiss(props: SwipeDismissProps) {
  const {
    direction,
    distance,
    velocity,
    keyboard,
    onDismiss,
    pointerTypes,
    threshold,
    disabled,
    reducedMotion,
    dismissLabel = "Dismiss",
    dismissButton = true,
    controls: external,
    className,
    ref,
    children,
    ...rest
  } = props;
  const own = useGestureControls();
  const controls = external ?? own;
  const [element, setRef] = useHostRef(ref);
  useMotionPresets(element, [
    {
      effect: swipeDismiss,
      options: {
        direction,
        distance,
        velocity,
        keyboard,
        onDismiss,
        pointerTypes,
        threshold,
        disabled,
        reducedMotion,
        controls,
      },
    },
  ]);
  return (
    <div {...rest} ref={setRef} className={joinClass("neshel-swipe", className)}>
      {children}
      {dismissButton ? (
        <button
          type="button"
          className="neshel-gesture-button neshel-swipe-dismiss"
          aria-label={dismissLabel}
          disabled={disabled}
          onClick={() => controls.dismiss()}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}

/* G04 ---------------------------------------------------------------------------------------------- */
export interface PullToRefreshProps
  extends DivProps,
    Omit<PullToRefreshOptions, "controls" | "onStatus"> {
  /** Label of the built-in refresh button (default "Refresh"). */
  refreshLabel?: string;
  /** Render the built-in refresh button (default true). */
  refreshButton?: boolean;
  /** Announcements (default "Refreshing…" / "Content updated"). */
  statusLabels?: { refreshing?: string; done?: string };
  controls?: GestureControls;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/**
 * An optional pull-to-refresh indicator on a package-rendered scroll container, plus an explicit refresh
 * button. Never blocks scrolling or the browser's own behaviour (research R3).
 */
export function PullToRefresh(props: PullToRefreshProps) {
  const {
    threshold,
    onRefresh,
    pointerTypes,
    disabled,
    reducedMotion,
    refreshLabel = "Refresh",
    refreshButton = true,
    statusLabels,
    controls: external,
    className,
    ref,
    children,
    ...rest
  } = props;
  const own = useGestureControls();
  const controls = external ?? own;
  const scroller = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const labels = { refreshing: "Refreshing…", done: "Content updated", ...statusLabels };
  useMotionPresets(scroller, [
    {
      effect: pullToRefresh,
      options: {
        threshold,
        onRefresh,
        pointerTypes,
        disabled,
        reducedMotion,
        controls,
        onStatus: (next: "refreshing" | "done") => {
          setBusy(next === "refreshing");
          setStatus(next === "refreshing" ? labels.refreshing : labels.done);
        },
      },
    },
  ]);
  return (
    <div {...rest} ref={ref} className={joinClass("neshel-pull", className)}>
      {refreshButton ? (
        <button
          type="button"
          className="neshel-gesture-button neshel-pull-button"
          disabled={disabled || busy}
          onClick={() => controls.refresh()}
        >
          {refreshLabel}
        </button>
      ) : null}
      <div ref={scroller} className="neshel-pull-scroller">
        {children}
      </div>
      <span className="neshel-sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}

/* G06 ---------------------------------------------------------------------------------------------- */
export interface ElasticScrollProps extends DivProps, ElasticEdgeOptions {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/** A package-rendered scroll container whose content stretches visually at its edges (decorative). */
export function ElasticScroll(props: ElasticScrollProps) {
  const { axis, max, reducedMotion, disabled, className, ref, children, ...rest } = props;
  const content = useRef<HTMLDivElement | null>(null);
  useMotionPresets(content, [
    { effect: elasticEdge, options: { axis, max, reducedMotion, disabled } },
  ]);
  return (
    <div
      {...rest}
      ref={ref}
      className={joinClass("neshel-elastic", className)}
      data-axis={axis ?? "y"}
    >
      <div ref={content} className="neshel-elastic-content">
        {children}
      </div>
    </div>
  );
}

/* G08 ---------------------------------------------------------------------------------------------- */
export interface PinchZoomProps extends DivProps, Omit<PinchZoomOptions, "controls"> {
  /** Accessible name of the zoomable region (default "Zoomable media"). */
  label?: string;
  /** Render the zoom buttons (default true). */
  zoomControls?: boolean;
  /** Button labels (defaults "Zoom in", "Zoom out", "Reset zoom"). */
  controlLabels?: { zoomIn?: string; zoomOut?: string; reset?: string };
  controls?: GestureControls;
  ref?: Ref<HTMLDivElement>;
  /** Exactly one media element (img, video, canvas, picture, …). */
  children: ReactElement;
}

/** Pinch-zoom media with zoom buttons and keys (WCAG 2.5.1); one-finger page scrolling kept at scale 1. */
export function PinchZoom(props: PinchZoomProps) {
  const {
    minScale,
    maxScale,
    doubleTapScale,
    wheel,
    step,
    spring,
    onZoomChange,
    pointerTypes,
    threshold,
    disabled,
    reducedMotion,
    label = "Zoomable media",
    zoomControls = true,
    controlLabels,
    controls: external,
    className,
    ref,
    children,
    ...rest
  } = props;
  const own = useGestureControls();
  const controls = external ?? own;
  const media = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const labels = { zoomIn: "Zoom in", zoomOut: "Zoom out", reset: "Reset zoom", ...controlLabels };
  useMotionPresets(media, [
    {
      effect: pinchZoom,
      options: {
        minScale,
        maxScale,
        doubleTapScale,
        wheel,
        step,
        spring,
        pointerTypes,
        threshold,
        disabled,
        reducedMotion,
        controls,
        onZoomChange: (next: number) => {
          setScale(next);
          onZoomChange?.(next);
        },
      },
    },
  ]);
  const max = maxScale ?? 4;
  const min = minScale ?? 1;
  return (
    <div {...rest} ref={ref} className={joinClass("neshel-zoom", className)}>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: the frame takes the zoom keys (+, -, 0, arrows). */}
      {/* biome-ignore lint/a11y/useSemanticElements: a media group, not a form (no fieldset semantics). */}
      <div className="neshel-zoom-frame" role="group" aria-label={label} tabIndex={0}>
        {renderHost("PinchZoom", true, { ref: media, className: "neshel-zoom-media" }, children)}
      </div>
      {zoomControls ? (
        <div className="neshel-zoom-controls">
          <button
            type="button"
            className="neshel-gesture-button"
            onClick={() => controls.zoomBy(step ?? 1.5)}
            disabled={disabled || scale >= max - 1e-3}
          >
            {labels.zoomIn}
          </button>
          <button
            type="button"
            className="neshel-gesture-button"
            onClick={() => controls.zoomBy(1 / (step ?? 1.5))}
            disabled={disabled || scale <= min + 1e-3}
          >
            {labels.zoomOut}
          </button>
          <button
            type="button"
            className="neshel-gesture-button"
            onClick={() => controls.reset()}
            disabled={disabled || Math.abs(scale - 1) < 1e-3}
          >
            {labels.reset}
          </button>
          <span className="neshel-sr-only" role="status" aria-live="polite">
            {`${Math.round(scale * 100)}%`}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* G10 ---------------------------------------------------------------------------------------------- */
interface ReorderContextValue {
  list: { current: HTMLElement | null };
  count: number;
  instructionsId: string;
}
const ReorderContext = createContext<ReorderContextValue | null>(null);
const ItemContext = createContext<{
  element: { current: HTMLElement | null };
  index: number | undefined;
  label: string | undefined;
} | null>(null);

export interface ReorderProps
  extends Omit<HTMLAttributes<HTMLElement>, "children">,
    Omit<ReorderOptions, "announce"> {
  /** List element (default `"ul"`). */
  as?: "ul" | "ol" | "div";
  /** Keyboard instructions read with each handle (default English). */
  instructions?: string;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

/**
 * Drag-to-reorder list. The order is yours: `onReorder(from, to)` asks you to move an item; React re-renders
 * and the items settle from where they are shown (no DOM reordering by the package, no lost state).
 */
export function Reorder(props: ReorderProps) {
  const {
    as: Tag = "ul",
    axis,
    onReorder,
    announcements,
    pointerTypes,
    spring,
    reducedMotion,
    disabled,
    instructions = "Press Space or Enter to pick up, the arrow keys to move, Space or Enter to drop, Escape to cancel.",
    className,
    ref,
    children,
    ...rest
  } = props;
  const [list, setRef] = useHostRef<HTMLElement>(ref);
  const live = useRef<HTMLSpanElement | null>(null);
  const instructionsId = useId();
  const announce = useMemo(
    () => (message: string) => {
      const region = live.current;
      if (!region) return;
      region.textContent = "";
      region.textContent = message;
    },
    [],
  );
  useMotionPresets(list, [
    {
      effect: reorder,
      options: {
        axis,
        onReorder,
        announcements,
        pointerTypes,
        spring,
        reducedMotion,
        disabled,
        announce,
      },
    },
  ]);
  const count = Children.toArray(children).filter(isValidElement).length;
  const value = useMemo(() => ({ list, count, instructionsId }), [list, count, instructionsId]);
  return (
    <ReorderContext.Provider value={value}>
      <Tag
        {...rest}
        ref={setRef as never}
        className={joinClass("neshel-reorder", className)}
        data-axis={axis ?? "y"}
      >
        {children}
      </Tag>
      <span id={instructionsId} className="neshel-sr-only">
        {instructions}
      </span>
      <span ref={live} className="neshel-sr-only" role="status" aria-live="polite" />
    </ReorderContext.Provider>
  );
}

export interface ReorderItemProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Item element (default `"li"`). */
  as?: "li" | "div";
  /** Position of the item in your order (enables `useReorderItem().isFirst/isLast`). */
  index?: number;
  /** Name used in announcements (default: the item's text). */
  label?: string;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

export function ReorderItem(props: ReorderItemProps) {
  const { as: Tag = "li", index, label, className, ref, children, ...rest } = props;
  const [element, setRef] = useHostRef<HTMLElement>(ref);
  const value = useMemo(() => ({ element, index, label }), [element, index, label]);
  return (
    <ItemContext.Provider value={value}>
      <Tag
        {...rest}
        ref={setRef as never}
        className={joinClass("neshel-reorder-item", className)}
        data-neshel-reorder-item=""
        data-neshel-reorder-label={label}
      >
        {children}
      </Tag>
    </ItemContext.Provider>
  );
}

export interface ReorderHandleProps extends Omit<HTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible name (default "Reorder <label>"). */
  "aria-label"?: string;
  ref?: Ref<HTMLButtonElement>;
  children?: ReactNode;
}

/** The drag handle and keyboard control of an item (a real button; touch drags start here). */
export function ReorderHandle(props: ReorderHandleProps) {
  const { className, children, ref, style, ...rest } = props;
  const list = useContext(ReorderContext);
  const item = useContext(ItemContext);
  return (
    <button
      type="button"
      aria-label={item?.label ? `Reorder ${item.label}` : "Reorder"}
      aria-describedby={list?.instructionsId}
      aria-pressed={false}
      {...rest}
      ref={ref}
      style={{ touchAction: "none", ...style }}
      className={joinClass("neshel-gesture-button neshel-reorder-handle", className)}
      data-neshel-reorder-handle=""
    >
      {children ?? <span aria-hidden="true">⠿</span>}
    </button>
  );
}

/** Move-up / move-down helpers for custom controls inside a `<ReorderItem>` (WCAG 2.5.7). */
export function useReorderItem() {
  const list = useContext(ReorderContext);
  const item = useContext(ItemContext);
  const move = (step: number) => {
    const l = list?.list.current;
    const element = item?.element.current;
    if (l && element) reorderMove(l, element, step);
  };
  return {
    moveUp: () => move(-1),
    moveDown: () => move(1),
    index: item?.index,
    count: list?.count ?? 0,
    isFirst: item?.index === 0,
    isLast: item?.index !== undefined && list ? item.index === list.count - 1 : false,
  };
}
