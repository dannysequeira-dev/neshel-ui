/** Quad and subdivided-grid geometry for the GPU entries (Phase 016). `aP` ∈ [0, 1]², (0, 0) top-left. */
import type { GpuResources } from "./surface.js";

export interface Mesh {
  vao: WebGLVertexArrayObject;
  count: number;
  /** `true`: indexed triangles (Uint16); `false`: a 4-vertex triangle strip. */
  indexed: boolean;
}

function attribute(gl: WebGL2RenderingContext, program: WebGLProgram): void {
  const location = gl.getAttribLocation(program, "aP");
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
}

export function quadMesh(
  gl: WebGL2RenderingContext,
  resources: GpuResources,
  program: WebGLProgram,
): Mesh {
  const vao = resources.vertexArray();
  resources.buffer(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]));
  attribute(gl, program);
  gl.bindVertexArray(null);
  return { vao, count: 4, indexed: false };
}

/** Maximum grid: 128 × 96 cells (12 513 vertices; Uint16 indices). */
export const MAX_COLUMNS = 128;
export const MAX_ROWS = 96;

export function gridMesh(
  gl: WebGL2RenderingContext,
  resources: GpuResources,
  program: WebGLProgram,
  columns: number,
  rows: number,
): Mesh {
  const cols = Math.min(MAX_COLUMNS, Math.max(1, Math.round(columns)));
  const rws = Math.min(MAX_ROWS, Math.max(1, Math.round(rows)));
  const vertices = new Float32Array((cols + 1) * (rws + 1) * 2);
  let k = 0;
  for (let y = 0; y <= rws; y++) {
    for (let x = 0; x <= cols; x++) {
      vertices[k++] = x / cols;
      vertices[k++] = y / rws;
    }
  }
  const indices = new Uint16Array(cols * rws * 6);
  k = 0;
  for (let y = 0; y < rws; y++) {
    for (let x = 0; x < cols; x++) {
      const a = y * (cols + 1) + x;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = b;
      indices[k++] = c;
      indices[k++] = d;
    }
  }
  const vao = resources.vertexArray();
  resources.buffer(vertices);
  attribute(gl, program);
  resources.buffer(indices, gl.ELEMENT_ARRAY_BUFFER);
  gl.bindVertexArray(null);
  return { vao, count: indices.length, indexed: true };
}

export function drawMesh(gl: WebGL2RenderingContext, mesh: Mesh): void {
  gl.bindVertexArray(mesh.vao);
  if (mesh.indexed) gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  else gl.drawArrays(gl.TRIANGLE_STRIP, 0, mesh.count);
  gl.bindVertexArray(null);
}

/** Uniform locations of a program, looked up once. */
export function uniforms<K extends string>(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  names: readonly K[],
): Record<K, WebGLUniformLocation | null> {
  const out = {} as Record<K, WebGLUniformLocation | null>;
  for (const name of names) out[name] = gl.getUniformLocation(program, name);
  return out;
}

export function bindTexture(gl: WebGL2RenderingContext, unit: number, texture: WebGLTexture): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
}

/** Make `program` current (a plain helper: `gl.useProgram` is not a React hook). */
export function activate(gl: WebGL2RenderingContext, program: WebGLProgram): void {
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram is not a React hook.
  gl.useProgram(program);
}
