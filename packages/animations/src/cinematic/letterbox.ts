/**
 * C10 — Letterbox transition (catalogue §7, structure W; contracts/cinematic-api.md).
 *
 * Two package-rendered bars inside a positioned frame (`.neshel-letterbox`, rendered by `<Letterbox>`) grow
 * from the top and bottom edges by their own Motion Host `scaleY` layers. Their size comes from CSS (the
 * frame's width against `--neshel-letterbox-ratio`, or `--neshel-letterbox-size`), so nothing is measured.
 * The frame and the content receive no writes: their inline styles and attributes are identical after
 * `hide()` and `destroy()`.
 */
import { clamp } from "../core/interpolate.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import { createPoseWriter, type PoseWriter, type Styled } from "./engine/pose.js";
import { createAnimatedProgress, type MoveOptions, type TrackOptions } from "./engine/progress.js";
import type { ValueTrackInput } from "./engine/timeline.js";

export interface LetterboxOptions {
  /** Start with the bars shown (default false). */
  shown?: boolean;
  reducedMotion?: ReducedMotion;
}

export interface LetterboxControl {
  /** 0 hidden … 1 shown. */
  readonly progress: number;
  show(options?: MoveOptions): Promise<unknown>;
  hide(options?: MoveOptions): Promise<unknown>;
  track(show: boolean, options?: TrackOptions): ValueTrackInput;
  destroy(): void;
}

const DEFAULTS = { duration: 600, easing: "standard" } as const;
const v = /* @__PURE__ */ validator("createLetterbox");

export function createLetterbox(
  frame: HTMLElement,
  options: LetterboxOptions = {},
): LetterboxControl {
  const o = v.options(options);
  const policy = v.reducedMotion(o.reducedMotion);
  if (!frame?.ownerDocument) v.fail('"frame" must be an element.');
  const doc = frame.ownerDocument;
  let found = frame.querySelector<HTMLElement>(":scope > .neshel-letterbox-bars");
  const created = !found;
  if (!found) {
    found = doc.createElement("div");
    found.className = "neshel-letterbox-bars";
    found.setAttribute("aria-hidden", "true");
    for (const edge of ["top", "bottom"]) {
      const bar = doc.createElement("div");
      bar.className = "neshel-letterbox-bar";
      bar.dataset.edge = edge;
      found.appendChild(bar);
    }
    frame.appendChild(found);
  }
  const layer = found;
  layer.setAttribute("hidden", "");
  const bars = [...layer.children] as Styled[];
  const writers: PoseWriter[] = bars.map((bar, i) =>
    createPoseWriter(bar, { id: `cinematic/letterbox-${i}` }),
  );
  const progress = createAnimatedProgress(0, () => policy);
  let destroyed = false;

  function render(p: number): void {
    if (destroyed) return;
    const shown = clamp(p, 0, 1);
    if (shown <= 0) {
      layer.setAttribute("hidden", "");
      for (const writer of writers) writer.clear();
      return;
    }
    layer.removeAttribute("hidden");
    for (const writer of writers) writer.set({ scaleY: Math.max(0.0001, shown) });
  }
  const unsubscribe = progress.value.subscribe(render);
  if (v.flag("shown", o.shown, false)) progress.jump(1);

  return {
    get progress() {
      return progress.value.get();
    },
    show(moveOptions = {}) {
      return destroyed ? Promise.resolve() : progress.move(1, moveOptions, DEFAULTS).finished;
    },
    hide(moveOptions = {}) {
      return destroyed ? Promise.resolve() : progress.move(0, moveOptions, DEFAULTS).finished;
    },
    track(show, trackOptions = {}) {
      return progress.track(show ? 0 : 1, show ? 1 : 0, trackOptions, DEFAULTS);
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
