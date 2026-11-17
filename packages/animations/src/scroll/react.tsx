"use client";
/**
 * React API of the scroll families (Phase 011; contracts/api-011.md §4). Server markup is plain, visible
 * HTML; attachments happen in layout effects on the client; no React state changes per frame (hooks
 * update state only on transitions: enter/leave, active section, layout mode).
 */
import {
  Children,
  type CSSProperties,
  createContext,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ConflictPolicy } from "../core/arbiter.js";
import { type AnyEffectDefinition, attachEffect, type EffectHandle } from "../core/effect.js";
import { optionsKeyOf } from "../core/options-key.js";
import type { PresetInput } from "../core/preset.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import {
  joinClass,
  presetEntries,
  renderHost,
  useFirstRenderHydrating,
  useHostRef,
} from "../react/motion-host.js";
import { type PresetEntry, useMotionPresets } from "../react/use-motion-presets.js";
import {
  createScrollTrigger,
  createSectionSpy,
  type InViewInput,
  observeInView,
  type ScrollTriggerOptions,
  type TriggerMode,
  type TriggerState,
} from "./engine/in-view.js";
import type { DriverPreference } from "./engine/native.js";
import {
  createScrollProgress,
  type RangeInput,
  type ScrollProgress,
  type ScrollProgressOptions,
} from "./engine/progress.js";
import {
  depthParallax,
  imageParallax,
  pinnedScene,
  scrollProgress,
  stickyStack,
} from "./parallax.js";
import { revealOnEnter, staggerOnEnter } from "./triggers.js";

// biome-ignore lint/suspicious/noExplicitAny: presets of any option types.
type AnyPreset = PresetInput<any, any>;

interface HostProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Apply to the single child element instead of rendering a `<div>`. */
  asChild?: boolean;
  /** Conflict reporting for exclusive channels (default: warn in development). */
  conflicts?: ConflictPolicy;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

// --- scene context -----------------------------------------------------------------------------

interface SceneValue {
  timeline: ScrollProgress | undefined;
}
const SceneContext = createContext<SceneValue | undefined>(undefined);

/** The nearest `<ScrollScene>`'s timeline (`undefined` outside a scene or before it mounted). */
export function useScrollScene(): ScrollProgress | undefined {
  return useContext(SceneContext)?.timeline;
}

/** Inject the scene timeline into scroll-family entries that do not set one. */
function withScene(entries: PresetEntry[], scene: SceneValue | undefined): PresetEntry[] | null {
  if (!scene) return entries;
  const needs = entries.some(
    (entry) =>
      entry.effect.family === "scroll" &&
      (entry.options as { timeline?: unknown } | undefined)?.timeline === undefined,
  );
  if (!needs) return entries;
  if (!scene.timeline) return null; // wait for the scene's timeline (one render)
  return entries.map((entry) =>
    entry.effect.family === "scroll" &&
    (entry.options as { timeline?: unknown } | undefined)?.timeline === undefined
      ? {
          effect: entry.effect,
          options: { ...(entry.options as object), timeline: scene.timeline },
        }
      : entry,
  );
}

// --- <ScrollEffect> ---------------------------------------------------------------------------

export type ScrollEffectProps = HostProps & {
  /** One scroll / scroll-trigger effect or preset, or a list composed on the element. */
  preset: AnyPreset | readonly AnyPreset[];
  /** Options of a single preset. */
  options?: object;
};

const SCROLL_FAMILIES = ["scroll", "scroll-trigger"] as const;

/** Any scroll-family effect on a `<div>` (or `asChild`); inside a `<ScrollScene>` it follows the scene. */
export function ScrollEffect({
  preset,
  options,
  asChild = false,
  conflicts,
  className,
  ref,
  children,
  ...rest
}: ScrollEffectProps) {
  const [element, setRef] = useHostRef(ref);
  const scene = useContext(SceneContext);
  const entries = withScene(presetEntries("ScrollEffect", SCROLL_FAMILIES, preset, options), scene);
  useMotionPresets(element, entries ?? [], { conflicts });
  return renderHost(
    "ScrollEffect",
    asChild,
    { ...rest, ref: setRef, className: joinClass("neshel-scroll-effect", className) },
    children,
  );
}

