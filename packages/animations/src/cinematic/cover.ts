/**
 * C04 split-screen reveal and C05 curtain / shutter open (catalogue §7, structure L; contracts/cinematic-api.md).
 *
 * Package-rendered panels in a `.neshel-cover-layers` element (`aria-hidden`, `inert`, no pointer events)
 * cover the container's content and move away by their own Motion Host transform layers; the consumer's
 * content receives no writes. Progress 0 = covered, 1 = open. The layer is `hidden` whenever the cover is
 * open, so without JavaScript, after `destroy()` and under reduced motion the content is always visible.
 *
 * Split patterns translate the halves by half the container size (measured once per move, never per
 * frame); curtain and shutter scale panels from their outer edge (no measurement).
 */
import { clamp } from "../core/interpolate.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
} from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";
import { createPoseWriter, type PoseWriter, type Styled } from "./engine/pose.js";
import { createAnimatedProgress, type MoveOptions, type TrackOptions } from "./engine/progress.js";
import type { ValueTrackInput } from "./engine/timeline.js";

export type CoverPattern = "split-x" | "split-y" | "curtain" | "shutter";
export const COVER_PATTERNS: readonly CoverPattern[] = ["split-x", "split-y", "curtain", "shutter"];

export interface CoverOptions {
  /** Default `"split-x"`. */
  pattern?: CoverPattern;
  /** Shutter slats (2–12, default 6). */
  slats?: number;
  /** Start covered (default true) or open. */
  covered?: boolean;
  reducedMotion?: ReducedMotion;
}

export interface Cover {
  /** 0 covered … 1 open. */
  readonly progress: number;
  open(options?: MoveOptions): Promise<unknown>;
  close(options?: MoveOptions): Promise<unknown>;
  /** A timeline track that opens (`to` 1, default) or closes the cover. */
  track(options?: TrackOptions & { to?: 0 | 1 }): ValueTrackInput;
  destroy(): void;
}

const DEFAULTS = { duration: 900, easing: "emphasized" } as const;
const v = /* @__PURE__ */ validator("createCover");

/** Panels per pattern (React renders the same count on the server). */
export const panelCount = (pattern: CoverPattern, slats: number) =>
  pattern === "shutter" ? slats : 2;

export function createCover(container: HTMLElement, options: CoverOptions = {}): Cover {
  const o = v.options(options);
  const pattern = v.oneOf("pattern", o.pattern, COVER_PATTERNS, "split-x");
  const slats = Math.round(v.number("slats", o.slats, 6, 2, 12));
  const policy = v.reducedMotion(o.reducedMotion);
  const covered = v.flag("covered", o.covered, true);
  if (!container?.ownerDocument) v.fail('"container" must be an element.');
  const doc = container.ownerDocument;

  let found = container.querySelector<HTMLElement>(":scope > .neshel-cover-layers");
  const created = !found;
  if (!found) {
    found = doc.createElement("div");
    found.className = "neshel-cover-layers";
    found.setAttribute("aria-hidden", "true");
    found.setAttribute("hidden", "");
    container.appendChild(found);
  }
  const layer = found;
  layer.setAttribute("inert", "");
  layer.dataset.pattern = pattern;
  const count = panelCount(pattern, slats);
  while (layer.children.length < count) {
    const panel = doc.createElement("div");
    panel.className = "neshel-cover-panel";
    layer.appendChild(panel);
  }
  const panels = [...layer.children].slice(0, count) as HTMLElement[];
  for (const [index, panel] of panels.entries()) panel.dataset.index = String(index);
  layer.dataset.slats = String(slats);
  const writers: PoseWriter[] = panels.map((panel, index) =>
    createPoseWriter(panel as Styled, { id: `cinematic/cover-${index}` }),
  );
  let size = { width: 0, height: 0 };
  const split = pattern === "split-x" || pattern === "split-y";
  const measure = () => {
    if (!split) return;
    counters.reads++;
    size = { width: container.offsetWidth, height: container.offsetHeight };
  };
  const reduced = () => shouldReduceMotion(policy, prefersReducedMotion());
  const progress = createAnimatedProgress(covered ? 0 : 1, () => policy);
  let destroyed = false;

  function render(p: number): void {
    if (destroyed) return;
    const open = clamp(p, 0, 1);
    if (open >= 1) {
      layer.setAttribute("hidden", "");
      for (const writer of writers) writer.clear();
      return;
    }
    layer.removeAttribute("hidden");
    const stagger = 0.35 / Math.max(1, count - 1);
    for (const [index, writer] of writers.entries()) {
      const sign = index === 0 ? -1 : 1;
      if (pattern === "split-x") writer.set({ x: sign * open * (size.width / 2) });
      else if (pattern === "split-y") writer.set({ y: sign * open * (size.height / 2) });
      else if (pattern === "curtain") writer.set({ scaleX: Math.max(0.0001, 1 - open) });
      else {
        const local = clamp(open * (1 + stagger * (count - 1)) - index * stagger, 0, 1);
        writer.set({ scaleY: Math.max(0.0001, 1 - local) });
      }
    }
  }

  const unsubscribe = progress.value.subscribe(render);
  if (covered && !reduced()) {
    measure();
    render(0);
  } else progress.jump(1);

  return {
    get progress() {
      return progress.value.get();
    },
    open(moveOptions = {}) {
      if (destroyed) return Promise.resolve();
      measure();
      return progress.move(1, moveOptions, DEFAULTS).finished;
    },
    close(moveOptions = {}) {
      if (destroyed) return Promise.resolve();
      if (reduced()) {
        progress.jump(1); // reduced motion never covers content again
        return Promise.resolve();
      }
      measure();
      return progress.move(0, moveOptions, DEFAULTS).finished;
    },
    track(trackOptions = {}) {
      measure();
      const to = trackOptions.to ?? 1;
      return progress.track(1 - to, to, trackOptions, DEFAULTS);
    },
    destroy() {
      if (destroyed) return;
      progress.stop();
      unsubscribe();
      for (const writer of writers) writer.clear();
      destroyed = true;
      if (created) layer.remove();
      else layer.setAttribute("hidden", "");
    },
  };
}
