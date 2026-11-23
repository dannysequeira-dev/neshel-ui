/**
 * GPU Surface Manager (Phase 016, internal to `./gpu`; ADR 0031 §2, research R3). The Phase 015 canvas-surface
 * lifecycle (`ensure → resize → draw → release`) implemented with WebGL2 contexts:
 * - lazy: no context until the first `request()`; the canvas (`aria-hidden`, `role="presentation"`,
 *   `pointer-events: none`, positioned inline) is created then;
 * - budget: at most `limits.maxContexts` contexts; at the limit the least recently drawn IDLE surface is evicted
 *   (resources and context released; its effect shows the original content, identical at rest); if none is idle the
 *   new surface waits and is granted when a context frees;
 * - ONE draw task per frame for every dirty, visible surface (write phase of the shared scheduler) — N effects never
 *   mean N scheduler tasks; nothing is drawn while nothing changes;
 * - DPR capped (`limits.maxDpr`, per-surface pixel cap), ResizeObserver sizes applied in the write phase;
 * - tracked programs, shaders, buffers, textures and vertex arrays deleted exactly on release (then
 *   `WEBGL_lose_context.loseContext()`, canvas zeroed and removed);
 * - context loss: `preventDefault()`, resources forgotten, effect informed (`lost`); restore re-runs `init` and draws;
 * - failures (`unsupported`, `shader`, `cors`, `texture`, `memory`) leave the surface failed and the effect static.
 */
import { getFrameScheduler } from "../../core/scheduler.js";
import { isGateVisible, subscribeVisibility } from "../../core/visibility-gate.js";
import { getGpuSupport, limits } from "./config.js";
import { gpuCounters } from "./debug.js";

export type GpuReason =
  | "unsupported"
  | "shader"
  | "cors"
  | "texture"
  | "memory"
  | "budget"
  | "lost";

export class GpuFailure extends Error {
  constructor(
    readonly reason: GpuReason,
    message: string,
  ) {
    super(`[@neshel-ui/animations] GPU ${reason}: ${message}`);
    this.name = "GpuFailure";
  }
}

export type TextureWrap = "clamp" | "repeat" | "mirror";

export interface GpuTexture {
  readonly texture: WebGLTexture;
  readonly width: number;
  readonly height: number;
}

export interface GpuResources {
  /** Compile and link a package program (throws `GpuFailure("shader")`). */
  program(vertex: string, fragment: string): WebGLProgram;
  buffer(data: ArrayBufferView, target?: number): WebGLBuffer;
  vertexArray(): WebGLVertexArrayObject;
  /** Upload a CORS-clean source (downscaled to the limits; throws `cors`, `texture` or `memory`). */
  texture(source: TexImageSource, wrap?: TextureWrap): GpuTexture;
}

export type SurfaceState = "idle" | "waiting" | "ready" | "failed" | "lost" | "released";

export interface GpuSurfaceOptions {
  /** DPR cap of this surface (≤ the page cap). */
  maxDpr?: number;
  depth?: boolean;
  className?: string;
  /** Create programs, buffers and textures (again after a restore). */
  init(gl: WebGL2RenderingContext, resources: GpuResources): void;
  /** Draw one frame (viewport already set). */
  draw(gl: WebGL2RenderingContext): void;
  /** After the first successful draw (and after each restore). */
  onReady?(): void;
  /** The surface cannot draw (`reason`); the effect must show its original content. */
  onFailure?(reason: GpuReason): void;
  /** Visibility changed (off-screen or hidden page → false): pause clocks. */
  onVisibility?(visible: boolean): void;
}

export interface GpuSurface {
  readonly canvas: HTMLCanvasElement | undefined;
  readonly state: SurfaceState;
  readonly reason: GpuReason | undefined;
  readonly visible: boolean;
  /** CSS px and DPR of the drawing buffer. */
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  /** Busy surfaces (animating) are never evicted. */
  busy: boolean;
  /** Ask for a draw in the next shared draw task (creates the context lazily). */
  request(): void;
  /** Draw synchronously now (probes and tests); false when not ready. */
  drawNow(): boolean;
  /** The live context (probes; `undefined` unless ready). */
  readonly gl: WebGL2RenderingContext | undefined;
  release(): void;
}

