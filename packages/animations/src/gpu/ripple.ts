/**
 * D06 liquid / ripple distortion (catalogue §15; contracts/gpu-api.md, research R10). Real texture-coordinate
 * displacement in a WebGL2 fragment shader: up to 8 impacts, each a damped ring (`exp(−damping·age)`) travelling at
 * `speed`, with a bounded radial offset (≤ 0.03 UV at amplitude 1). The clock runs as ONE update task on the shared
 * scheduler only while the waves carry energy (> 1/1000) and the frame is visible; after that no frame is requested.
 * Deterministic: `seek(p)`/`drive()` render a seeded impact pattern at time `p × duration`; pointer impacts use the
 * pointer position from the box hit area (measured on enter, never per event). Passive listeners, no capture, no
 * `preventDefault`. Reduced motion: off (the image is shown). Without WebGL2: the original image (`mode: "static"`).
 */
import { trackPointer } from "../core/pointer.js";
import type { ProgressSource } from "../core/progress-driver.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { getFrameScheduler } from "../core/scheduler.js";
import { validator } from "../core/validate.js";
import { createImageEffect, type GpuMode } from "./engine/image-effect.js";
import { activate, bindTexture, drawMesh, type Mesh, quadMesh, uniforms } from "./engine/mesh.js";
import type { GpuReason } from "./engine/surface.js";
import { QUAD_VERTEX, RIPPLE_FRAGMENT } from "./shaders.js";

const UNIFORMS = [
  "uImage",
  "uFit",
  "uImpacts",
  "uTime",
  "uAspect",
  "uAmplitude",
  "uFrequency",
  "uDamping",
  "uSpeed",
] as const;

export interface RippleOptions {
  /** The raster source (default: the frame's first `img`/`canvas`). */
  image?: HTMLImageElement | HTMLCanvasElement;
  /** 0–1 (≤ 0.03 UV; default 0.5). */
  amplitude?: number;
  /** 0.5–4 (default 1). */
  frequency?: number;
  /** 0.5–6 per second (default 2.5). */
  damping?: number;
  /** 0.1–1.5 UV per second (default 0.45). */
  speed?: number;
  /** 1–8 simultaneous impacts (default 4). */
  maxImpacts?: number;
  trigger?: "pointer" | "hover" | "manual";
  /** Integer seed of the `seek`/`drive` pattern (default 1). */
  seed?: number;
  /** ms of the `seek`/`drive` timeline 200–10000 (default 2400). */
  duration?: number;
  maxDpr?: number;
  reducedMotion?: ReducedMotion;
}

export interface RippleControl {
  readonly mode: GpuMode;
  readonly reason: GpuReason | undefined;
  /** Whether waves are still moving (a clock task exists). */
  readonly active: boolean;
  /** Add an impact at (x, y) in 0–1 frame coordinates (default centre). */
  impact(x?: number, y?: number, strength?: number): void;
  seek(progress: number): void;
  drive(source: ProgressSource): () => void;
  clear(): void;
  /** Debug probe (lab/tests): RGBA at (x, y) after a synchronous draw. */
  probe(x: number, y: number): number[] | undefined;
  destroy(): void;
}

