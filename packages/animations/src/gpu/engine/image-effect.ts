/**
 * Common wiring of the raster GPU effects (Phase 016; contracts/gpu-api.md "Common effect behaviour", ADR 0031 §4).
 * The native `<img>` (or `<canvas>`) stays in the DOM with every attribute and in the accessibility tree; it receives a
 * Motion Host opacity contribution of 0 only after the first successful GPU draw and gets it back on any failure,
 * eviction, context loss, reduced motion and destroy — the original content is never lost. The surface is created on
 * the first frame request once the image (and any map) is decoded; reduced motion releases it entirely.
 */
import { getMotionHost } from "../../core/host.js";
import { imageLoadState, watchImage } from "../../core/media-load.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../../core/reduced-motion.js";
import { gpuCounters } from "./debug.js";
import { fitFor, loadSource, type MapSource } from "./sources.js";
import {
  createGpuSurface,
  GpuFailure,
  type GpuReason,
  type GpuResources,
  type GpuSurface,
  type GpuTexture,
} from "./surface.js";

export type GpuMode = "gpu" | "static" | "fallback";

export interface ImageEffectTextures {
  image: GpuTexture;
  extras: GpuTexture[];
  /** `object-fit` mapping of the image (scale.xy, offset.zw). */
  fit: [number, number, number, number];
  /** Decoded extra sources (validation). */
  extraSources: TexImageSource[];
}

export interface ImageEffectConfig {
  frame: HTMLElement;
  source: HTMLImageElement | HTMLCanvasElement;
  policy: ReducedMotion;
  maxDpr?: number;
  depth?: boolean;
  extras?: Array<{
    source: MapSource;
    crossOrigin: "anonymous" | "use-credentials";
    wrap?: "clamp" | "repeat";
  }>;
  /** Validate decoded extras before any GPU work (throw `GpuFailure` to stay static). */
  validate?(image: TexImageSource, extras: TexImageSource[]): void;
  init(gl: WebGL2RenderingContext, resources: GpuResources, textures: ImageEffectTextures): void;
  draw(gl: WebGL2RenderingContext): void;
  onReduced?(reduced: boolean): void;
  onVisibility?(visible: boolean): void;
  /** Mode or reason changed. */
  onMode?(mode: GpuMode, reason: GpuReason | undefined): void;
}

export interface ImageEffect {
  readonly mode: GpuMode;
  readonly reason: GpuReason | undefined;
  readonly surface: GpuSurface | undefined;
  readonly visible: boolean;
  reduced(): boolean;
  /** Ask for a frame (creates the surface lazily when everything is decoded). */
  request(): void;
  setBusy(busy: boolean): void;
  /** Debug: draw synchronously and read the RGBA pixel at (x, y) in 0–1 frame coordinates. */
  probe(x: number, y: number): number[] | undefined;
  destroy(): void;
}

