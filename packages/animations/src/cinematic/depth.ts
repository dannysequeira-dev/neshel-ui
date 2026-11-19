/**
 * C08 — Depth-of-field blur sequence (catalogue §7, structure G; contracts/cinematic-api.md, research R8).
 *
 * The container's element children (at most 6) are depth layers. Focusing a layer blurs the others by their
 * distance (`|i − focus| × falloff`, capped at `maxBlur` ≤ 12 px) and scales them down slightly, through each
 * layer's Motion Host (`filter` is an arbitrated exclusive channel; the transform layer composes). Every
 * contribution is restored exactly on `destroy()`. Reduced motion (`static`): no blur and no scale at all —
 * readability first.
 */
import { mix } from "../core/interpolate.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import { createPoseWriter, type PoseWriter, type Styled } from "./engine/pose.js";
import { createAnimatedProgress, type MoveOptions, type TrackOptions } from "./engine/progress.js";
import type { ValueTrackInput } from "./engine/timeline.js";

export interface DepthOfFieldOptions {
  /** Blur cap in px (0–12, default 8). */
  maxBlur?: number;
  /** Blur per layer of distance in px (0–12, default 4). */
  falloff?: number;
  /** Scale reduction per layer of distance (0–0.1, default 0.02). */
  scale?: number;
  /** Initially focused layer (default none: everything sharp). */
  focus?: number;
  /** Priority of the `filter` claims (default 0). */
  priority?: number;
  reducedMotion?: ReducedMotion;
}

export interface DepthOfField {
  /** Focused layer, or `-1` when every layer is sharp. */
  readonly focused: number;
  focus(index: number, options?: MoveOptions): Promise<unknown>;
  /** Everything sharp. */
  clear(options?: MoveOptions): Promise<unknown>;
  track(index: number, options?: TrackOptions): ValueTrackInput;
  destroy(): void;
}

const DEFAULTS = { duration: 650, easing: "standard" } as const;
const MAX_LAYERS = 6;
const v = /* @__PURE__ */ validator("createDepthOfField");

export function createDepthOfField(
  container: HTMLElement,
  options: DepthOfFieldOptions = {},
): DepthOfField {
  const o = v.options(options);
  const maxBlur = v.number("maxBlur", o.maxBlur, 8, 0, 12);
  const falloff = v.number("falloff", o.falloff, 4, 0, 12);
  const shrink = v.number("scale", o.scale, 0.02, 0, 0.1);
  const policy = v.reducedMotion(o.reducedMotion);
  if (!container?.ownerDocument) v.fail('"container" must be an element.');
  const layers = [...container.children].slice(0, MAX_LAYERS) as Styled[];
  if (container.children.length > MAX_LAYERS) {
    v.fail(`at most ${MAX_LAYERS} layers (found ${container.children.length}).`);
  }
  const writers: PoseWriter[] = layers.map((layer, i) =>
    createPoseWriter(layer, { id: `cinematic/depth-${i}`, priority: o.priority }),
  );
  const target = (focus: number) =>
    layers.map((_, i) => (focus < 0 ? 0 : Math.min(maxBlur, Math.abs(i - focus) * falloff)));
  const scaleFor = (blur: number) => (falloff > 0 ? 1 - (blur / falloff) * shrink : 1);
  let focused = -1;
  let from = target(-1);
  let to = from;
  let planned = -1;
  let destroyed = false;
  let chained = false;
  const reduced = () => shouldReduceMotion(policy, prefersReducedMotion());
  const progress = createAnimatedProgress(1, () => policy);

  function render(t: number): void {
    if (destroyed) return;
    if (reduced()) {
      for (const writer of writers) writer.clear();
      return;
    }
    for (const [i, writer] of writers.entries()) {
      const blur = mix(from[i] ?? 0, to[i] ?? 0, t);
      if (blur <= 0.01) writer.clear();
      else writer.set({ blur, scale: scaleFor(blur) });
    }
  }
  const unsubscribe = progress.value.subscribe(render);
  const unsubscribeReduced = subscribeReducedMotion(() => render(progress.value.get()));

  function current(): number[] {
    const t = progress.value.get();
    return layers.map((_, i) => mix(from[i] ?? 0, to[i] ?? 0, t));
  }

  function moveTo(index: number, moveOptions: MoveOptions): Promise<unknown> {
    if (destroyed) return Promise.resolve();
    from = current();
    to = target(index);
    focused = planned = index;
    progress.jump(0);
    return progress.move(1, moveOptions, DEFAULTS).finished;
  }

  const check = (index: number) => {
    if (!Number.isInteger(index) || index < -1 || index >= layers.length) {
      v.fail(`invalid layer ${String(index)} (0–${layers.length - 1}, or -1 for none).`);
    }
    return index;
  };

  if (o.focus !== undefined) {
    focused = planned = check(o.focus);
    from = to = target(focused);
    render(1);
  }

  return {
    get focused() {
      return focused;
    },
    focus(index, moveOptions = {}) {
      return moveTo(check(index), moveOptions);
    },
    clear(moveOptions = {}) {
      return moveTo(-1, moveOptions);
    },
    track(index, trackOptions = {}) {
      const begin = target(planned);
      const end = target(check(index));
      const first = !chained;
      chained = true;
      planned = index;
      const value = createAnimatedProgress(0, () => policy).value;
      value.subscribe((t) => {
        from = begin;
        to = end;
        focused = t >= 1 ? index : focused;
        render(t);
      });
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
    destroy() {
      if (destroyed) return;
      progress.stop();
      unsubscribe();
      unsubscribeReduced();
      for (const writer of writers) writer.clear();
      destroyed = true;
    },
  };
}