// --- <RevealOnScroll> / <StaggerOnScroll> (ST01–ST04) ----------------------------------------------

export interface RevealOnScrollProps extends HostProps {
  /** Entrance definition or preset (`fadeUp`, …); for `<StaggerOnScroll>` the `stagger` effect/preset. */
  preset: AnyPreset;
  /** Options merged over the preset's. */
  options?: Record<string, unknown>;
  trigger?: InViewInput;
  mode?: TriggerMode;
  onEnter?: () => void;
  onLeave?: () => void;
  onEnterBack?: () => void;
  onLeaveBack?: () => void;
  reducedMotion?: ReducedMotion;
}

function useRevealHost(
  name: string,
  effect: AnyEffectDefinition,
  className: string,
  props: RevealOnScrollProps,
) {
  const {
    preset,
    options,
    trigger,
    mode,
    onEnter,
    onLeave,
    onEnterBack,
    onLeaveBack,
    reducedMotion,
    asChild = false,
    conflicts,
    className: extra,
    ref,
    children,
    ...rest
  } = props;
  const [element, setRef] = useHostRef(ref);
  const hydrating = useFirstRenderHydrating();
  useMotionPresets(
    element,
    [
      {
        effect,
        options: {
          preset,
          options,
          trigger,
          mode,
          onEnter,
          onLeave,
          onEnterBack,
          onLeaveBack,
          reducedMotion,
          initial: hydrating ? "visible" : "hold",
        },
      },
    ],
    { conflicts },
  );
  return renderHost(
    name,
    asChild,
    { ...rest, ref: setRef, className: joinClass(className, extra) },
    children,
  );
}

/** ST01: plays an Entrance preset when the element enters the viewport (hydrated content is not hidden). */
export function RevealOnScroll(props: RevealOnScrollProps) {
  return useRevealHost("RevealOnScroll", revealOnEnter, "neshel-reveal-on-scroll", props);
}

/** ST02: plays the Entrance `stagger` on the children when the container enters the viewport. */
export function StaggerOnScroll(props: RevealOnScrollProps) {
  return useRevealHost("StaggerOnScroll", staggerOnEnter, "neshel-stagger-on-scroll", props);
}

// --- <ScrollScene> / <ScrollLayer> (SP05, SP01, SP10) ------------------------------------------------

export interface ScrollSceneProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Section length in viewport heights (1–20, default 3); the stage is pinned for `length − 1`. */
  length?: number;
  /** SP10: spring-smoothed scene progress. */
  smooth?: boolean;
  /** Native scroll timeline for `--neshel-scene-progress` when verified (default `"auto"`). */
  driver?: DriverPreference;
  /** Progress range (default `["contain 0%", "contain 100%"]`: the pinned span). */
  range?: readonly [RangeInput, RangeInput];
  reducedMotion?: ReducedMotion;
  /** Class of the sticky stage. */
  stageClassName?: string;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

/**
 * SP05: a tall `<section>` whose stage is pinned with CSS `position: sticky` (no JS spacer). Writes
 * `--neshel-scene-progress` (0–1) on the section and shares its timeline with `<ScrollLayer>` and
 * `<ScrollEffect>` children (`useScrollScene()`).
 */