interface Record {
  surface: GpuSurface;
  lastDraw: number;
  evict(): void;
  grant(): void;
  draw(force?: boolean): boolean;
}

const live = new Set<Record>();
const waiting = new Set<Record>();
const dirty = new Set<Record>();
let drawCancel: (() => void) | undefined;
let tick = 0;

function scheduleDraw(): void {
  drawCancel ??= getFrameScheduler().schedule(() => {
    drawCancel = undefined;
    gpuCounters.frames++;
    tick++;
    const batch = [...dirty];
    dirty.clear();
    for (const record of batch) record.draw();
  }, "write");
}

/** A context is available, possibly after evicting an idle surface. */
function acquire(record: Record): boolean {
  if (live.has(record)) return true;
  if (live.size >= limits.maxContexts) {
    let victim: Record | undefined;
    for (const candidate of live) {
      if (candidate.surface.busy) continue;
      // Off-screen surfaces first, then the least recently drawn.
      const score = (candidate.surface.visible ? 1e12 : 0) + candidate.lastDraw;
      const best = victim ? (victim.surface.visible ? 1e12 : 0) + victim.lastDraw : Infinity;
      if (score < best) victim = candidate;
    }
    if (!victim) return false;
    victim.evict();
    gpuCounters.evictions++;
  }
  live.add(record);
  return true;
}

function freed(): void {
  for (const record of waiting) {
    if (live.size >= limits.maxContexts) return;
    waiting.delete(record);
    gpuCounters.waiting--;
    record.grant();
  }
}

const INLINE =
  "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;border:0;opacity:0;z-index:2";

function bytesOf(w: number, h: number): number {
  return Math.max(0, Math.round(w)) * Math.max(0, Math.round(h)) * 4;
}

