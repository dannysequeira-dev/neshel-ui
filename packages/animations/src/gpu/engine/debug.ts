/** Live GPU resource counters (Phase 016; `getGpuDebugInfo`, tests, lab, benchmarks). */
export const gpuCounters = {
  /** Surfaces created and not released. */
  surfaces: 0,
  /** WebGL2 contexts currently held. */
  contexts: 0,
  /** Surfaces waiting for a context (budget reached, nothing evictable). */
  waiting: 0,
  programs: 0,
  shaders: 0,
  buffers: 0,
  textures: 0,
  vertexArrays: 0,
  /** Estimated texture bytes (w × h × 4). */
  textureBytes: 0,
  /** Estimated drawing-buffer bytes (w × h × 4 × (depth ? 2 : 1)). */
  drawingBufferBytes: 0,
  /** Frames in which the shared draw task ran. */
  frames: 0,
  /** Surface draws. */
  draws: 0,
  compileErrors: 0,
  losses: 0,
  /** Surfaces whose context is currently lost (waiting for a restore or a recreation). */
  lost: 0,
  restores: 0,
  evictions: 0,
  fallbacks: 0,
  /** Live GPU effects. */
  effects: 0,
};

export type GpuDebugInfo = typeof gpuCounters;

export function getGpuDebugInfo(): GpuDebugInfo {
  return { ...gpuCounters };
}
