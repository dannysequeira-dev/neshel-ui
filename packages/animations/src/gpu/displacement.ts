/**
 * D08 displacement-map hover (catalogue §15; contracts/gpu-api.md, research R12). Real distortion of a raster image by
 * a displacement map in a WebGL2 fragment shader: R/G (or one channel) encode the x/y offset around 0.5, bounded to
 * 0.08 UV × strength, tiled by `scale`, with clamp, mirror or fade edges. Maps: a consumer URL/`<img>`/`<canvas>`
 * (CORS: `crossOrigin="anonymous"` by default; a tainted map leaves the image static with reason `cors`) or the
 * built-in seeded `"noise"` map generated on a small Canvas 2D. A spring animates the amount on hover and
 * focus-visible; frames are requested only while it moves. Reduced motion: static. Without WebGL2: static image.
 */
import { trackPointer } from "../core/pointer.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { getFrameScheduler } from "../core/scheduler.js";
import type { SpringOptions } from "../core/spring.js";
import { createSpringRig } from "../core/springs.js";
import { validator } from "../core/validate.js";
import { createImageEffect, type GpuMode } from "./engine/image-effect.js";
import { activate, bindTexture, drawMesh, type Mesh, quadMesh, uniforms } from "./engine/mesh.js";
import { isMapUrl, type MapSource, noiseMap } from "./engine/sources.js";
import type { GpuReason } from "./engine/surface.js";
import { DISPLACEMENT_FRAGMENT, QUAD_VERTEX } from "./shaders.js";

const UNIFORMS = [
  "uImage",
  "uMap",
  "uFit",
  "uAmount",
  "uStrength",
  "uScale",
  "uShift",
  "uChannels",
  "uEdge",
] as const;

export interface DisplacementHoverOptions {
  image?: HTMLImageElement | HTMLCanvasElement;
  /** URL, `<img>`, `<canvas>`, `ImageBitmap` or `"noise"` (default). */
  map?: MapSource | "noise";
  /** 0–1 (≤ 0.08 UV; default 0.5). */
  strength?: number;
  /** Map tiling 0.25–4 (default 1). */
  scale?: number;
  channels?: "rg" | "r" | "g";
  edge?: "clamp" | "mirror" | "fade";
  /** Also on `:focus-visible` within the frame (default true). */
  focus?: boolean;
  spring?: SpringOptions;
  crossOrigin?: "anonymous" | "use-credentials";
  /** Seed of the built-in noise map (default 1). */
  seed?: number;
  pointerTypes?: readonly ("mouse" | "pen" | "touch")[];
  maxDpr?: number;
  reducedMotion?: ReducedMotion;
}

export interface DisplacementControl {
  readonly mode: GpuMode;
  readonly reason: GpuReason | undefined;
  /** Rendered amount 0–1. */
  readonly amount: number;
  /** Animate the amount (programmatic or external progress). */
  set(amount: number): void;
  probe(x: number, y: number): number[] | undefined;
  destroy(): void;
}

