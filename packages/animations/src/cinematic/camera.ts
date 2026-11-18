/**
 * C03 — Camera pan/zoom over a large canvas (catalogue §7, structure W; contracts/cinematic-api.md).
 *
 * A stage (viewport) and a canvas (large DOM content). The camera pose `{ x, y, zoom }` puts the canvas point
 * `(x, y)` at the stage centre at `zoom`; it is rendered as ONE Motion Host layer on the canvas (translate +
 * scale, `transform-origin: 0 0` from `cinematic.css`), so the consumer's own inline transform on the canvas
 * stays as the baseline prefix and children keep their own effects. Poses are clamped so the canvas never
 * leaves the stage (`bounds: "contain"`). Sizes are read on creation, on `refresh()` and from one
 * `ResizeObserver`, never per frame; focus targets are measured once per move from the offset chain.
 *
 * Without JavaScript the stage is a scrollable region; with the camera active it gets
 * `data-neshel-camera` (CSS switches to `overflow: clip`) and focus moving into the canvas pans to the
 * focused element (`followFocus`).
 */
import { clamp, mix } from "../core/interpolate.js";
import { measureBox } from "../core/layout-box.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
} from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";
import { createPoseWriter, type Styled } from "./engine/pose.js";
import { createAnimatedProgress, type MoveOptions, type TrackOptions } from "./engine/progress.js";
import type { ValueTrackInput } from "./engine/timeline.js";

export interface CameraPose {
  x: number;
  y: number;
  zoom: number;
}

export type CameraTarget = Partial<CameraPose> | { focus: Element; padding?: number };

export interface CameraOptions {
  /** 0.1–1 (default 0.5). */
  minZoom?: number;
  /** 1–10 (default 4). */
  maxZoom?: number;
  /** `"contain"` keeps the canvas covering the stage (default); `"none"` allows any pose. */
  bounds?: "contain" | "none";
  /** Space around a focused element (0–400, default 24). */
  padding?: number;
  /** Pan to elements that receive keyboard focus inside the canvas (default true). */
  followFocus?: boolean;
  /** Initial pose (default: canvas centre at zoom 1). */
  initial?: Partial<CameraPose>;
  reducedMotion?: ReducedMotion;
  onChange?(pose: CameraPose): void;
}

export interface Camera {
  readonly pose: Readonly<CameraPose>;
  to(target: CameraTarget, options?: MoveOptions): Promise<unknown>;
  jump(target: CameraTarget): void;
  /** A timeline track from the last planned pose to `target`. */
  track(target: CameraTarget, options?: TrackOptions): ValueTrackInput;
  /** Re-measure stage and canvas (after changes no observer can see). */
  refresh(): void;
  destroy(): void;
}

const DEFAULTS = { duration: 900, easing: "emphasized" } as const;
const v = /* @__PURE__ */ validator("createCamera");

