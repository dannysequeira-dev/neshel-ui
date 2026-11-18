"use client";
/**
 * React API of the Cinematic & Scenes family (Phase 013; contracts/cinematic-api.md). Server markup is the
 * visible content (package layers are rendered `hidden`); engines attach in layout effects on the client;
 * React state changes only on discrete events (frame or chapter changes), never per frame.
 */
import {
  Children,
  type CSSProperties,
  createContext,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PresetInput } from "../core/preset.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import {
  joinClass,
  renderHost,
  useFirstRenderHydrating,
  useHostRef,
} from "../react/motion-host.js";
import { type Camera, type CameraOptions, type CameraTarget, createCamera } from "./camera.js";
import { type Cover, type CoverPattern, createCover, panelCount } from "./cover.js";
import { createDepthOfField, type DepthOfField as DepthControl } from "./depth.js";
import type { Pose, Styled } from "./engine/pose.js";
import { createTimeline, type Timeline, type TrackInput } from "./engine/timeline.js";
import { createLetterbox, type LetterboxControl } from "./letterbox.js";
import {
  type ChapterInput,
  createSceneChapters,
  type ProgressSource,
  type SceneChapters as SceneControl,
} from "./scene.js";
import { createSpotlight, type Spotlight as SpotlightControl } from "./spotlight.js";
import { createStoryboard, type Storyboard as StoryboardControl } from "./storyboard.js";
import { titleSequence } from "./title.js";

// biome-ignore lint/suspicious/noExplicitAny: entrance definitions of any option types.
type AnyPreset = PresetInput<any, any>;
type DivProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
};

const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

/** Keep the latest value in a ref (callbacks read it without re-attaching). */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// --- C02 <SceneChapters> / <Chapter> / <SceneSegment> -------------------------------------------------

interface SegmentEntry {
  chapter: string;
  element: () => Element | null;
  build: (element: Styled) => TrackInput;
  span: readonly [number, number];
}

interface SceneRegistry {
  chapters: Map<string, { weight: number; element: () => Element | null }>;
  segments: Set<SegmentEntry>;
  invalidate(): void;
}

const SceneContext = createContext<SceneRegistry | null>(null);
const ChapterContext = createContext<string | null>(null);

export interface SceneChaptersProps extends DivProps {
  /** Scrub source: the `useScrollScene()` timeline of a `<ScrollScene>`, or any `{ get, subscribe }`. */
  source?: ProgressSource;
  /** Controlled progress 0–1 (used when there is no `source`). */
  progress?: number;
  /** Clock mode: play the scene when mounted (no source, no `progress`). */
  autoplay?: boolean;
  /** ms per chapter weight unit in clock mode (default 1500). */
  unit?: number;
  reducedMotion?: ReducedMotion;
  onChapterChange?(id: string, index: number): void;
}

/** C02: chapters and segments scrubbed by a progress source (e.g. a scroll scene) or played on a clock. */
export function SceneChapters({
  source,
  progress,
  autoplay,
  unit,
  reducedMotion,
  onChapterChange,
  className,
  children,
  ...rest
}: SceneChaptersProps) {
  const latest = useLatest({ source, progress, autoplay, unit, reducedMotion, onChapterChange });
  const scene = useRef<SceneControl | undefined>(undefined);
  const unsubscribe = useRef<(() => void) | undefined>(undefined);
  const queued = useRef(false);
  const registry = useRef<SceneRegistry | null>(null);

  function build(): void {
    unsubscribe.current?.();
    unsubscribe.current = undefined;
    scene.current?.destroy();
    scene.current = undefined;
    const reg = registry.current as SceneRegistry;
    const entries = [...reg.chapters.entries()]
      .map(([id, chapter]) => ({ id, ...chapter, node: chapter.element() }))
      .sort((a, b) => (a.node && b.node && a.node.compareDocumentPosition(b.node) & 2 ? 1 : -1));
    if (entries.length === 0) return;
    const current = latest.current;
    const next = createSceneChapters({
      chapters: entries.map(
        (entry): ChapterInput => ({ id: entry.id, weight: entry.weight, element: entry.node }),
      ),
      unit: current.unit,
      reducedMotion: current.reducedMotion,
      onChapterChange: (id, index) => latest.current.onChapterChange?.(id, index),
    });
    for (const segment of reg.segments) {
      const element = segment.element() as Styled | null;
      if (!element || !reg.chapters.has(segment.chapter)) continue;
      next.segment(segment.chapter, segment.build(element), segment.span);
    }
    scene.current = next;
    if (current.source) unsubscribe.current = next.drive(current.source);
    else if (current.progress !== undefined) next.seek(current.progress);
    else if (current.autoplay) next.play();
  }

  registry.current ??= {
    chapters: new Map(),
    segments: new Set(),
    invalidate() {
      if (!scene.current || queued.current) return; // the first build runs in the parent's effect
      queued.current = true;
      queueMicrotask(() => {
        queued.current = false;
        if (scene.current) build();
      });
    },
  };

  useClientLayoutEffect(() => {
    build();
    return () => {
      unsubscribe.current?.();
      unsubscribe.current = undefined;
      scene.current?.destroy();
      scene.current = undefined;
    };
  }, [source, unit, reducedMotion, autoplay]);

  useClientLayoutEffect(() => {
    if (!source && progress !== undefined) scene.current?.seek(progress);
  }, [progress, source]);

  return (
    <SceneContext.Provider value={registry.current}>
      <div {...rest} className={joinClass("neshel-scene-chapters", className)}>
        {children}
      </div>
    </SceneContext.Provider>
  );
}

