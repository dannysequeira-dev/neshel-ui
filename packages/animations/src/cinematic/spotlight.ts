/**
 * C07 — Spotlight / vignette focus (catalogue §7, structure W; contracts/cinematic-api.md, research R8).
 *
 * An oversized package-rendered lens (`.neshel-spotlight`, 4000 × 4000 px, a fixed radial hole of 200 px
 * drawn once by CSS) is moved and scaled by ONE Motion Host transform layer, so the gradient is never
 * repainted per frame. The stage clips it (`overflow: clip` from `cinematic.css`); the dimmed content stays
 * in the accessibility tree and interactive (the lens has no pointer events). Geometry is read once per
 * `focus()`/`track()` from the offset chain (transforms ignored), never per frame.
 */
import { mix } from "../core/interpolate.js";
import { measureBox } from "../core/layout-box.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";
import { createPoseWriter, type Styled } from "./engine/pose.js";
import { createAnimatedProgress, type MoveOptions, type TrackOptions } from "./engine/progress.js";
import type { ValueTrackInput } from "./engine/timeline.js";

/** Lens geometry (keep in sync with `cinematic.css`). */
export const LENS_SIZE = 4000;
export const LENS_RADIUS = 200;

export interface SpotlightTarget {
  x: number;
  y: number;
  /** Radius of the lit circle in px (24–800). */
  radius?: number;
}

export interface SpotlightOptions {
  /** Default radius of the lit circle around a focused element (24–800, default 120). */
  radius?: number;
  /** Extra space around a focused element's box (0–200, default 16). */
  padding?: number;
  reducedMotion?: ReducedMotion;
}

export interface Spotlight {
  readonly active: boolean;
  focus(target: Element | SpotlightTarget, options?: MoveOptions): Promise<unknown>;
  clear(options?: MoveOptions): Promise<unknown>;
  /** A timeline track from the last planned pose to `target` (or to cleared with `null`). */
  track(target: Element | SpotlightTarget | null, options?: TrackOptions): ValueTrackInput;
  destroy(): void;
}

interface LensPose {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

const DEFAULTS = { duration: 700, easing: "standard" } as const;
const v = /* @__PURE__ */ validator("createSpotlight");

export function createSpotlight(stage: HTMLElement, options: SpotlightOptions = {}): Spotlight {
  const o = v.options(options);
  const radius = v.number("radius", o.radius, 120, 24, 800);
  const padding = v.number("padding", o.padding, 16, 0, 200);
  const policy = v.reducedMotion(o.reducedMotion);
  if (!stage?.ownerDocument) v.fail('"stage" must be an element.');
  let found = stage.querySelector<HTMLElement>(":scope > .neshel-spotlight");
  const created = !found;
  if (!found) {
    found = stage.ownerDocument.createElement("div");
    found.className = "neshel-spotlight";
    found.setAttribute("aria-hidden", "true");
    stage.appendChild(found);
  }
  const lens = found;
  lens.setAttribute("hidden", "");
  const writer = createPoseWriter(lens as Styled, { id: "cinematic/spotlight" });
  const progress = createAnimatedProgress(0, () => policy);
  let from: LensPose = { x: 0, y: 0, radius, opacity: 0 };
  let to: LensPose = { ...from };
  let planned: LensPose = { ...from };
  let destroyed = false;

  function poseOf(target: Element | SpotlightTarget): LensPose {
    if (typeof (target as Element).nodeType === "number") {
      counters.reads++;
      const box = measureBox(target as Element);
      const base = measureBox(stage);
      const extent = Math.hypot(box.width, box.height) / 2 + padding;
      return {
        x: box.x - base.x + box.width / 2,
        y: box.y - base.y + box.height / 2,
        radius: Math.max(radius, Math.min(800, extent)),
        opacity: 1,
      };
    }
    const point = target as SpotlightTarget;
    return {
      x: v.number("x", point.x, 0, -1e6, 1e6),
      y: v.number("y", point.y, 0, -1e6, 1e6),
      radius: v.number("radius", point.radius, radius, 24, 800),
      opacity: 1,
    };
  }

  function current(t: number): LensPose {
    return {
      x: mix(from.x, to.x, t),
      y: mix(from.y, to.y, t),
      radius: mix(from.radius, to.radius, t),
      opacity: mix(from.opacity, to.opacity, t),
    };
  }

  function render(t: number): void {
    if (destroyed) return;
    const pose = current(t);
    if (pose.opacity <= 0.001) {
      lens.setAttribute("hidden", "");
      writer.clear();
      return;
    }
    lens.removeAttribute("hidden");
    writer.set({
      x: pose.x - LENS_SIZE / 2,
      y: pose.y - LENS_SIZE / 2,
      scale: pose.radius / LENS_RADIUS,
      opacity: pose.opacity,
    });
  }
  const unsubscribe = progress.value.subscribe(render);

  function moveTo(next: LensPose, moveOptions: MoveOptions): Promise<unknown> {
    from = current(progress.value.get());
    // From a cleared lens, appear in place (no travel from the stage origin).
    if (from.opacity <= 0.001) from = { ...next, opacity: 0 };
    to = next;
    planned = next;
    progress.jump(0);
    return progress.move(1, moveOptions, DEFAULTS).finished;
  }

  return {
    get active() {
      return current(progress.value.get()).opacity > 0.001;
    },
    focus(target, moveOptions = {}) {
      if (destroyed) return Promise.resolve();
      return moveTo(poseOf(target), moveOptions);
    },
    clear(moveOptions = {}) {
      if (destroyed) return Promise.resolve();
      const now = current(progress.value.get());
      return moveTo({ ...now, opacity: 0 }, moveOptions);
    },
    track(target, trackOptions = {}) {
      const start = planned;
      const end = target === null ? { ...start, opacity: 0 } : poseOf(target);
      const begin = start.opacity <= 0.001 ? { ...end, opacity: 0 } : start;
      planned = end;
      const value = createAnimatedProgress(0, () => policy).value;
      value.subscribe((t) => {
        from = begin;
        to = end;
        render(t);
      });
      return {
        id: trackOptions.id,
        value,
        from: 0,
        to: 1,
        duration: trackOptions.duration ?? DEFAULTS.duration,
        easing: trackOptions.easing ?? DEFAULTS.easing,
        // Chained moves never render before they start (the previous move owns the lens until then).
        fill: start.opacity <= 0.001 ? "both" : "forwards",
      };
    },
    destroy() {
      if (destroyed) return;
      progress.stop();
      unsubscribe();
      writer.clear();
      destroyed = true;
      if (created) lens.remove();
      else lens.setAttribute("hidden", "");
    },
  };
}
