/**
 * D10 depth-map parallax, 2.5D (catalogue §15; contracts/gpu-api.md, research R14). Inputs: the colour image (the
 * native `<img>` keeps its attributes and semantics) and an EXPLICIT depth map — grayscale, white = near (`invert`
 * for black = near), same aspect ratio as the image (±2 %). Depth is never estimated from the colour image. The
 * fragment shader offsets each pixel by `pose · (depth − focus) · intensity` (1–16 refinement steps) with a zoom
 * margin equal to the largest offset, so edges are never uncovered. Pose: pointer (spring) or external progress
 * between `from` and `to`. Validation: aspect, texture limits, depth range (a flat map warns in development).
 * Reduced motion: static. Without WebGL2, on a load/CORS error or an invalid map: the original image.
 */
import { isProduction } from "../core/dev.js";
import { trackPointer } from "../core/pointer.js";
import type { ProgressSource } from "../core/progress-driver.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { getFrameScheduler } from "../core/scheduler.js";
import type { SpringOptions } from "../core/spring.js";
import { createSpringRig } from "../core/springs.js";
import { validator } from "../core/validate.js";
import { createImageEffect, type GpuMode } from "./engine/image-effect.js";
import { activate, bindTexture, drawMesh, type Mesh, quadMesh, uniforms } from "./engine/mesh.js";
import { depthRange, type MapSource } from "./engine/sources.js";
import { GpuFailure, type GpuReason } from "./engine/surface.js";
import { DEPTH_FRAGMENT, QUAD_VERTEX } from "./shaders.js";

const UNIFORMS = [
  "uImage",
  "uDepth",
  "uFit",
  "uPose",
  "uIntensity",
  "uFocus",
  "uInvert",
  "uSteps",
] as const;

export interface ParallaxPose {
  /** −1 (left) … 1 (right). */
  x?: number;
  /** −1 (top) … 1 (bottom). */
  y?: number;
}

export interface DepthParallaxOptions {
  image?: HTMLImageElement | HTMLCanvasElement;
  /** Grayscale depth map (required): URL, `<img>`, `<canvas>` or `ImageBitmap`. */
  depth: MapSource;
  /** Black = near (default false: white = near). */
  invert?: boolean;
  /** 0–1 (≤ 0.06 UV; default 0.5). */
  intensity?: number;
  /** Depth that stays still 0–1 (default 0.5). */
  focus?: number;
  /** Refinement steps 1–16 (default 8). */
  steps?: number;
  /** Follow the pointer (default true). */
  pointer?: boolean;
  /** Poses of `seek(0)` and `seek(1)` (default x −1 → 1). */
  from?: ParallaxPose;
  to?: ParallaxPose;
  spring?: SpringOptions;
  crossOrigin?: "anonymous" | "use-credentials";
  pointerTypes?: readonly ("mouse" | "pen" | "touch")[];
  maxDpr?: number;
  reducedMotion?: ReducedMotion;
}

export interface DepthParallaxControl {
  readonly mode: GpuMode;
  readonly reason: GpuReason | undefined;
  readonly pose: { x: number; y: number };
  /** Render the pose at `progress` between `from` and `to` (exact). */
  seek(progress: number): void;
  drive(source: ProgressSource): () => void;
  probe(x: number, y: number): number[] | undefined;
  destroy(): void;
}

/** Aspect tolerance between the image and its depth map. */
export const DEPTH_ASPECT_TOLERANCE = 0.02;

function sizeOf(source: TexImageSource): { w: number; h: number } {
  const s = source as {
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number;
    height?: number;
  };
  return { w: s.naturalWidth || s.width || 0, h: s.naturalHeight || s.height || 0 };
}