export function ScrollScene({
  length = 3,
  smooth,
  driver,
  range,
  reducedMotion,
  stageClassName,
  className,
  style,
  ref,
  children,
  ...rest
}: ScrollSceneProps) {
  const [section, setRef] = useHostRef<HTMLElement>(ref);
  const [value, setValue] = useState<SceneValue>({ timeline: undefined });
  const key = optionsKeyOf([smooth, range, reducedMotion]);
  if (!(typeof length === "number" && length >= 1 && length <= 20)) {
    throw new RangeError(
      `[@neshel-ui/animations] ScrollScene: invalid length ${String(length)} (1–20).`,
    );
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` captures the timeline options.
  useLayoutEffect(() => {
    const element = section.current;
    if (!element) return;
    const timeline = createScrollProgress({
      subject: element,
      range: range ?? ["contain 0%", "contain 100%"],
      smooth,
      reducedMotion,
    });
    setValue({ timeline });
    return () => {
      setValue({ timeline: undefined });
      timeline.destroy();
    };
  }, [section, key]);

  useLayoutEffect(() => {
    const element = section.current as (HTMLElement & { style: CSSStyleDeclaration }) | null;
    if (!element || !value.timeline) return;
    const handle = attachEffect(element, pinnedScene, {
      timeline: value.timeline,
      driver,
      reducedMotion,
    });
    return () => handle.destroy();
  }, [section, value.timeline, driver, reducedMotion]);

  return (
    <SceneContext.Provider value={value}>
      <section
        {...rest}
        ref={setRef}
        className={joinClass("neshel-scene", className)}
        style={{ "--neshel-scene-length": length, ...style } as CSSProperties}
      >
        <div className={joinClass("neshel-scene-stage", stageClassName)}>{children}</div>
      </section>
    </SceneContext.Provider>
  );
}

export interface ScrollLayerProps extends HostProps {
  /** SP01 depth (−5…5, default 1). */
  depth?: number;
  /** Travel at depth 1 over the scene, px (default 200). */
  distance?: number;
  axis?: "x" | "y";
  reducedMotion?: ReducedMotion;
}

/** SP01: a depth layer of the nearest `<ScrollScene>` (or of its own viewport range outside a scene). */
export function ScrollLayer({ depth, distance, axis, reducedMotion, ...props }: ScrollLayerProps) {
  return (
    <ScrollEffect
      {...props}
      className={joinClass("neshel-scroll-layer", props.className)}
      preset={depthParallax}
      options={{ depth, distance, axis, reducedMotion }}
    />
  );
}

// --- <ScrollProgressBar> (SP03) ------------------------------------------------------------------

export interface ScrollProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Scroll container (default: the page). */
  source?: Element | null;
  /** `"top"` (default, fixed to the viewport top), `"bottom"` or `"static"` (in flow). */
  position?: "top" | "bottom" | "static";
  driver?: DriverPreference;
  ref?: Ref<HTMLDivElement>;
}

/** SP03: decorative reading-progress bar (`aria-hidden`); the browser's scrollbar stays the real control. */
export function ScrollProgressBar({
  source,
  position = "top",
  driver,
  className,
  ref,
  ...rest
}: ScrollProgressBarProps) {
  const [element, setRef] = useHostRef(ref);
  useMotionPresets(element, [{ effect: scrollProgress, options: { source, driver } }]);
  return (
    <div
      {...rest}
      ref={setRef}
      aria-hidden="true"
      data-position={position}
      className={joinClass("neshel-scroll-progress", className)}
    />
  );
}

// --- <StickyStack> (SP09) ------------------------------------------------------------------------

export interface StickyStackProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Sticky top of the first card (CSS length, default `"1rem"`). */
  top?: string;
  /** Offset between stacked cards (CSS length, default `"1.25rem"`). */
  offset?: string;
  /** Scale removed from a covered card (default 0.05; 0 = CSS only). */
  scale?: number;
  reducedMotion?: ReducedMotion;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/** SP09: each child is wrapped in a sticky card slot whose index is in the server markup. */
export function StickyStack({
  top,
  offset,
  scale,
  reducedMotion,
  className,
  style,
  ref,
  children,
  ...rest
}: StickyStackProps) {
  const [element, setRef] = useHostRef(ref);
  useMotionPresets(element, [{ effect: stickyStack, options: { scale, reducedMotion } }]);
  const items = Children.toArray(children);
  return (
    <div
      {...rest}
      ref={setRef}
      className={joinClass("neshel-stack", className)}
      style={
        {
          ...(top ? { "--neshel-stack-top": top } : {}),
          ...(offset ? { "--neshel-stack-offset": offset } : {}),
          ...style,
        } as CSSProperties
      }
    >
      {items.map((child, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: slots follow child order.
          key={index}
          className="neshel-stack-item"
          style={{ "--neshel-stack-index": index } as CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// --- <ParallaxImage> (SP06) ----------------------------------------------------------------------

export interface ParallaxImageProps extends HostProps {
  /** Travel each way, px (default 48). */
  amount?: number;
  reducedMotion?: ReducedMotion;
}

/** SP06: a clipping frame (`<div>` or `asChild`) whose first element child (img/video/picture) moves. */
export function ParallaxImage({
  amount,
  reducedMotion,
  asChild = false,
  className,
  ref,
  children,
  ...rest
}: ParallaxImageProps) {
  const [frame, setRef] = useHostRef(ref);
  const options = { amount, reducedMotion };
  imageParallax.resolve(options);
  const latest = useRef(options);
  latest.current = options;
  const handle = useRef<EffectHandle<unknown> | undefined>(undefined);
  const key = optionsKeyOf(options);

  useLayoutEffect(() => {
    const element = frame.current;
    const media = element?.firstElementChild as
      | (HTMLElement & { style: CSSStyleDeclaration })
      | null;
    if (!element || !media) return;
    handle.current = attachEffect(media, imageParallax, { ...latest.current, frame: element });
    return () => {
      handle.current?.destroy();
      handle.current = undefined;
    };
  }, [frame]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` captures the option values.
  useLayoutEffect(() => {
    const element = frame.current;
    if (element) handle.current?.update({ ...latest.current, frame: element });
  }, [key]);

  return renderHost(
    "ParallaxImage",
    asChild,
    { ...rest, ref: setRef, className: joinClass("neshel-parallax-frame", className) },
    children,
  );
}

// --- hooks ---------------------------------------------------------------------------------------

/**
 * A timeline for `ref`'s element (its view range) or, with `ref` omitted/null, for the page. Created after
 * mount (one render); never re-renders per frame — read it in effects or subscribe.
 */
export function useScrollProgress(
  ref?: RefObject<Element | null> | null,
  options: Omit<ScrollProgressOptions, "subject"> = {},
): ScrollProgress | undefined {
  const [timeline, setTimeline] = useState<ScrollProgress | undefined>(undefined);
  const key = optionsKeyOf(options);
  const latest = useRef(options);
  latest.current = options;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` captures the option values.
  useEffect(() => {
    const subject = ref ? ref.current : null;
    if (ref && !subject) return;
    const created = createScrollProgress({ ...latest.current, subject });
    setTimeline(created);
    return () => {
      setTimeline(undefined);
      created.destroy();
    };
  }, [ref, key]);
  return timeline;
}

/** Whether `ref`'s element is inside the trigger area (state changes only on enter/leave). */
export function useInView(ref: RefObject<Element | null>, trigger?: InViewInput): boolean {
  const [inView, setInView] = useState(false);
  const key = optionsKeyOf(trigger);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` captures the trigger.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let last: boolean | undefined;
    return observeInView(element, trigger, (report) => {
      if (report.inView === last) return; // transitions only
      last = report.inView;
      setInView(report.inView);
    });
  }, [ref, key]);
  return inView;
}

