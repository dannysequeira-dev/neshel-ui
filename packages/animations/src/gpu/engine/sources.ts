/**
 * Texture sources of the GPU entries (Phase 016; research R12, R14; contracts/gpu-api.md). URL maps load through a
 * detached `Image` with `crossOrigin` (default `anonymous`), so a server without CORS headers yields a tainted image
 * that fails the upload with reason `cors` — never a silently broken effect. The built-in displacement map is
 * generated on a small Canvas 2D from seeded value noise (no external asset or dependency). `fitFor` reproduces CSS
 * `object-fit` in UV space.
 */
import { GpuFailure } from "./surface.js";

export type MapSource = string | HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/** Resolve a map option into a decoded source (rejects with `GpuFailure` `texture`). */
export function loadSource(
  source: MapSource,
  crossOrigin: "anonymous" | "use-credentials",
  doc: Document,
): Promise<TexImageSource> {
  if (typeof source !== "string") {
    const img = source as HTMLImageElement;
    if (img.tagName === "IMG" && !(img.complete && img.naturalWidth > 0)) {
      return new Promise((resolve, reject) => {
        const done = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", failed);
          resolve(img);
        };
        const failed = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", failed);
          reject(new GpuFailure("texture", "the map image failed to load"));
        };
        img.addEventListener("load", done);
        img.addEventListener("error", failed);
      });
    }
    return Promise.resolve(source as TexImageSource);
  }
  return new Promise((resolve, reject) => {
    const img = doc.createElement("img");
    img.crossOrigin = crossOrigin;
    img.decoding = "async";
    img.onload = () => {
      img.onload = img.onerror = null;
      const decoded =
        typeof img.decode === "function" ? img.decode().catch(() => {}) : Promise.resolve();
      decoded.then(() => resolve(img));
    };
    img.onerror = () => {
      img.onload = img.onerror = null;
      reject(
        new GpuFailure(
          "texture",
          `the map "${source.slice(0, 80)}" failed to load (or CORS refused it)`,
        ),
      );
    };
    img.src = source;
  });
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded, tileable value-noise RG map (R = x offset, G = y offset, 0.5 neutral). */
export function noiseMap(doc: Document, seed: number, size = 128): HTMLCanvasElement {
  const canvas = doc.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const grid = 8;
  const random = mulberry32(seed);
  const lattice = (channels: number) =>
    Array.from({ length: grid * grid }, () => Array.from({ length: channels }, () => random()));
  const values = lattice(2);
  const at = (x: number, y: number) =>
    values[((y + grid) % grid) * grid + ((x + grid) % grid)] as number[];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * grid;
      const gy = (y / size) * grid;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = smooth(gx - x0);
      const fy = smooth(gy - y0);
      const i = (y * size + x) * 4;
      for (let c = 0; c < 2; c++) {
        const a = (at(x0, y0)[c] as number) * (1 - fx) + (at(x0 + 1, y0)[c] as number) * fx;
        const b = (at(x0, y0 + 1)[c] as number) * (1 - fx) + (at(x0 + 1, y0 + 1)[c] as number) * fx;
        image.data[i + c] = Math.round((a * (1 - fy) + b * fy) * 255);
      }
      image.data[i + 2] = 128;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** CSS `object-fit` of a frame of `cw`×`ch` showing a texture of `tw`×`th`, as UV scale.xy + offset.zw. */
export function fitFor(
  fit: string,
  cw: number,
  ch: number,
  tw: number,
  th: number,
): [number, number, number, number] {
  if (!cw || !ch || !tw || !th || (fit !== "cover" && fit !== "contain")) return [1, 1, 0, 0];
  const s = fit === "cover" ? Math.max(cw / tw, ch / th) : Math.min(cw / tw, ch / th);
  const sx = cw / (tw * s);
  const sy = ch / (th * s);
  return [sx, sy, (1 - sx) / 2, (1 - sy) / 2];
}

/** Parse a CSS colour to linear-ish 0–1 RGB through a 2D context (falls back to `fallback`). */
export function cssColor(
  doc: Document,
  color: string,
  fallback: [number, number, number],
): [number, number, number] {
  try {
    const ctx = doc.createElement("canvas").getContext("2d");
    if (!ctx) return fallback;
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    const value = String(ctx.fillStyle);
    const hex = /^#([0-9a-f]{6})$/i.exec(value);
    if (hex?.[1]) {
      const n = Number.parseInt(hex[1], 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    const rgb = /rgba?\(([^)]+)\)/.exec(value);
    if (rgb?.[1]) {
      const [r, g, b] = rgb[1].split(",").map((p) => Number.parseFloat(p));
      if ([r, g, b].every((n) => Number.isFinite(n)))
        return [(r as number) / 255, (g as number) / 255, (b as number) / 255];
    }
  } catch {}
  return fallback;
}

/** Sample the luminance range of a depth map on a small 2D copy (null when the canvas is tainted or absent). */
export function depthRange(
  doc: Document,
  source: TexImageSource,
): { min: number; max: number } | null {
  try {
    const canvas = doc.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source as CanvasImageSource, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    let min = 255;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const v = data[i] as number;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return { min: min / 255, max: max / 255 };
  } catch {
    return null;
  }
}