export function createDisplacementHover(
  frame: HTMLElement,
  options: DisplacementHoverOptions = {},
): DisplacementControl {
  const v = validator("createDisplacementHover");
  if (!frame || frame.nodeType !== 1) v.fail('"frame" must be an element.');
  const o = v.options(options);
  const source = (o.image ?? frame.querySelector("img, canvas")) as
    | HTMLImageElement
    | HTMLCanvasElement
    | null;
  if (!source) v.fail("the frame has no <img> or <canvas>.");
  const strength = v.number("strength", o.strength, 0.5, 0, 1);
  const scale = v.number("scale", o.scale, 1, 0.25, 4);
  const channels = v.oneOf("channels", o.channels, ["rg", "r", "g"], "rg");
  const edge = v.oneOf("edge", o.edge, ["clamp", "mirror", "fade"], "fade");
  const focus = v.flag("focus", o.focus, true);
  const spring = v.spring(o.spring, { stiffness: 180, damping: 26 });
  const crossOrigin = v.oneOf(
    "crossOrigin",
    o.crossOrigin,
    ["anonymous", "use-credentials"],
    "anonymous",
  );
  const seed = Math.round(v.number("seed", o.seed, 1, 0, 2 ** 31));
  const maxDpr = o.maxDpr === undefined ? undefined : v.number("maxDpr", o.maxDpr, 2, 1, 3);
  const policy = v.reducedMotion(o.reducedMotion);
  const map = o.map ?? "noise";
  if (typeof map === "string" && map !== "noise" && !isMapUrl(map))
    v.fail('"map" must be an image URL (relative, http(s):, blob: or data:image/).');
  const mapSource: MapSource =
    map === "noise" ? noiseMap(frame.ownerDocument, seed) : (map as MapSource);
  const types = new Set<string>(o.pointerTypes ?? ["mouse", "pen"]);

  let program: WebGLProgram | undefined;
  let mesh: Mesh | undefined;
  let u: Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null> | undefined;
  let textures: { image: WebGLTexture; map: WebGLTexture } | undefined;
  let fit: [number, number, number, number] = [1, 1, 0, 0];
  let destroyed = false;

  const effect = createImageEffect({
    frame,
    source: source as HTMLImageElement | HTMLCanvasElement,
    policy,
    maxDpr,
    extras: [{ source: mapSource, crossOrigin, wrap: "repeat" }],
    init(gl, resources, t) {
      program = resources.program(QUAD_VERTEX, DISPLACEMENT_FRAGMENT);
      mesh = quadMesh(gl, resources, program);
      u = uniforms(gl, program, UNIFORMS);
      textures = {
        image: t.image.texture,
        map: (t.extras[0] as { texture: WebGLTexture }).texture,
      };
      fit = t.fit;
    },
    draw(gl) {
      if (!program || !mesh || !u || !textures) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      activate(gl, program);
      bindTexture(gl, 0, textures.image);
      bindTexture(gl, 1, textures.map);
      gl.uniform1i(u.uImage, 0);
      gl.uniform1i(u.uMap, 1);
      gl.uniform4f(u.uFit, ...fit);
      gl.uniform1f(u.uAmount, rig.values.a);
      gl.uniform1f(u.uStrength, strength);
      gl.uniform1f(u.uScale, scale);
      gl.uniform2f(u.uShift, rig.values.sx, rig.values.sy);
      gl.uniform1i(u.uChannels, channels === "rg" ? 0 : channels === "r" ? 1 : 2);
      gl.uniform1i(u.uEdge, edge === "clamp" ? 0 : edge === "mirror" ? 1 : 2);
      drawMesh(gl, mesh);
    },
    onReduced(reduced) {
      if (reduced) rig.set({ a: 0, sx: 0, sy: 0 });
    },
  });

  const rig = createSpringRig(
    getFrameScheduler(),
    { a: 0, sx: 0, sy: 0 },
    spring,
    (_values, settled) => {
      effect.setBusy(!settled);
      effect.request();
    },
  );

  function aim(amount: number, sx = rig.values.sx, sy = rig.values.sy): void {
    if (destroyed || effect.reduced()) return;
    rig.to({ a: Math.min(1, Math.max(0, amount)), sx, sy });
  }

  const cleanups: Array<() => void> = [];
  let hovering = false;
  cleanups.push(
    trackPointer(frame, {
      pointerTypes: types,
      onMove(sample) {
        hovering = true;
        aim(1, sample.x * 0.04, sample.y * 0.04);
      },
      onLeave() {
        hovering = false;
        aim(0, 0, 0);
      },
    }),
  );
  if (focus) {
    const visibleFocus = () => {
      try {
        return Boolean(frame.querySelector(":focus-visible")) || frame.matches(":focus-visible");
      } catch {
        return true;
      }
    };
    const onFocus = () => {
      if (visibleFocus()) aim(1);
    };
    const onBlur = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if ((next && frame.contains(next)) || hovering) return;
      aim(0, 0, 0);
    };
    frame.addEventListener("focusin", onFocus);
    frame.addEventListener("focusout", onBlur);
    cleanups.push(() => {
      frame.removeEventListener("focusin", onFocus);
      frame.removeEventListener("focusout", onBlur);
    });
  }

  return {
    get mode() {
      return effect.mode;
    },
    get reason() {
      return effect.reason;
    },
    get amount() {
      return rig.values.a;
    },
    set: (amount) => aim(Number.isFinite(amount) ? amount : 0),
    probe: (x, y) => effect.probe(x, y),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const fn of cleanups.splice(0).reverse()) fn();
      rig.stop();
      effect.destroy();
    },
  };
}