export function createDepthParallax(
  frame: HTMLElement,
  options: DepthParallaxOptions,
): DepthParallaxControl {
  const v = validator("createDepthParallax");
  if (!frame || frame.nodeType !== 1) v.fail('"frame" must be an element.');
  const o = v.options(options);
  const source = (o.image ?? frame.querySelector("img, canvas")) as
    | HTMLImageElement
    | HTMLCanvasElement
    | null;
  if (!source) v.fail("the frame has no <img> or <canvas>.");
  if (o.depth === undefined || o.depth === null)
    v.fail('"depth" is required: an explicit grayscale depth map (depth is never estimated).');
  if (typeof o.depth === "string" && (o.depth.length > 2048 || /^\s*javascript:/i.test(o.depth)))
    v.fail('"depth" must be an image URL (at most 2048 characters).');
  const invert = v.flag("invert", o.invert, false);
  const intensity = v.number("intensity", o.intensity, 0.5, 0, 1);
  const focus = v.number("focus", o.focus, 0.5, 0, 1);
  const steps = Math.round(v.number("steps", o.steps, 8, 1, 16));
  const pointer = v.flag("pointer", o.pointer, true);
  const pose = (name: string, p: ParallaxPose | undefined, fx: number, fy: number) => ({
    x: v.number(`${name}.x`, p?.x, fx, -1, 1),
    y: v.number(`${name}.y`, p?.y, fy, -1, 1),
  });
  const from = pose("from", o.from, -1, 0);
  const to = pose("to", o.to, 1, 0);
  const spring = v.spring(o.spring, { stiffness: 90, damping: 18 });
  const crossOrigin = v.oneOf(
    "crossOrigin",
    o.crossOrigin,
    ["anonymous", "use-credentials"],
    "anonymous",
  );
  const maxDpr = o.maxDpr === undefined ? undefined : v.number("maxDpr", o.maxDpr, 2, 1, 3);
  const policy = v.reducedMotion(o.reducedMotion);
  const types = new Set<string>(o.pointerTypes ?? ["mouse", "pen"]);

  let program: WebGLProgram | undefined;
  let mesh: Mesh | undefined;
  let u: Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null> | undefined;
  let textures: { image: WebGLTexture; depth: WebGLTexture } | undefined;
  let fit: [number, number, number, number] = [1, 1, 0, 0];
  let unsubscribeSource: (() => void) | undefined;
  let destroyed = false;

  const effect = createImageEffect({
    frame,
    source: source as HTMLImageElement | HTMLCanvasElement,
    policy,
    maxDpr,
    extras: [{ source: o.depth as MapSource, crossOrigin }],
    validate(image, [depth]) {
      const a = sizeOf(image);
      const b = sizeOf(depth as TexImageSource);
      if (!a.w || !a.h || !b.w || !b.h)
        throw new GpuFailure("texture", "the image or depth map has no pixels");
      const ratio = a.w / a.h / (b.w / b.h);
      if (Math.abs(ratio - 1) > DEPTH_ASPECT_TOLERANCE)
        throw new GpuFailure(
          "texture",
          `createDepthParallax: the depth map (${b.w}×${b.h}) does not match the image aspect (${a.w}×${a.h}) within 2 %.`,
        );
      const range = depthRange(frame.ownerDocument, depth as TexImageSource);
      if (
        range &&
        range.max - range.min < 2 / 255 &&
        !isProduction() &&
        typeof console !== "undefined"
      )
        console.warn(
          "[@neshel-ui/animations] createDepthParallax: the depth map is flat; no parallax will show.",
        );
    },
    init(gl, resources, t) {
      program = resources.program(QUAD_VERTEX, DEPTH_FRAGMENT);
      mesh = quadMesh(gl, resources, program);
      u = uniforms(gl, program, UNIFORMS);
      textures = {
        image: t.image.texture,
        depth: (t.extras[0] as { texture: WebGLTexture }).texture,
      };
      fit = t.fit;
    },
    draw(gl) {
      if (!program || !mesh || !u || !textures) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      activate(gl, program);
      bindTexture(gl, 0, textures.image);
      bindTexture(gl, 1, textures.depth);
      gl.uniform1i(u.uImage, 0);
      gl.uniform1i(u.uDepth, 1);
      gl.uniform4f(u.uFit, ...fit);
      gl.uniform2f(u.uPose, rig.values.x, rig.values.y);
      gl.uniform1f(u.uIntensity, intensity);
      gl.uniform1f(u.uFocus, focus);
      gl.uniform1f(u.uInvert, invert ? 1 : 0);
      gl.uniform1i(u.uSteps, steps);
      drawMesh(gl, mesh);
    },
    onReduced(reduced) {
      if (reduced) rig.set({ x: 0, y: 0 });
      else effect.request();
    },
  });

  const rig = createSpringRig(getFrameScheduler(), { x: 0, y: 0 }, spring, (_values, settled) => {
    effect.setBusy(!settled);
    effect.request();
  });

  const cleanups: Array<() => void> = [];
  if (pointer) {
    cleanups.push(
      trackPointer(frame, {
        pointerTypes: types,
        onMove(sample) {
          if (effect.reduced() || unsubscribeSource) return;
          rig.to({ x: sample.x, y: sample.y });
        },
        onLeave() {
          if (!unsubscribeSource) rig.to({ x: 0, y: 0 });
        },
      }),
    );
  }
  // The zoomed GPU rendering shows from the start (no visual switch at the first hover).
  effect.request();

  const control: DepthParallaxControl = {
    get mode() {
      return effect.mode;
    },
    get reason() {
      return effect.reason;
    },
    get pose() {
      return { x: rig.values.x, y: rig.values.y };
    },
    seek(progress) {
      if (destroyed || effect.reduced()) return;
      const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
      rig.stop();
      rig.set({ x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p });
    },
    drive(src) {
      if (typeof src?.get !== "function" || typeof src?.subscribe !== "function")
        v.fail('"source" must have get() and subscribe().');
      unsubscribeSource?.();
      control.seek(src.get());
      const stop = src.subscribe((p) => control.seek(p));
      unsubscribeSource = stop;
      return () => {
        stop();
        if (unsubscribeSource === stop) unsubscribeSource = undefined;
      };
    },
    probe: (x, y) => effect.probe(x, y),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeSource?.();
      for (const fn of cleanups.splice(0).reverse()) fn();
      rig.stop();
      effect.destroy();
    },
  };
  return control;
}