export interface ChapterProps extends DivProps {
  id: string;
  /** Relative length (0.1–10, default 1). */
  weight?: number;
}

/** A chapter of the nearest `<SceneChapters>`; marked `data-active` while active. */
export function Chapter({ id, weight = 1, children, ref, ...rest }: ChapterProps) {
  const registry = useContext(SceneContext);
  const [element, setRef] = useHostRef<HTMLDivElement>(ref);
  useClientLayoutEffect(() => {
    if (!registry) return;
    registry.chapters.set(id, { weight, element: () => element.current });
    registry.invalidate();
    return () => {
      registry.chapters.delete(id);
      registry.invalidate();
    };
  }, [registry, id, weight]);
  return (
    <ChapterContext.Provider value={id}>
      <div {...rest} id={id} ref={setRef} data-neshel-chapter={id}>
        {children}
      </div>
    </ChapterContext.Provider>
  );
}

export interface SceneSegmentProps extends DivProps {
  /** An Entrance definition or preset (triggered as the chapter crosses it)… */
  effect?: AnyPreset;
  options?: object;
  /** …or a pose transition (`from` → `to`; default `to` is the identity). */
  from?: Pose;
  to?: Pose;
  /** `[start, end]` as fractions of the chapter (default `[0, 1]`). */
  span?: readonly [number, number];
  asChild?: boolean;
}

/** A segment of the enclosing `<Chapter>`: its element follows the chapter's progress. */
export function SceneSegment({
  effect,
  options,
  from,
  to,
  span = [0, 1],
  asChild = false,
  children,
  ref,
  ...rest
}: SceneSegmentProps) {
  const registry = useContext(SceneContext);
  const chapter = useContext(ChapterContext);
  const [element, setRef] = useHostRef<HTMLDivElement>(ref);
  const latest = useLatest({ effect, options, from, to });
  const [a, b] = span;
  useClientLayoutEffect(() => {
    if (!registry || !chapter) return;
    const entry: SegmentEntry = {
      chapter,
      element: () => element.current,
      span: [a, b],
      build: (target) => {
        const { effect: e, options: opts, from: f, to: t } = latest.current;
        return e ? { target, effect: e, options: opts } : { target, from: f, to: t ?? {} };
      },
    };
    registry.segments.add(entry);
    registry.invalidate();
    return () => {
      registry.segments.delete(entry);
      registry.invalidate();
    };
  }, [registry, chapter, a, b]);
  return renderHost("SceneSegment", asChild, { ...rest, ref: setRef }, children);
}

// --- C03 <CameraStage> ---------------------------------------------------------------------------

export interface CameraHandle {
  readonly current: Camera | undefined;
  to(target: CameraTarget, options?: { duration?: number }): Promise<unknown>;
  jump(target: CameraTarget): void;
}

