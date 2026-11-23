/**
 * Page-level GPU limits and the lazy WebGL2 probe (Phase 016; contracts/gpu-api.md, research R3). Nothing here runs
 * at import: the probe creates one throwaway context on the first `getGpuSupport()` call and releases it at once.
 */
import { validator } from "../../core/validate.js";

export interface GpuConfig {
  /** Simultaneous WebGL2 contexts 1–8 (default 6; browsers keep ~16 per page). */
  maxContexts?: number;
  /** Device-pixel-ratio cap 1–3 (default 2). */
  maxDpr?: number;
  /** Estimated GPU memory budget in MB 16–512 (default 96). */
  memoryBudget?: number;
  /** Largest texture side px 256–8192 (default 4096; also capped by the device). */
  maxTextureSize?: number;
  /**
   * Testing aid (package-only switches, never consumer GLSL): `unsupported` behaves as if WebGL2 were missing,
   * `shaderFailure` makes the next program link fail, `textureFailure` makes uploads fail. Lets apps verify their
   * fallbacks; off by default.
   */
  simulate?: { unsupported?: boolean; shaderFailure?: boolean; textureFailure?: boolean };
}

export const limits = {
  maxContexts: 6,
  maxDpr: 2,
  memoryBudget: 96 * 1024 * 1024,
  maxTextureSize: 4096,
  /** Drawing-buffer pixel cap per surface (DPR is lowered beyond it). */
  maxSurfacePixels: 4_000_000,
  simulate: { unsupported: false, shaderFailure: false, textureFailure: false },
};

export function configureGpu(config: GpuConfig = {}): void {
  const v = validator("configureGpu");
  const o = v.options(config);
  limits.maxContexts = Math.round(v.number("maxContexts", o.maxContexts, limits.maxContexts, 1, 8));
  limits.maxDpr = v.number("maxDpr", o.maxDpr, limits.maxDpr, 1, 3);
  limits.memoryBudget =
    v.number("memoryBudget", o.memoryBudget, limits.memoryBudget / 1048576, 16, 512) * 1048576;
  limits.maxTextureSize = Math.round(
    v.number("maxTextureSize", o.maxTextureSize, limits.maxTextureSize, 256, 8192),
  );
  if (o.simulate !== undefined) {
    const s = v.options(o.simulate);
    limits.simulate = {
      unsupported: v.flag("simulate.unsupported", s.unsupported, false),
      shaderFailure: v.flag("simulate.shaderFailure", s.shaderFailure, false),
      textureFailure: v.flag("simulate.textureFailure", s.textureFailure, false),
    };
  }
}

export interface GpuSupport {
  webgl2: boolean;
  reason?: "server" | "unsupported";
}

let probed: GpuSupport | undefined;

export function getGpuSupport(): GpuSupport {
  if (limits.simulate.unsupported) return { webgl2: false, reason: "unsupported" };
  if (probed) return probed;
  if (typeof document === "undefined") return { webgl2: false, reason: "server" };
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = document.createElement("canvas").getContext("webgl2");
  } catch {
    gl = null;
  }
  probed = gl ? { webgl2: true } : { webgl2: false, reason: "unsupported" };
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return probed;
}

/** Tests: forget the cached probe and reset the limits. */
export function resetGpuForTests(): void {
  probed = undefined;
  limits.maxContexts = 6;
  limits.maxDpr = 2;
  limits.memoryBudget = 96 * 1024 * 1024;
  limits.maxTextureSize = 4096;
  limits.simulate = { unsupported: false, shaderFailure: false, textureFailure: false };
}