export function createImageEffect(config: ImageEffectConfig): ImageEffect {
  const { frame, source } = config;
  const key = Symbol("gpu/image");
  const host = getMotionHost(source);
  let systemReduced = prefersReducedMotion();
  const reduced = () => shouldReduceMotion(config.policy, systemReduced);
  let surface: GpuSurface | undefined;
  let mode: GpuMode = "static";
  let reason: GpuReason | undefined;
  let imageReady =
    source.tagName !== "IMG" || imageLoadState(source as HTMLImageElement) === "loaded";
  let extrasReady = !config.extras?.length;
  let extraSources: TexImageSource[] = [];
  let wanted = false;
  let busy = false;
  let destroyed = false;
  gpuCounters.effects++;

  function setMode(next: GpuMode, why: GpuReason | undefined): void {
    if (next === mode && why === reason) return;
    mode = next;
    reason = why;
    if (mode === "gpu") host.setOpacity(key, 0);
    else {
      // The original content comes back in THIS frame (the canvas was hidden synchronously): no empty frame.
      host.setOpacity(key, undefined);
      host.flush();
    }
    config.onMode?.(mode, reason);
  }

  function ensureSurface(): GpuSurface | undefined {
    if (surface || destroyed || reduced()) return surface;
    if (!imageReady || !extrasReady) return undefined;
    if (reason && reason !== "budget") return undefined; // permanent failure: stay static
    surface = createGpuSurface(frame, {
      maxDpr: config.maxDpr,
      depth: config.depth,
      className: "neshel-gpu-canvas",
      init(gl, resources) {
        const image = resources.texture(source);
        const extras = (config.extras ?? []).map((extra, i) =>
          resources.texture(extraSources[i] as TexImageSource, extra.wrap ?? "clamp"),
        );
        let fit = "fill";
        try {
          fit = getComputedStyle(source).objectFit || "fill";
        } catch {}
        const tw = (source as HTMLImageElement).naturalWidth || source.width;
        const th = (source as HTMLImageElement).naturalHeight || source.height;
        config.init(gl, resources, {
          image,
          extras,
          extraSources,
          fit: fitFor(fit, frame.clientWidth || tw, frame.clientHeight || th, tw, th),
        });
      },
      draw: (gl) => config.draw(gl),
      onReady: () => setMode("gpu", undefined),
      onFailure: (why) => setMode("static", why),
      onVisibility: (visible) => config.onVisibility?.(visible),
    });
    surface.busy = busy;
    return surface;
  }

  function flushWanted(): void {
    if (!wanted) return;
    const s = ensureSurface();
    if (!s) return;
    wanted = false;
    s.request();
  }

  const cleanups: Array<() => void> = [];
  if (source.tagName === "IMG") {
    cleanups.push(
      watchImage(source as HTMLImageElement, (state) => {
        const ready = state === "loaded";
        if (ready === imageReady) return;
        imageReady = ready;
        if (!ready) {
          surface?.release();
          surface = undefined;
          setMode("static", state === "error" ? "texture" : undefined);
          return;
        }
        // A new image: rebuild the surface with the new texture.
        surface?.release();
        surface = undefined;
        if (reason === "texture") reason = undefined;
        wanted = true;
        flushWanted();
      }),
    );
  }
  if (config.extras?.length) {
    const doc = frame.ownerDocument;
    Promise.all(config.extras.map((extra) => loadSource(extra.source, extra.crossOrigin, doc)))
      .then((loaded) => {
        if (destroyed) return;
        extraSources = loaded;
        try {
          config.validate?.(source, loaded);
        } catch (error) {
          setMode("static", error instanceof GpuFailure ? error.reason : "texture");
          if (typeof console !== "undefined")
            console.warn(String((error as Error)?.message ?? error));
          return;
        }
        extrasReady = true;
        flushWanted();
      })
      .catch((error) => {
        if (destroyed) return;
        setMode("static", error instanceof GpuFailure ? error.reason : "texture");
      });
  }
  cleanups.push(
    subscribeReducedMotion((value) => {
      systemReduced = value;
      if (reduced()) {
        surface?.release();
        surface = undefined;
        setMode("static", undefined);
      }
      config.onReduced?.(reduced());
    }),
  );

  return {
    get mode() {
      return mode;
    },
    get reason() {
      return reason;
    },
    get surface() {
      return surface;
    },
    get visible() {
      return surface?.visible ?? true;
    },
    reduced,
    request() {
      if (destroyed || reduced()) return;
      wanted = true;
      flushWanted();
    },
    setBusy(next) {
      busy = next;
      if (surface) surface.busy = next;
    },
    probe(x, y) {
      const s = ensureSurface();
      if (!s) return undefined;
      if (!s.drawNow()) return undefined;
      const gl = s.gl;
      const canvas = s.canvas;
      if (!gl || !canvas) return undefined;
      const px = new Uint8Array(4);
      gl.readPixels(
        Math.min(canvas.width - 1, Math.max(0, Math.round(x * canvas.width))),
        Math.min(canvas.height - 1, Math.max(0, Math.round((1 - y) * canvas.height))),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        px,
      );
      return [...px];
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const fn of cleanups.splice(0).reverse()) fn();
      surface?.release();
      surface = undefined;
      host.setOpacity(key, undefined);
      gpuCounters.effects--;
    },
  };
}