/** A stable handle for `<CameraStage camera={…}>`. */
export function useCamera(): CameraHandle {
  const handle = useRef<(CameraHandle & { set(camera: Camera | undefined): void }) | null>(null);
  if (!handle.current) {
    let live: Camera | undefined;
    handle.current = {
      get current() {
        return live;
      },
      set(camera) {
        live = camera;
      },
      to: (target, options) => (live ? live.to(target, options) : Promise.resolve()),
      jump: (target) => live?.jump(target),
    };
  }
  return handle.current;
}

export interface CameraStageProps
  extends Omit<HTMLAttributes<HTMLElement>, "children">,
    Omit<CameraOptions, "onChange"> {
  /** Accessible name of the stage region (required: it is a scrollable region without JS). */
  label: string;
  camera?: CameraHandle;
  canvasClassName?: string;
  canvasStyle?: CSSProperties;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

/** C03: a stage (viewport) over a large canvas; the camera pans and zooms the canvas. */
export function CameraStage({
  label,
  camera,
  minZoom,
  maxZoom,
  bounds,
  padding,
  followFocus,
  initial,
  reducedMotion,
  canvasClassName,
  canvasStyle,
  className,
  children,
  ref,
  ...rest
}: CameraStageProps) {
  const [stage, setRef] = useHostRef<HTMLElement>(ref);
  const canvas = useRef<HTMLDivElement>(null);
  useClientLayoutEffect(() => {
    if (!stage.current || !canvas.current) return;
    const control = createCamera(stage.current, canvas.current, {
      minZoom,
      maxZoom,
      bounds,
      padding,
      followFocus,
      initial,
      reducedMotion,
    });
    (camera as (CameraHandle & { set?(c: Camera | undefined): void }) | undefined)?.set?.(control);
    return () => {
      (camera as (CameraHandle & { set?(c: Camera | undefined): void }) | undefined)?.set?.(
        undefined,
      );
      control.destroy();
    };
  }, [camera, minZoom, maxZoom, bounds, padding, followFocus, reducedMotion]);
  return (
    <section
      {...rest}
      ref={setRef}
      aria-label={label}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-focusable (no JS).
      tabIndex={0}
      className={joinClass("neshel-camera-stage", className)}
    >
      <div
        ref={canvas}
        className={joinClass("neshel-camera-canvas", canvasClassName)}
        style={canvasStyle}
      >
        {children}
      </div>
    </section>
  );
}

// --- C04 / C05 <SplitReveal> / <CurtainReveal> -------------------------------------------------------

interface CoverProps extends DivProps {
  /** Controlled: open (true) or covered (false). Omitted: reveals once when mounted on the client. */
  open?: boolean;
  /** Reveal on hydration of server markup too (default false: server content is never covered again). */
  appear?: "client" | "always";
  duration?: number;
  reducedMotion?: ReducedMotion;
  onOpenChange?(open: boolean): void;
}

function useCover(
  name: string,
  pattern: CoverPattern,
  slats: number,
  {
    open,
    appear = "client",
    duration,
    reducedMotion,
    className,
    children,
    ref,
    ...rest
  }: CoverProps,
) {
  const [container, setRef] = useHostRef<HTMLDivElement>(ref);
  const hydrating = useFirstRenderHydrating();
  const cover = useRef<Cover | undefined>(undefined);
  const latest = useLatest({ open, duration });
  useClientLayoutEffect(() => {
    if (!container.current) return;
    const initialOpen = latest.current.open ?? (hydrating && appear !== "always");
    const control = createCover(container.current, {
      pattern,
      slats,
      covered: !initialOpen,
      reducedMotion,
    });
    cover.current = control;
    if (latest.current.open === undefined && !initialOpen) {
      void control.open({ duration: latest.current.duration });
    }
    return () => {
      control.destroy();
      cover.current = undefined;
    };
  }, [pattern, slats, reducedMotion]);
  useEffect(() => {
    if (open === undefined || !cover.current) return;
    const target = open ? 1 : 0;
    if (cover.current.progress === target) return;
    void (open ? cover.current.open({ duration }) : cover.current.close({ duration }));
  }, [open, duration]);
  const count = panelCount(pattern, slats);
  return (
    <div
      {...rest}
      ref={setRef}
      className={joinClass("neshel-cover", className)}
      data-neshel-effect={name}
    >
      {children}
      <div className="neshel-cover-layers" aria-hidden="true" hidden data-pattern={pattern}>
        {Array.from({ length: count }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: panels are positional and never reorder.
          <div key={index} className="neshel-cover-panel" data-index={index} />
        ))}
      </div>
    </div>
  );
}