const EPSILON = 1e-3;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRipple(frame: HTMLElement, options: RippleOptions = {}): RippleControl {
  const v = validator("createRipple");
  if (!frame || frame.nodeType !== 1) v.fail('"frame" must be an element.');
  const o = v.options(options);
  const source = (o.image ?? frame.querySelector("img, canvas")) as
    | HTMLImageElement
    | HTMLCanvasElement
    | null;
  if (!source) v.fail("the frame has no <img> or <canvas>.");
  const amplitude = v.number("amplitude", o.amplitude, 0.5, 0, 1);
  const frequency = v.number("frequency", o.frequency, 1, 0.5, 4);
  const damping = v.number("damping", o.damping, 2.5, 0.5, 6);
  const speed = v.number("speed", o.speed, 0.45, 0.1, 1.5);
  const maxImpacts = Math.round(v.number("maxImpacts", o.maxImpacts, 4, 1, 8));
  const trigger = v.oneOf("trigger", o.trigger, ["pointer", "hover", "manual"], "pointer");
  const seed = Math.round(v.number("seed", o.seed, 1, 0, 2 ** 31));
  const duration = v.number("duration", o.duration, 2400, 200, 10000);
  const maxDpr = o.maxDpr === undefined ? undefined : v.number("maxDpr", o.maxDpr, 2, 1, 3);
  const policy = v.reducedMotion(o.reducedMotion);

  const impacts = new Float32Array(32);
  let count = 0;
  let next = 0;
  let time = 0;
  let clock: (() => void) | undefined;
  let unsubscribeSource: (() => void) | undefined;
  let destroyed = false;
  let mesh: Mesh | undefined;
  let program: WebGLProgram | undefined;
  let u: Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null> | undefined;
  let imageTexture: WebGLTexture | undefined;
  let fit: [number, number, number, number] = [1, 1, 0, 0];

  const effect = createImageEffect({
    frame,
    source: source as HTMLImageElement | HTMLCanvasElement,
    policy,
    maxDpr,
    init(gl, resources, textures) {
      program = resources.program(QUAD_VERTEX, RIPPLE_FRAGMENT);
      mesh = quadMesh(gl, resources, program);
      u = uniforms(gl, program, UNIFORMS);
      imageTexture = textures.image.texture;
      fit = textures.fit;
    },
    draw(gl) {
      if (!program || !mesh || !u || !imageTexture) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      activate(gl, program);
      bindTexture(gl, 0, imageTexture);
      gl.uniform1i(u.uImage, 0);
      gl.uniform4f(u.uFit, ...fit);
      gl.uniform4fv(u.uImpacts, impacts);
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uAspect, (frame.clientWidth || 1) / (frame.clientHeight || 1));
      gl.uniform1f(u.uAmplitude, amplitude);
      gl.uniform1f(u.uFrequency, frequency);
      gl.uniform1f(u.uDamping, damping);
      gl.uniform1f(u.uSpeed, speed);
      drawMesh(gl, mesh);
    },
    onReduced(reduced) {
      if (reduced) stopClock();
    },
    onVisibility(visible) {
      if (!visible) stopClock();
      else if (energy() > EPSILON) startClock();
    },
  });

  function energy(): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
      const age = time - (impacts[i * 4 + 2] as number);
      const strength = impacts[i * 4 + 3] as number;
      if (strength > 0 && age >= 0) total += Math.exp(-damping * age) * strength;
      else if (strength > 0 && age < 0) total += strength;
    }
    return total;
  }

  function stopClock(): void {
    clock?.();
    clock = undefined;
    effect.setBusy(false);
  }

  function startClock(): void {
    if (clock || destroyed || effect.reduced()) return;
    effect.setBusy(true);
    clock = getFrameScheduler().schedule(({ delta }) => {
      time += delta;
      effect.request();
      if (energy() <= EPSILON) {
        // Dissipated: one last (undistorted) frame, then nothing.
        clock = undefined;
        effect.setBusy(false);
        return false;
      }
      return true;
    }, "update");
  }

  function add(x: number, y: number, strength: number): void {
    const slot = count < maxImpacts ? count++ : next;
    next = (slot + 1) % maxImpacts;
    impacts[slot * 4] = Math.min(1, Math.max(0, x));
    impacts[slot * 4 + 1] = Math.min(1, Math.max(0, y));
    impacts[slot * 4 + 2] = time;
    impacts[slot * 4 + 3] = Math.min(1, Math.max(0, strength));
  }

  function pattern(progress: number): void {
    impacts.fill(0);
    count = 0;
    next = 0;
    const random = mulberry32(seed);
    const span = (duration / 1000) * 0.6;
    for (let i = 0; i < maxImpacts; i++) {
      impacts[i * 4] = 0.15 + random() * 0.7;
      impacts[i * 4 + 1] = 0.15 + random() * 0.7;
      impacts[i * 4 + 2] = (span * i) / Math.max(1, maxImpacts);
      impacts[i * 4 + 3] = 0.6 + random() * 0.4;
      count++;
    }
    time = Math.min(1, Math.max(0, progress)) * (duration / 1000);
  }

  const cleanups: Array<() => void> = [];
  if (trigger !== "manual") {
    let last: { x: number; y: number } | undefined;
    let entered = false;
    cleanups.push(
      trackPointer(frame, {
        pointerTypes: new Set(["mouse", "pen", "touch"]),
        onMove(sample) {
          last = { x: (sample.x + 1) / 2, y: (sample.y + 1) / 2 };
          if (trigger === "hover" && !entered) {
            entered = true;
            control.impact(last.x, last.y);
          }
        },
        onLeave() {
          entered = false;
        },
      }),
    );
    if (trigger === "pointer") {
      const onDown = (event: PointerEvent) => {
        if (event.button > 0) return;
        const at = last ?? { x: 0.5, y: 0.5 };
        control.impact(at.x, at.y);
      };
      frame.addEventListener("pointerdown", onDown, { passive: true });
      cleanups.push(() => frame.removeEventListener("pointerdown", onDown));
    }
  }

  const control: RippleControl = {
    get mode() {
      return effect.mode;
    },
    get reason() {
      return effect.reason;
    },
    get active() {
      return clock !== undefined;
    },
    impact(x = 0.5, y = 0.5, strength = 1) {
      if (destroyed || effect.reduced()) return;
      unsubscribeSource?.();
      unsubscribeSource = undefined;
      add(x, y, strength);
      startClock();
      effect.request();
    },
    seek(progress) {
      if (destroyed || effect.reduced()) return;
      stopClock();
      pattern(Number.isFinite(progress) ? progress : 0);
      effect.request();
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
    clear() {
      stopClock();
      impacts.fill(0);
      count = 0;
      next = 0;
      effect.request();
    },
    probe: (x, y) => effect.probe(x, y),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeSource?.();
      for (const fn of cleanups.splice(0).reverse()) fn();
      stopClock();
      effect.destroy();
    },
  };
  return control;
}