export function createGpuSurface(container: HTMLElement, options: GpuSurfaceOptions): GpuSurface {
  const surfaceDpr = Math.min(limits.maxDpr, Math.max(1, options.maxDpr ?? limits.maxDpr));
  let canvas: HTMLCanvasElement | undefined;
  let gl: WebGL2RenderingContext | undefined;
  let state: SurfaceState = "idle";
  let reason: GpuReason | undefined;
  let visible = isGateVisible(container);
  let width = container.clientWidth;
  let height = container.clientHeight;
  let dpr = 1;
  let drawn = false;
  let observer: ResizeObserver | undefined;
  let cancelResize: (() => void) | undefined;
  let pendingSize: { w: number; h: number } | undefined;
  let bufferBytes = 0;
  const tracked = {
    programs: [] as WebGLProgram[],
    shaders: [] as WebGLShader[],
    buffers: [] as WebGLBuffer[],
    textures: [] as Array<{ texture: WebGLTexture; bytes: number }>,
    arrays: [] as WebGLVertexArrayObject[],
  };
  gpuCounters.surfaces++;

  const currentDpr = () => {
    const ratio = (globalThis as { devicePixelRatio?: number }).devicePixelRatio;
    let d = Math.min(surfaceDpr, Math.max(1, Number.isFinite(ratio) && ratio ? ratio : 1));
    const pixels = width * height * d * d;
    if (pixels > limits.maxSurfacePixels)
      d = Math.max(1, Math.sqrt(limits.maxSurfacePixels / (width * height)));
    return d;
  };

  function sizeBuffer(): void {
    if (!canvas) return;
    dpr = currentDpr();
    const bw = Math.max(1, Math.round(width * dpr));
    const bh = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    const next = bytesOf(bw, bh) * (options.depth ? 2 : 1);
    gpuCounters.drawingBufferBytes += next - bufferBytes;
    bufferBytes = next;
  }

  function forget(): void {
    // Objects of a lost context are invalid; only the bookkeeping is undone.
    gpuCounters.programs -= tracked.programs.length;
    gpuCounters.shaders -= tracked.shaders.length;
    gpuCounters.buffers -= tracked.buffers.length;
    gpuCounters.vertexArrays -= tracked.arrays.length;
    for (const t of tracked.textures) gpuCounters.textureBytes -= t.bytes;
    gpuCounters.textures -= tracked.textures.length;
    tracked.programs = [];
    tracked.shaders = [];
    tracked.buffers = [];
    tracked.textures = [];
    tracked.arrays = [];
  }

  function deleteAll(): void {
    if (gl && !gl.isContextLost()) {
      for (const p of tracked.programs) gl.deleteProgram(p);
      for (const s of tracked.shaders) gl.deleteShader(s);
      for (const b of tracked.buffers) gl.deleteBuffer(b);
      for (const t of tracked.textures) gl.deleteTexture(t.texture);
      for (const a of tracked.arrays) gl.deleteVertexArray(a);
    }
    forget();
  }

  const resources: GpuResources = {
    program(vertex, fragment) {
      const g = gl as WebGL2RenderingContext;
      const compile = (type: number, source: string) => {
        const shader = g.createShader(type);
        if (!shader) throw new GpuFailure("shader", "createShader failed");
        tracked.shaders.push(shader);
        gpuCounters.shaders++;
        g.shaderSource(shader, source);
        g.compileShader(shader);
        return shader;
      };
      const vs = compile(g.VERTEX_SHADER, vertex);
      const fs = compile(g.FRAGMENT_SHADER, fragment);
      const program = g.createProgram();
      if (!program) throw new GpuFailure("shader", "createProgram failed");
      tracked.programs.push(program);
      gpuCounters.programs++;
      g.attachShader(program, vs);
      g.attachShader(program, fs);
      g.linkProgram(program);
      const simulated = limits.simulate.shaderFailure;
      if (simulated || !g.getProgramParameter(program, g.LINK_STATUS)) {
        gpuCounters.compileErrors++;
        const log = simulated
          ? "simulated failure (configureGpu simulate.shaderFailure)"
          : g.getProgramInfoLog(program) ||
            g.getShaderInfoLog(vs) ||
            g.getShaderInfoLog(fs) ||
            "link failed";
        throw new GpuFailure("shader", log);
      }
      return program;
    },
    buffer(data, target) {
      const g = gl as WebGL2RenderingContext;
      const buffer = g.createBuffer();
      if (!buffer) throw new GpuFailure("memory", "createBuffer failed");
      tracked.buffers.push(buffer);
      gpuCounters.buffers++;
      const t = target ?? g.ARRAY_BUFFER;
      g.bindBuffer(t, buffer);
      g.bufferData(t, data, g.STATIC_DRAW);
      return buffer;
    },
    vertexArray() {
      const g = gl as WebGL2RenderingContext;
      const vao = g.createVertexArray();
      if (!vao) throw new GpuFailure("memory", "createVertexArray failed");
      tracked.arrays.push(vao);
      gpuCounters.vertexArrays++;
      g.bindVertexArray(vao);
      return vao;
    },
    texture(source, wrap = "clamp") {
      const g = gl as WebGL2RenderingContext;
      if (limits.simulate.textureFailure)
        throw new GpuFailure("texture", "simulated failure (configureGpu simulate.textureFailure)");
      const size = sourceSize(source);
      if (!size.width || !size.height)
        throw new GpuFailure("texture", "the source has no pixels yet");
      const deviceMax = Math.min(limits.maxTextureSize, g.getParameter(g.MAX_TEXTURE_SIZE) || 4096);
      let scale = Math.min(1, deviceMax / Math.max(size.width, size.height));
      const available =
        limits.memoryBudget - gpuCounters.textureBytes - gpuCounters.drawingBufferBytes;
      const wanted = bytesOf(size.width * scale, size.height * scale);
      if (wanted > available) {
        const fit = Math.sqrt(Math.max(0, available) / wanted);
        if (fit < 0.25) throw new GpuFailure("memory", "the GPU memory budget is exhausted");
        scale *= fit;
      }
      let upload: TexImageSource = source;
      const w = Math.max(1, Math.round(size.width * scale));
      const h = Math.max(1, Math.round(size.height * scale));
      if (scale < 1) {
        const scaled = container.ownerDocument.createElement("canvas");
        scaled.width = w;
        scaled.height = h;
        scaled.getContext("2d")?.drawImage(source as CanvasImageSource, 0, 0, w, h);
        upload = scaled;
      }
      const texture = g.createTexture();
      if (!texture) throw new GpuFailure("memory", "createTexture failed");
      g.bindTexture(g.TEXTURE_2D, texture);
      g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      try {
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, upload);
      } catch (error) {
        g.deleteTexture(texture);
        const name = (error as { name?: string })?.name;
        throw new GpuFailure(
          name === "SecurityError" ? "cors" : "texture",
          name === "SecurityError"
            ? "the image is not CORS-clean (serve it with CORS headers and crossOrigin, or same-origin)"
            : String((error as Error)?.message ?? error),
        );
      }
      const mode =
        wrap === "repeat" ? g.REPEAT : wrap === "mirror" ? g.MIRRORED_REPEAT : g.CLAMP_TO_EDGE;
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, mode);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, mode);
      const bytes = bytesOf(w, h);
      tracked.textures.push({ texture, bytes });
      gpuCounters.textures++;
      gpuCounters.textureBytes += bytes;
      return { texture, width: w, height: h };
    },
  };

  function fail(next: GpuReason, error?: unknown): void {
    reason = next;
    state = next === "lost" ? "lost" : "failed";
    gpuCounters.fallbacks++;
    if (error && typeof console !== "undefined" && next === "shader")
      console.warn(String((error as Error)?.message ?? error));
    if (canvas) canvas.style.setProperty("opacity", "0");
    options.onFailure?.(next);
  }

  function initResources(): boolean {
    if (!gl) return false;
    try {
      options.init(gl, resources);
      return true;
    } catch (error) {
      deleteAll();
      fail(error instanceof GpuFailure ? error.reason : "texture", error);
      return false;
    }
  }

  let lostAt = 0;
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const onLost = (event: Event) => {
    event.preventDefault();
    gpuCounters.losses++;
    gpuCounters.lost++;
    lostAt = now();
    forget();
    drawn = false;
    fail("lost");
  };
  const onRestored = () => {
    if (state === "lost") gpuCounters.lost--;
    gpuCounters.restores++;
    state = "ready";
    reason = undefined;
    sizeBuffer();
    if (initResources()) surface.request();
  };

  function create(): boolean {
    if (getGpuSupport().webgl2 === false) {
      fail("unsupported");
      return false;
    }
    const node = container.ownerDocument.createElement("canvas");
    let context: WebGL2RenderingContext | null = null;
    try {
      context = node.getContext("webgl2", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: options.depth === true,
        stencil: false,
        preserveDrawingBuffer: false,
      });
    } catch {
      context = null;
    }
    if (!context) {
      fail("unsupported");
      return false;
    }
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("role", "presentation");
    node.setAttribute("style", INLINE);
    if (options.className) node.className = options.className;
    node.addEventListener("webglcontextlost", onLost);
    node.addEventListener("webglcontextrestored", onRestored);
    container.appendChild(node);
    canvas = node;
    gl = context;
    gpuCounters.contexts++;
    width = container.clientWidth || width;
    height = container.clientHeight || height;
    sizeBuffer();
    if (typeof ResizeObserver === "function") {
      observer = new ResizeObserver((entries) => {
        const box = entries[entries.length - 1]?.contentRect;
        if (!box) return;
        pendingSize = { w: box.width, h: box.height };
        cancelResize ??= getFrameScheduler().schedule(() => {
          cancelResize = undefined;
          if (
            pendingSize &&
            (Math.abs(pendingSize.w - width) >= 1 ||
              Math.abs(pendingSize.h - height) >= 1 ||
              currentDpr() !== dpr)
          ) {
            width = pendingSize.w;
            height = pendingSize.h;
            sizeBuffer();
            surface.request();
          }
          pendingSize = undefined;
        }, "write");
      });
      observer.observe(container);
    }
    state = "ready";
    reason = undefined;
    return initResources();
  }

  function dropContext(): void {
    cancelResize?.();
    cancelResize = undefined;
    observer?.disconnect();
    observer = undefined;
    deleteAll();
    if (canvas) {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
      canvas = undefined;
    }
    if (gl) {
      gl = undefined;
      gpuCounters.contexts--;
    }
    gpuCounters.drawingBufferBytes -= bufferBytes;
    bufferBytes = 0;
    drawn = false;
  }

  let dirtyWhileHidden = false;
  const unsubscribeGate = subscribeVisibility(container, (next) => {
    visible = next;
    options.onVisibility?.(next);
    if (next && dirtyWhileHidden) {
      dirtyWhileHidden = false;
      surface.request();
    }
  });
  const record: Record = {
    surface: undefined as unknown as GpuSurface,
    lastDraw: 0,
    evict() {
      if (state === "lost") gpuCounters.lost--;
      live.delete(record);
      dirty.delete(record);
      dropContext();
      state = "idle";
      reason = "budget";
      options.onFailure?.("budget");
    },
    grant() {
      if (state !== "waiting") return;
      state = "idle";
      surface.request();
    },
    draw(force = false) {
      if (state !== "ready" || !gl || !canvas || gl.isContextLost()) return false;
      if (!visible && !force) {
        dirtyWhileHidden = true;
        return false;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      try {
        options.draw(gl);
      } catch (error) {
        fail(error instanceof GpuFailure ? error.reason : "texture", error);
        return false;
      }
      gpuCounters.draws++;
      record.lastDraw = tick;
      if (!drawn) {
        drawn = true;
        canvas.style.setProperty("opacity", "1");
        options.onReady?.();
      }
      return true;
    },
  };

  const surface: GpuSurface = {
    get canvas() {
      return canvas;
    },
    get state() {
      return state;
    },
    get reason() {
      return reason;
    },
    get visible() {
      return visible;
    },
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get dpr() {
      return dpr;
    },
    get gl() {
      return state === "ready" ? gl : undefined;
    },
    busy: false,
    request() {
      // A context the browser dropped without restoring it (e.g. too many contexts): after 1 s, the next request
      // replaces it with a fresh one instead of leaving the effect static forever.
      if (state === "lost" && now() - lostAt > 1000) {
        gpuCounters.lost--;
        live.delete(record);
        dirty.delete(record);
        dropContext();
        state = "idle";
        reason = undefined;
        freed();
      }
      if (state === "released" || state === "failed" || state === "lost") return;
      if (state === "waiting") return;
      if (state === "idle") {
        if (!acquire(record)) {
          state = "waiting";
          reason = "budget";
          waiting.add(record);
          gpuCounters.waiting++;
          options.onFailure?.("budget");
          return;
        }
        if (!create()) {
          live.delete(record);
          dropContext();
          freed();
          return;
        }
      }
      dirty.add(record);
      scheduleDraw();
    },
    drawNow() {
      if (state === "idle") {
        surface.request();
        dirty.delete(record);
      }
      // An explicit synchronous request (probe) draws even before the visibility observer reported.
      return record.draw(true);
    },
    release() {
      if (state === "released") return;
      const held = live.delete(record);
      dirty.delete(record);
      if (waiting.delete(record)) gpuCounters.waiting--;
      unsubscribeGate();
      if (state === "lost") gpuCounters.lost--;
      dropContext();
      state = "released";
      gpuCounters.surfaces--;
      if (held) freed();
    },
  };
  record.surface = surface;
  return surface;
}

function sourceSize(source: TexImageSource): { width: number; height: number } {
  const s = source as {
    naturalWidth?: number;
    naturalHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
    width?: number;
    height?: number;
  };
  return {
    width: s.naturalWidth || s.videoWidth || s.width || 0,
    height: s.naturalHeight || s.videoHeight || s.height || 0,
  };
}

/** Live surfaces (tests): contexts held and waiting. */
export function surfaceStats(): { live: number; waiting: number; dirty: number } {
  return { live: live.size, waiting: waiting.size, dirty: dirty.size };
}
