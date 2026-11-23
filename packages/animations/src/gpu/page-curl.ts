/**
 * D04 page curl (catalogue §15; contracts/gpu-api.md, research R8). The GPU driver deforms a subdivided WebGL2 mesh of
 * the raster `front` page around a cylinder (continuous curvature, a straight crease, normals and shading, front and
 * back faces, four start corners); progress moves the fold line from the corner until the page has peeled off. The
 * `under` page is real DOM stacked beneath (`.neshel-pagecurl`), visible through the transparent canvas — it may be any
 * accessible HTML. HTML is never turned into a texture: `driver: "css"` turns a live HTML `front` as a RIGID page
 * about the opposite edge (documented as a rigid turn, not deformation) and is the explicit fallback of
 * `driver: "auto"` when WebGL2, the image or the shader is unavailable. Only the current page is in the accessibility
 * tree (`under` until the turn completes, `front` after). The 014 progress driver gives play/reverse/seek/track/drive.
 * Reduced motion: instant (the end state is shown).
 */
import { createAttributeLedger, setHidden } from "../core/attributes.js";
import { createChannelWriter } from "../core/channel.js";
import type { MotionResult } from "../core/controls.js";
import { CORNERS, type Corner, cornerSigns, curlDirection } from "../core/geometry-3d.js";
import { getMotionHost } from "../core/host.js";
import {
  createProgressDriver,
  type ProgressControl,
  type ProgressSource,
} from "../core/progress-driver.js";
import type { ProgressEffectOptions } from "../core/progress-effect.js";
import { validator } from "../core/validate.js";
import { getGpuSupport } from "./engine/config.js";
import { createImageEffect, type ImageEffect } from "./engine/image-effect.js";
import {
  activate,
  bindTexture,
  drawMesh,
  gridMesh,
  MAX_COLUMNS,
  MAX_ROWS,
  type Mesh,
  uniforms,
} from "./engine/mesh.js";
import { cssColor } from "./engine/sources.js";
import type { GpuReason } from "./engine/surface.js";
import { CURL_FRAGMENT, CURL_VERTEX } from "./shaders.js";

const UNIFORMS = [
  "uSize",
  "uCorner",
  "uDir",
  "uS",
  "uR",
  "uPersp",
  "uShading",
  "uImage",
  "uFit",
  "uBack",
] as const;

export interface PageCurlOptions extends Omit<ProgressEffectOptions, "trigger"> {
  /** `"auto"` (GPU, CSS fallback), `"gpu"` (static without WebGL2) or `"css"` (rigid turn; live HTML). */
  driver?: "auto" | "gpu" | "css";
  /** The page that turns (GPU: `<img>`/`<canvas>`; CSS: any element; default: the frame's first child). */
  front?: HTMLElement;
  /** The page revealed underneath (default: the frame's second child, optional). */
  under?: HTMLElement;
  /** CSS colour of the page's reverse (default `#f1f5f9`). */
  back?: string;
  corner?: Corner;
  /** Curl radius as a fraction of the diagonal 0.02–0.4 (default 0.1). */
  radius?: number;
  /** `"small"` 16×12, `"medium"` 32×24, `"large"` 64×48 or `{ columns, rows }` ≤ 128×96. */
  mesh?: "small" | "medium" | "large" | { columns: number; rows: number };
  /** 0–1 (default 0.6). */
  shading?: number;
  /** `"manual"` (default) or `"mount"`. */
  trigger?: "manual" | "mount";
  maxDpr?: number;
}

export interface PageCurlControl extends Omit<ProgressControl, "destroy"> {
  /** `"gpu"`: mesh deformation; `"css"`: rigid turn; `"static"`: instant swap (no driver available or reduced). */
  readonly mode: "gpu" | "css" | "static";
  readonly reason: GpuReason | undefined;
  probe(x: number, y: number): number[] | undefined;
  destroy(): void;
}

const MESHES = { small: [16, 12], medium: [32, 24], large: [64, 48] } as const;