export function createCamera(
  stage: HTMLElement,
  canvas: HTMLElement,
  options: CameraOptions = {},
): Camera {
  const o = v.options(options);
  const minZoom = v.number("minZoom", o.minZoom, 0.5, 0.1, 1);
  const maxZoom = v.number("maxZoom", o.maxZoom, 4, 1, 10);
  const bounds = v.oneOf("bounds", o.bounds, ["contain", "none"] as const, "contain");
  const padding = v.number("padding", o.padding, 24, 0, 400);
  const followFocus = v.flag("followFocus", o.followFocus, true);
  const policy = v.reducedMotion(o.reducedMotion);
  const onChange = v.callback<(pose: CameraPose) => void>("onChange", o.onChange);
  if (!stage?.ownerDocument || !canvas?.ownerDocument) {
    v.fail('"stage" and "canvas" must be elements.');
  }
  if (!stage.contains(canvas)) v.fail('"canvas" must be inside "stage".');

  const writer = createPoseWriter(canvas as Styled, { id: "cinematic/camera" });
  let stageSize = { width: 0, height: 0 };
  let canvasSize = { width: 0, height: 0 };
  function measure(): void {
    counters.reads++;
    stageSize = { width: stage.clientWidth, height: stage.clientHeight };
    canvasSize = { width: canvas.offsetWidth, height: canvas.offsetHeight };
  }

  // Leaving the no-JS scrollable mode: keep what the reader was looking at.
  measure();
  const scrolled = { x: stage.scrollLeft, y: stage.scrollTop };
  const hadAttribute = stage.getAttribute("data-neshel-camera");
  stage.setAttribute("data-neshel-camera", "");
  if (scrolled.x || scrolled.y) {
    stage.scrollLeft = 0;
    stage.scrollTop = 0;
  }

  function clampPose(pose: CameraPose): CameraPose {
    const zoom = clamp(pose.zoom, minZoom, maxZoom);
    if (bounds === "none") return { x: pose.x, y: pose.y, zoom };
    const axis = (value: number, canvasLength: number, stageLength: number) => {
      const visible = stageLength / zoom;
      if (visible >= canvasLength) return canvasLength / 2;
      return clamp(value, visible / 2, canvasLength - visible / 2);
    };
    return {
      x: axis(pose.x, canvasSize.width, stageSize.width),
      y: axis(pose.y, canvasSize.height, stageSize.height),
      zoom,
    };
  }

  let pose: CameraPose = clampPose({
    x:
      o.initial?.x ??
      (scrolled.x || scrolled.y ? scrolled.x + stageSize.width / 2 : canvasSize.width / 2),
    y:
      o.initial?.y ??
      (scrolled.x || scrolled.y ? scrolled.y + stageSize.height / 2 : canvasSize.height / 2),
    zoom: o.initial?.zoom ?? 1,
  });
  let from = pose;
  let to = pose;
  let planned = pose;
  let destroyed = false;
  let chained = false;
  const progress = createAnimatedProgress(1, () => policy);

  function resolve(target: CameraTarget): CameraPose {
    if ("focus" in target && target.focus) {
      counters.reads++;
      const box = measureBox(target.focus);
      const base = measureBox(canvas);
      const space = (target.padding ?? padding) * 2;
      const zoom = Math.min(
        stageSize.width / Math.max(1, box.width + space),
        stageSize.height / Math.max(1, box.height + space),
      );
      return clampPose({
        x: box.x - base.x + box.width / 2,
        y: box.y - base.y + box.height / 2,
        zoom,
      });
    }
    const partial = target as Partial<CameraPose>;
    return clampPose({
      x: v.number("x", partial.x, planned.x, -1e6, 1e6),
      y: v.number("y", partial.y, planned.y, -1e6, 1e6),
      zoom: v.number("zoom", partial.zoom, planned.zoom, 0.01, 100),
    });
  }

  function interpolate(a: CameraPose, b: CameraPose, t: number): CameraPose {
    // Zoom interpolates in log space (a constant perceived zoom speed).
    return {
      x: mix(a.x, b.x, t),
      y: mix(a.y, b.y, t),
      zoom: Math.exp(mix(Math.log(a.zoom), Math.log(b.zoom), t)),
    };
  }

  function render(next: CameraPose): void {
    if (destroyed) return;
    pose = next;
    writer.set({
      x: stageSize.width / 2 - next.x * next.zoom,
      y: stageSize.height / 2 - next.y * next.zoom,
      scale: next.zoom,
    });
    onChange?.(next);
  }
  const unsubscribe = progress.value.subscribe((t) => render(interpolate(from, to, t)));
  render(pose);

  let observer: ResizeObserver | undefined;
  if (typeof ResizeObserver === "function") {
    observer = new ResizeObserver(() => {
      measure();
      render(clampPose(pose));
    });
    observer.observe(stage);
    observer.observe(canvas);
    counters.observers++;
  }

  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof Element) || target === stage || !canvas.contains(target)) return;
    void api.to({ focus: target });
  };
  if (followFocus) stage.addEventListener("focusin", onFocusIn);

  const reduced = () => shouldReduceMotion(policy, prefersReducedMotion());

  const api: Camera = {
    get pose() {
      return pose;
    },
    to(target, moveOptions = {}) {
      if (destroyed) return Promise.resolve();
      from = pose;
      to = resolve(target);
      planned = to;
      progress.jump(0);
      if (reduced()) {
        progress.jump(1);
        return Promise.resolve();
      }
      return progress.move(1, moveOptions, DEFAULTS).finished;
    },
    jump(target) {
      if (destroyed) return;
      from = to = planned = resolve(target);
      progress.jump(0);
      progress.jump(1);
      render(to);
    },
    track(target, trackOptions = {}) {
      const begin = planned;
      const end = resolve(target);
      const first = !chained;
      chained = true;
      planned = end;
      const value = createAnimatedProgress(0, () => policy).value;
      value.subscribe((t) => render(interpolate(begin, end, t)));
      return {
        id: trackOptions.id,
        value,
        from: 0,
        to: 1,
        duration: trackOptions.duration ?? DEFAULTS.duration,
        easing: trackOptions.easing ?? DEFAULTS.easing,
        fill: first ? "both" : "forwards",
      };
    },
    refresh() {
      measure();
      render(clampPose(pose));
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      progress.stop();
      unsubscribe();
      observer?.disconnect();
      if (observer) counters.observers = Math.max(0, counters.observers - 1);
      stage.removeEventListener("focusin", onFocusIn);
      writer.clear();
      if (hadAttribute === null) stage.removeAttribute("data-neshel-camera");
      else stage.setAttribute("data-neshel-camera", hadAttribute);
    },
  };
  return api;
}