export interface SplitRevealProps extends CoverProps {
  /** `"x"`: halves part left/right (default); `"y"`: top/bottom. */
  direction?: "x" | "y";
}

/** C04: two package-rendered halves part to reveal the content. */
export function SplitReveal({ direction = "x", ...props }: SplitRevealProps) {
  return useCover("split-reveal", direction === "y" ? "split-y" : "split-x", 2, props);
}

export interface CurtainRevealProps extends CoverProps {
  pattern?: "curtain" | "shutter";
  /** Shutter slats (2–12, default 6). */
  slats?: number;
}

/** C05: a curtain (two drapes) or a shutter (slats) opens over the content. */
export function CurtainReveal({ pattern = "curtain", slats = 6, ...props }: CurtainRevealProps) {
  return useCover("curtain-reveal", pattern, slats, props);
}

// --- C06 <TitleSequence> ---------------------------------------------------------------------------

export interface TitleSequenceProps extends DivProps {
  /** Entrance (definition or preset) triggered for every line. */
  effect: AnyPreset;
  options?: object;
  interval?: number;
  /** Decorative background (rendered `aria-hidden`). */
  background?: ReactNode;
  /** Changing it replays the sequence. */
  replay?: string | number | boolean;
  /** Play on hydration of server markup too (default `"client"`). */
  appear?: "client" | "always" | "manual";
  reducedMotion?: ReducedMotion;
  onComplete?(): void;
}

/** C06: the element children (consumer lines) enter in sequence over a background. */
export function TitleSequence({
  effect,
  options,
  interval,
  background,
  replay,
  appear = "client",
  reducedMotion,
  onComplete,
  className,
  children,
  ref,
  ...rest
}: TitleSequenceProps) {
  const [, setRef] = useHostRef<HTMLDivElement>(ref);
  const lines = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const hydrating = useFirstRenderHydrating();
  const latest = useLatest({ options, onComplete });
  const first = useRef(true);
  useClientLayoutEffect(() => {
    const container = lines.current;
    if (!container) return;
    const initial = first.current;
    first.current = false;
    if (initial && (appear === "manual" || (hydrating && appear !== "always"))) return;
    const timeline = createTimeline({
      reducedMotion: "never",
      onComplete: () => latest.current.onComplete?.(),
    });
    titleSequence(timeline, {
      lines: [...container.children],
      effect,
      options: latest.current.options,
      interval,
      background: backdrop.current,
      reducedMotion,
    });
    timeline.play();
    return () => timeline.destroy();
  }, [effect, interval, replay, reducedMotion]);
  return (
    <div {...rest} ref={setRef} className={joinClass("neshel-title-sequence", className)}>
      {background !== undefined ? (
        <div ref={backdrop} className="neshel-title-background" aria-hidden="true">
          {background}
        </div>
      ) : null}
      <div ref={lines} className="neshel-title-lines">
        {children}
      </div>
    </div>
  );
}

// --- C07 <Spotlight> -----------------------------------------------------------------------------

export interface SpotlightProps extends DivProps {
  /** Element to light (ref object or element); `null`/omitted clears the spotlight. */
  target?: { current: Element | null } | Element | null;
  radius?: number;
  padding?: number;
  duration?: number;
  reducedMotion?: ReducedMotion;
}

/** C07: dims the stage except a lit circle around `target`. */
export function Spotlight({
  target,
  radius,
  padding,
  duration,
  reducedMotion,
  className,
  children,
  ref,
  ...rest
}: SpotlightProps) {
  const [stage, setRef] = useHostRef<HTMLDivElement>(ref);
  const control = useRef<SpotlightControl | undefined>(undefined);
  useClientLayoutEffect(() => {
    if (!stage.current) return;
    const spotlight = createSpotlight(stage.current, { radius, padding, reducedMotion });
    control.current = spotlight;
    return () => {
      spotlight.destroy();
      control.current = undefined;
    };
  }, [radius, padding, reducedMotion]);
  const element =
    target && typeof (target as Element).nodeType === "number"
      ? (target as Element)
      : ((target as { current: Element | null } | null | undefined)?.current ?? null);
  useEffect(() => {
    const spotlight = control.current;
    if (!spotlight) return;
    if (element) void spotlight.focus(element, { duration });
    else if (spotlight.active) void spotlight.clear({ duration });
  });
  return (
    <div {...rest} ref={setRef} className={joinClass("neshel-spotlight-stage", className)}>
      {children}
      <div className="neshel-spotlight-layer" aria-hidden="true">
        <div className="neshel-spotlight" hidden />
      </div>
    </div>
  );
}