export function createPageCurl(frame: HTMLElement, options: PageCurlOptions = {}): PageCurlControl {
  const v = validator("createPageCurl");
  if (!frame || frame.nodeType !== 1) v.fail('"frame" must be an element.');
  const o = v.options(options);
  const driverKind = v.oneOf("driver", o.driver, ["auto", "gpu", "css"], "auto");
  const children = [...frame.children].filter((c) => !c.matches("canvas.neshel-gpu-canvas"));
  const front = (o.front ?? children[0]) as HTMLElement | undefined;
  const under = (o.under ?? children[1]) as HTMLElement | undefined;
  if (!front) v.fail("the frame has no front page.");
  const corner = v.oneOf("corner", o.corner, CORNERS, "bottom-right");
  const radius = v.number("radius", o.radius, 0.1, 0.02, 0.4);
  const shading = v.number("shading", o.shading, 0.6, 0, 1);
  const back = v.css("back", o.back, "#f1f5f9");
  const duration = v.duration("duration", o.duration, 900);
  const easing = o.easing === undefined ? "standard" : v.easing(o.easing);
  const policy = v.reducedMotion(o.reducedMotion);
  const trigger = v.oneOf("trigger", o.trigger, ["manual", "mount"], "manual");
  const onComplete = v.callback<(r: MotionResult) => void>("onComplete", o.onComplete);
  const maxDpr = o.maxDpr === undefined ? undefined : v.number("maxDpr", o.maxDpr, 2, 1, 3);
  let columns: number;
  let rows: number;
  if (typeof o.mesh === "object" && o.mesh !== null) {
    columns = Math.round(v.number("mesh.columns", o.mesh.columns, 32, 1, MAX_COLUMNS));
    rows = Math.round(v.number("mesh.rows", o.mesh.rows, 24, 1, MAX_ROWS));
  } else {
    [columns, rows] = MESHES[v.oneOf("mesh", o.mesh, ["small", "medium", "large"], "medium")];
  }
  const f = front as HTMLElement;
  const raster = f.tagName === "IMG" || f.tagName === "CANVAS";

  const ledger = createAttributeLedger();
  const key = Symbol("gpu/page-curl");
  const frontHost = getMotionHost(f);
  const frontWriter = createChannelWriter(f, ["transform-origin", "backface-visibility"], {
    id: "gpu/page-curl",
  });
  let mode: PageCurlControl["mode"] = "static";
  let reason: GpuReason | undefined;
  let effect: ImageEffect | undefined;
  let program: WebGLProgram | undefined;
  let mesh: Mesh | undefined;
  let u: Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null> | undefined;
  let texture: WebGLTexture | undefined;
  let fit: [number, number, number, number] = [1, 1, 0, 0];
  const backRgb = cssColor(frame.ownerDocument, back, [0.945, 0.961, 0.976]);
  let current = 0;
  let destroyed = false;

  function syncPages(p: number): void {
    const done = p >= 1 - 1e-6;
    setHidden(ledger, f, done);
    if (under) setHidden(ledger, under, !done);
  }

  function renderCss(p: number): void {
    const { sx } = cornerSigns(corner);
    // Right corners turn about the left edge (to the left), left corners about the right edge.
    frontWriter.set("transform-origin", sx > 0 ? "0% 50%" : "100% 50%");
    frontWriter.set("backface-visibility", "hidden");
    const deg = -sx * p * 180;
    frontHost.setLayer(key, Math.abs(deg) < 1e-3 ? undefined : { perspective: 1600, rotateY: deg });
    frontHost.setOpacity(key, undefined);
  }

  function renderStatic(p: number): void {
    frontHost.setLayer(key, undefined);
    frontWriter.release();
    frontHost.setOpacity(key, p >= 0.5 ? 0 : undefined);
  }

  function render(p: number): void {
    if (destroyed) return;
    current = p;
    syncPages(p);
    if (driver.reduced() || mode === "static") renderStatic(p);
    else if (mode === "css") renderCss(p);
    else {
      frontHost.setLayer(key, undefined);
      frontWriter.release();
      // Fully peeled: nothing left to draw over `under`; the front stays hidden.
      frontHost.setOpacity(key, p >= 1 - 1e-6 ? 0 : undefined);
      effect?.setBusy(driver.state === "running");
      effect?.request();
    }
  }

  const driver = createProgressDriver({
    duration,
    easing,
    reducedMotion: policy,
    render,
    onSettle(result) {
      effect?.setBusy(false);
      if (result.status === "completed") onComplete?.(result);
    },
  });

  function switchToCss(why: GpuReason | undefined): void {
    effect?.destroy();
    effect = undefined;
    mode = driverKind === "gpu" ? "static" : "css";
    reason = why;
    render(current);
  }

  if (driverKind === "css") mode = "css";
  else if (!raster) {
    if (driverKind === "gpu")
      v.fail('the GPU driver needs a raster front page (<img> or <canvas>); use driver "css".');
    switchToCss(undefined);
  } else if (getGpuSupport().webgl2 === false) switchToCss("unsupported");
  else {
    mode = "gpu";
    effect = createImageEffect({
      frame,
      source: f as HTMLImageElement | HTMLCanvasElement,
      policy,
      maxDpr,
      depth: true,
      init(gl, resources, t) {
        program = resources.program(CURL_VERTEX, CURL_FRAGMENT);
        mesh = gridMesh(gl, resources, program, columns, rows);
        u = uniforms(gl, program, UNIFORMS);
        texture = t.image.texture;
        fit = t.fit;
      },
      draw(gl) {
        if (!program || !mesh || !u || !texture) return;
        const w = frame.clientWidth || 1;
        const h = frame.clientHeight || 1;
        const { sx, sy } = cornerSigns(corner);
        const dir = curlDirection(corner, w, h);
        const diagonal = Math.hypot(w, h);
        const r = radius * diagonal;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (current >= 1 - 1e-6) return; // fully peeled
        gl.enable(gl.DEPTH_TEST);
        activate(gl, program);
        bindTexture(gl, 0, texture);
        gl.uniform1i(u.uImage, 0);
        gl.uniform4f(u.uFit, ...fit);
        gl.uniform2f(u.uSize, w, h);
        gl.uniform2f(u.uCorner, sx > 0 ? w : 0, sy > 0 ? h : 0);
        gl.uniform2f(u.uDir, dir.x, dir.y);
        gl.uniform1f(u.uS, current * (diagonal + Math.PI * r));
        gl.uniform1f(u.uR, r);
        gl.uniform1f(u.uPersp, 0.3 / Math.max(w, h));
        gl.uniform1f(u.uShading, shading);
        gl.uniform3f(u.uBack, ...backRgb);
        drawMesh(gl, mesh);
        gl.disable(gl.DEPTH_TEST);
      },
      onReduced() {
        // Reduced motion released the surface (static swap); when it ends the GPU page is requested again.
        render(current);
      },
      onMode(next, why) {
        if (next === "static" && why && why !== "budget" && why !== "lost") {
          if (driverKind === "auto") switchToCss(why);
          else {
            mode = "static";
            reason = why;
            render(current);
          }
        } else if (next === "gpu") {
          reason = undefined;
        }
      },
    });
    effect.request();
  }

  driver.jump(0);
  render(0);
  if (trigger === "mount") driver.play();
  if (o.progress) driver.drive(o.progress as ProgressSource);

  return {
    get state() {
      return driver.state;
    },
    get progress() {
      return driver.progress;
    },
    get finished() {
      return driver.finished;
    },
    get mode() {
      if (driver.reduced()) return "static";
      // An evicted or lost GPU surface shows the native page until its next frame request.
      if (mode === "gpu" && effect && effect.reason && effect.mode !== "gpu") return "static";
      return mode;
    },
    get reason() {
      return reason ?? effect?.reason;
    },
    play: () => driver.play(),
    pause: () => driver.pause(),
    reverse: () => driver.reverse(),
    finish: () => driver.finish(),
    cancel: () => driver.cancel(),
    seek: (p) => driver.seek(p),
    track: (t) => driver.track(t),
    drive: (s) => driver.drive(s),
    probe: (x, y) => effect?.probe(x, y),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      driver.destroy();
      effect?.destroy();
      frontHost.setLayer(key, undefined);
      frontHost.setOpacity(key, undefined);
      frontWriter.release();
      ledger.restore();
    },
  };
}