/** ST04: trigger state of `ref`'s element; callbacks are read from the latest render. */
export function useScrollTrigger(
  ref: RefObject<Element | null>,
  options: ScrollTriggerOptions = {},
): TriggerState {
  const [state, setState] = useState<TriggerState>("idle");
  const latest = useRef(options);
  latest.current = options;
  const key = optionsKeyOf([options.trigger, options.mode]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` captures trigger and mode.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const trigger = createScrollTrigger(element, {
      trigger: latest.current.trigger,
      mode: latest.current.mode,
      onEnter: () => latest.current.onEnter?.(),
      onLeave: () => latest.current.onLeave?.(),
      onEnterBack: () => latest.current.onEnterBack?.(),
      onLeaveBack: () => latest.current.onLeaveBack?.(),
      onChange: (next) => {
        setState(next);
        latest.current.onChange?.(next);
      },
    });
    return () => trigger.destroy();
  }, [ref, key]);
  return state;
}

export interface SectionSpyHookOptions {
  /** Activation line (fraction of the viewport from the top, default 0.3). */
  line?: number;
  source?: Element | null;
}

/** ST08: id of the active section among `ids` (state changes only when the section changes). */
export function useSectionSpy(
  ids: readonly string[],
  options: SectionSpyHookOptions = {},
): string | undefined {
  const [active, setActive] = useState<string | undefined>(undefined);
  const key = optionsKeyOf([ids, options.line, options.source]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` captures ids and options.
  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    const spy = createSectionSpy(sections, {
      line: options.line,
      source: options.source,
      onChange: (index, section) => setActive(index < 0 ? undefined : (section as HTMLElement).id),
    });
    return () => spy.destroy();
  }, [key]);
  return active;
}