// --- C08 <DepthOfField> --------------------------------------------------------------------------

export interface DepthOfFieldProps extends DivProps {
  /** Focused layer (element child index), or -1/omitted for everything sharp. */
  focus?: number;
  maxBlur?: number;
  falloff?: number;
  duration?: number;
  reducedMotion?: ReducedMotion;
}

/** C08: its element children are depth layers; layers away from `focus` blur. */
export function DepthOfField({
  focus = -1,
  maxBlur,
  falloff,
  duration,
  reducedMotion,
  className,
  children,
  ref,
  ...rest
}: DepthOfFieldProps) {
  const [container, setRef] = useHostRef<HTMLDivElement>(ref);
  const control = useRef<DepthControl | undefined>(undefined);
  const latest = useLatest(focus);
  useClientLayoutEffect(() => {
    if (!container.current) return;
    const depth = createDepthOfField(container.current, {
      maxBlur,
      falloff,
      reducedMotion,
      focus: latest.current,
    });
    control.current = depth;
    return () => {
      depth.destroy();
      control.current = undefined;
    };
  }, [maxBlur, falloff, reducedMotion, Children.count(children)]);
  useEffect(() => {
    const depth = control.current;
    if (!depth || depth.focused === focus) return;
    void (focus < 0 ? depth.clear({ duration }) : depth.focus(focus, { duration }));
  }, [focus, duration]);
  return (
    <div {...rest} ref={setRef} className={joinClass("neshel-depth", className)}>
      {children}
    </div>
  );
}

// --- C09 <Storyboard> ----------------------------------------------------------------------------

export interface StoryboardFrameProps {
  /** Accessible label of the frame (default "n of N"). */
  label?: string;
  children?: ReactNode;
}

/** A frame of a `<Storyboard>` (its children are the frame content). */
export function StoryboardFrame({ children }: StoryboardFrameProps) {
  return <>{children}</>;
}

export interface StoryboardProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "onChange"> {
  /** Accessible name of the storyboard. */
  label: string;
  autoplay?: boolean;
  interval?: number;
  loop?: boolean;
  transition?: "fade" | "slide";
  duration?: number;
  reducedMotion?: ReducedMotion;
  /** Control labels (English defaults). */
  labels?: Partial<Record<"play" | "pause" | "previous" | "next" | "stop", string>>;
  onChange?(index: number): void;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

const STORYBOARD_LABELS = {
  play: "Start slide rotation",
  pause: "Pause slide rotation",
  previous: "Previous slide",
  next: "Next slide",
  stop: "Stop and return to the first slide",
};

/** C09: frames with an opt-in, pausable autoplay (APG carousel semantics). */
export function Storyboard({
  label,
  autoplay = false,
  interval,
  loop,
  transition,
  duration,
  reducedMotion,
  labels,
  onChange,
  className,
  children,
  ref,
  ...rest
}: StoryboardProps) {
  const [root, setRef] = useHostRef<HTMLElement>(ref);
  const framesRef = useRef<HTMLDivElement>(null);
  const control = useRef<StoryboardControl | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [manual, setManual] = useState(false);
  const latest = useLatest(onChange);
  const frames = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<StoryboardFrameProps>[];
  const text = { ...STORYBOARD_LABELS, ...labels };
  useClientLayoutEffect(() => {
    const container = framesRef.current;
    if (!root.current || !container) return;
    const storyboard = createStoryboard(root.current, [...container.children] as HTMLElement[], {
      autoplay,
      interval,
      loop,
      transition,
      duration,
      reducedMotion,
      onChange: (next, cause) => {
        setIndex(next);
        setManual(cause === "user");
        latest.current?.(next);
      },
      onPlayingChange: setPlaying,
    });
    control.current = storyboard;
    setPlaying(storyboard.playing);
    setIndex(storyboard.index);
    setMounted(true);
    return () => {
      storyboard.destroy();
      control.current = undefined;
    };
  }, [autoplay, interval, loop, transition, duration, reducedMotion, frames.length]);
  const act = (fn: (s: StoryboardControl) => void) => () => {
    if (control.current) fn(control.current);
  };
  return (
    <section
      {...rest}
      ref={setRef}
      aria-roledescription="carousel"
      aria-label={label}
      className={joinClass("neshel-storyboard", className)}
    >
      <div className="neshel-storyboard-controls" hidden={!mounted}>
        {autoplay ? (
          <button
            type="button"
            className="neshel-storyboard-rotation"
            aria-label={playing ? text.pause : text.play}
            onClick={act((s) => (s.playing ? s.pause() : s.play()))}
          >
            {playing ? "❚❚" : "▶"}
          </button>
        ) : null}
        <button type="button" aria-label={text.previous} onClick={act((s) => s.previous())}>
          ‹
        </button>
        <button type="button" aria-label={text.next} onClick={act((s) => s.next())}>
          ›
        </button>
        <button type="button" aria-label={text.stop} onClick={act((s) => s.stop())}>
          ■
        </button>
      </div>
      <div
        ref={framesRef}
        className="neshel-storyboard-frames"
        aria-live={mounted && (manual || !playing) ? "polite" : "off"}
      >
        {frames.map((frame, i) => (
          // biome-ignore lint/a11y/useSemanticElements: APG carousel slides are groups, not fieldsets.
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: frames are positional.
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={frame.props.label ?? `${i + 1} of ${frames.length}`}
            className="neshel-storyboard-frame"
          >
            {frame.props.children}
          </div>
        ))}
      </div>
      <span className="neshel-visually-hidden">
        {mounted ? `${index + 1} / ${frames.length}` : ""}
      </span>
    </section>
  );
}

// --- C10 <Letterbox> -----------------------------------------------------------------------------

export interface LetterboxProps extends DivProps {
  active?: boolean;
  /** Visible aspect ratio between the bars (1–4, default 2.39). */
  ratio?: number;
  /** Fixed bar size (CSS length) instead of `ratio`. */
  size?: string;
  duration?: number;
  reducedMotion?: ReducedMotion;
}

/** C10: cinematic bars slide in from the top and bottom while `active`. */
export function Letterbox({
  active = false,
  ratio = 2.39,
  size,
  duration,
  reducedMotion,
  className,
  style,
  children,
  ref,
  ...rest
}: LetterboxProps) {
  const [frame, setRef] = useHostRef<HTMLDivElement>(ref);
  const control = useRef<LetterboxControl | undefined>(undefined);
  const latest = useLatest(active);
  if (!(typeof ratio === "number" && ratio >= 1 && ratio <= 4)) {
    throw new RangeError(
      `[@neshel-ui/animations] Letterbox: invalid ratio ${String(ratio)} (1–4).`,
    );
  }
  useClientLayoutEffect(() => {
    if (!frame.current) return;
    const letterbox = createLetterbox(frame.current, { shown: latest.current, reducedMotion });
    control.current = letterbox;
    return () => {
      letterbox.destroy();
      control.current = undefined;
    };
  }, [reducedMotion]);
  useEffect(() => {
    const letterbox = control.current;
    if (!letterbox || letterbox.progress === (active ? 1 : 0)) return;
    void (active ? letterbox.show({ duration }) : letterbox.hide({ duration }));
  }, [active, duration]);
  return (
    <div
      {...rest}
      ref={setRef}
      className={joinClass("neshel-letterbox", className)}
      style={
        {
          "--neshel-letterbox-ratio": ratio,
          ...(size ? { "--neshel-letterbox-size": size } : null),
          ...style,
        } as CSSProperties
      }
    >
      {children}
      <div className="neshel-letterbox-bars" aria-hidden="true" hidden>
        <div className="neshel-letterbox-bar" data-edge="top" />
        <div className="neshel-letterbox-bar" data-edge="bottom" />
      </div>
    </div>
  );
}

export type { Timeline };
