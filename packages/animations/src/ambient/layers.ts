/**
 * CSS-layer ambient effects (catalogue §13; contracts/ambient-api.md §3, research R10, R13): B01 gradient shift,
 * B02 aurora blobs, B03 grain, B06 animated grid/dots, B07 mesh gradient, B10 waves. Each appends ONE package
 * layer (`aria-hidden`, `pointer-events: none`, `z-index: -1` inside the container's stacking context) whose
 * children animate `transform` with keyframes in `ambient.css` — paused by default; the ambient lifecycle flips
 * `data-neshel-ambient` to `running` only while the decoration may move. Soft radial gradients, never
 * `filter: blur` (measured cost, R10). Values reach CSS as custom properties on the package layer.
 */
import type { Validator } from "../core/validate.js";
import {
  type AmbientControl,
  type AmbientOptions,
  createAmbient,
  resolveAmbient,
} from "./engine/ambient.js";

const INLINE = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:-1";

function colorsOf(
  v: Validator,
  value: readonly string[] | undefined,
  fallback: readonly string[],
  min: number,
  max: number,
): string[] {
  if (value === undefined) return [...fallback];
  if (!Array.isArray(value) || value.length < min || value.length > max)
    v.fail(`"colors" must be ${min}–${max} CSS colours.`);
  return value.map((c, i) => v.css(`colors[${i}]`, c, ""));
}

function layerIn(container: HTMLElement, v: Validator, kind: string): HTMLDivElement {
  if (!container || container.nodeType !== 1) v.fail('"container" must be an element.');
  const layer = container.ownerDocument.createElement("div");
  layer.className = `neshel-ambient-layer neshel-${kind}`;
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("style", INLINE);
  container.prepend(layer);
  return layer;
}

function child(
  layer: HTMLElement,
  className: string,
  vars: Record<string, string> = {},
): HTMLDivElement {
  const node = layer.ownerDocument.createElement("div");
  node.className = `${className} neshel-ambient-part`;
  for (const [name, value] of Object.entries(vars)) node.style.setProperty(name, value);
  layer.appendChild(node);
  return node;
}

function cssEffect(
  name: string,
  container: HTMLElement,
  options: AmbientOptions | undefined,
  kind: string,
  build: (layer: HTMLDivElement, v: Validator) => void,
): AmbientControl {
  const resolved = resolveAmbient(name, options);
  const layer = layerIn(container, resolved.v, kind);
  try {
    build(layer, resolved.v);
  } catch (error) {
    layer.remove();
    throw error;
  }
  return createAmbient(name, resolved, { gate: container, layer, destroy: () => layer.remove() });
}

const DEFAULT_COLORS = ["#6d5dfc", "#22d3ee", "#f472b6", "#fbbf24"];

export interface GradientShiftOptions extends AmbientOptions {
  colors?: readonly string[];
  /** Degrees (default 120). */
  angle?: number;
  /** One cycle in ms (4000–60000, default 14000). */
  speed?: number;
}

/** B01 — a slowly shifting multi-stop gradient (oversized plane, compositor `transform` keyframes). */
export function createGradientShift(
  container: HTMLElement,
  options: GradientShiftOptions = {},
): AmbientControl {
  return cssEffect("createGradientShift", container, options, "gradient-shift", (layer, v) => {
    const colors = colorsOf(v, options.colors, DEFAULT_COLORS.slice(0, 3), 2, 6);
    const angle = v.number("angle", options.angle, 120, 0, 360);
    const speed = v.number("speed", options.speed, 14000, 4000, 60000);
    child(layer, "neshel-gradient-shift-plane", {
      "--neshel-ambient-gradient": `linear-gradient(${angle}deg, ${[...colors, colors[0]].join(", ")})`,
      "--neshel-ambient-period": `${speed}ms`,
    });
  });
}

export interface AuroraOptions extends AmbientOptions {
  colors?: readonly string[];
  /** 2–5 (default 3). */
  blobs?: number;
  /** Layer opacity 0–1 (default 0.6). */
  intensity?: number;
  /** One cycle in ms (8000–60000, default 18000). */
  speed?: number;
}

/** B02 — soft radial blobs drifting (no blur filter). */
export function createAurora(container: HTMLElement, options: AuroraOptions = {}): AmbientControl {
  return cssEffect("createAurora", container, options, "aurora", (layer, v) => {
    const colors = colorsOf(v, options.colors, DEFAULT_COLORS, 1, 5);
    const blobs = Math.round(v.number("blobs", options.blobs, 3, 2, 5));
    const intensity = v.number("intensity", options.intensity, 0.6, 0, 1);
    const speed = v.number("speed", options.speed, 18000, 8000, 60000);
    layer.style.setProperty("--neshel-ambient-intensity", String(intensity));
    for (let i = 0; i < blobs; i++) {
      child(layer, "neshel-aurora-blob", {
        "--neshel-ambient-color": colors[i % colors.length] as string,
        "--neshel-ambient-period": `${Math.round(speed * (1 + i * 0.23))}ms`,
        "--neshel-ambient-delay": `${-Math.round(speed * 0.37 * i)}ms`,
        "--neshel-ambient-x": `${10 + ((i * 37) % 70)}%`,
        "--neshel-ambient-y": `${5 + ((i * 53) % 55)}%`,
      });
    }
  });
}

export interface GrainOptions extends AmbientOptions {
  /** 0–0.3 (default 0.08). */
  opacity?: number;
  /** Texture scale 0.5–4 (default 1). */
  scale?: number;
  /** Stepped texture shift at ≤ 8 Hz (default false: static grain). */
  jitter?: boolean;
  /** `mix-blend-mode` (default `overlay`). */
  blend?: "normal" | "overlay" | "soft-light" | "multiply" | "screen";
}

/** B03 — film grain from one shared static texture (no noise generated per frame). */
export function createGrain(container: HTMLElement, options: GrainOptions = {}): AmbientControl {
  return cssEffect("createGrain", container, options, "grain", (layer, v) => {
    const opacity = v.number("opacity", options.opacity, 0.08, 0, 0.3);
    const scale = v.number("scale", options.scale, 1, 0.5, 4);
    const jitter = v.flag("jitter", options.jitter, false);
    const blend = v.oneOf(
      "blend",
      options.blend,
      ["normal", "overlay", "soft-light", "multiply", "screen"],
      "overlay",
    );
    layer.style.setProperty("--neshel-grain-opacity", String(opacity));
    layer.style.setProperty("--neshel-grain-size", `${Math.round(180 * scale)}px`);
    layer.style.setProperty("--neshel-grain-blend", blend);
    child(layer, jitter ? "neshel-grain-plane neshel-grain-jitter" : "neshel-grain-plane");
  });
}

export interface GridPatternOptions extends AmbientOptions {
  pattern?: "grid" | "dots";
  /** Cell in px (8–160, default 32). */
  cell?: number;
  /** Line width / dot radius in px (0.5–4, default 1). */
  lineWidth?: number;
  color?: string;
  direction?: "diagonal" | "up" | "down" | "left" | "right";
  /** Cells per second (0–2, default 0.15). */
  speed?: number;
  /** Radial fade toward the edges (default true). */
  fade?: boolean;
}

/** B06 — a grid or dot pattern drifting one cell per loop (seamless `transform`). */
export function createGridPattern(
  container: HTMLElement,
  options: GridPatternOptions = {},
): AmbientControl {
  return cssEffect("createGridPattern", container, options, "grid-pattern", (layer, v) => {
    const pattern = v.oneOf("pattern", options.pattern, ["grid", "dots"], "grid");
    const cell = v.number("cell", options.cell, 32, 8, 160);
    const width = v.number("lineWidth", options.lineWidth, 1, 0.5, 4);
    const color = v.css(
      "color",
      options.color,
      "color-mix(in srgb, currentColor 18%, transparent)",
    );
    const direction = v.oneOf(
      "direction",
      options.direction,
      ["diagonal", "up", "down", "left", "right"],
      "diagonal",
    );
    const speed = v.number("speed", options.speed, 0.15, 0, 2);
    const fade = v.flag("fade", options.fade, true);
    const dx = { diagonal: -1, up: 0, down: 0, left: -1, right: 1 }[direction];
    const dy = { diagonal: -1, up: -1, down: 1, left: 0, right: 0 }[direction];
    const image =
      pattern === "grid"
        ? `linear-gradient(to right, ${color} ${width}px, transparent ${width}px), linear-gradient(to bottom, ${color} ${width}px, transparent ${width}px)`
        : `radial-gradient(circle at center, ${color} ${width}px, transparent ${width + 0.5}px)`;
    if (fade) layer.setAttribute("data-fade", "");
    child(layer, "neshel-grid-pattern-plane", {
      "--neshel-pattern-image": image,
      "--neshel-pattern-cell": `${cell}px`,
      "--neshel-pattern-x": `${dx * cell}px`,
      "--neshel-pattern-y": `${dy * cell}px`,
      "--neshel-ambient-period": speed > 0 ? `${Math.round(1000 / speed)}ms` : "0ms",
    });
  });
}

export interface MeshGradientOptions extends AmbientOptions {
  /** Base colour then 2–5 point colours (default a 4-point palette). */
  colors?: readonly string[];
  /** One cycle in ms (10000–90000, default 24000). */
  speed?: number;
  /** Point travel as a fraction of the box (0–0.3, default 0.12). */
  amplitude?: number;
}

/** B07 — mesh-like gradient: large radial colour points over a base, drifting slowly (CSS, no GPU). */
export function createMeshGradient(
  container: HTMLElement,
  options: MeshGradientOptions = {},
): AmbientControl {
  return cssEffect("createMeshGradient", container, options, "mesh-gradient", (layer, v) => {
    const colors = colorsOf(v, options.colors, ["#0f172a", ...DEFAULT_COLORS], 3, 6);
    const speed = v.number("speed", options.speed, 24000, 10000, 90000);
    const amplitude = v.number("amplitude", options.amplitude, 0.12, 0, 0.3);
    layer.style.setProperty("--neshel-mesh-base", colors[0] as string);
    const anchors = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
      [50, 50],
    ];
    colors.slice(1).forEach((color, i) => {
      const [x, y] = anchors[i] as [number, number];
      child(layer, "neshel-mesh-point", {
        "--neshel-ambient-color": color,
        "--neshel-ambient-x": `${x}%`,
        "--neshel-ambient-y": `${y}%`,
        "--neshel-mesh-travel": `${Math.round(amplitude * 100)}%`,
        "--neshel-ambient-period": `${Math.round(speed * (1 + i * 0.17))}ms`,
        "--neshel-ambient-delay": `${-Math.round(speed * 0.29 * i)}ms`,
      });
    });
  });
}

export interface WavesOptions extends AmbientOptions {
  /** 1–4 (default 3). */
  layers?: number;
  /** px (4–80, default 18). */
  amplitude?: number;
  /** px (80–1600, default 600). */
  wavelength?: number;
  /** One wavelength travel in ms (4000–60000, default 12000). */
  speed?: number;
  colors?: readonly string[];
  position?: "bottom" | "top";
}

/** One wavelength of a sine wave as a filled SVG tile (cubic approximation, 4 segments). */
export function waveTile(
  wavelength: number,
  amplitude: number,
  height: number,
  color: string,
): string {
  // Quarter-sine cubics: control offset k = 0.3642·q along x; the slope at the zero crossings gives
  // s = A·π/2·0.3642 ≈ 0.572·A along y; tangents are horizontal at the crests.
  const q = wavelength / 4;
  const k = 0.3642 * q;
  const A = amplitude;
  const s = 0.572 * A;
  const mid = A;
  const r = (n: number) => Math.round(n * 100) / 100;
  const c = (...n: number[]) => `C${n.map(r).join(" ")}`;
  const d =
    `M0 ${r(mid)}` +
    c(k, mid - s, q - k, mid - A, q, mid - A) +
    c(q + k, mid - A, 2 * q - k, mid - s, 2 * q, mid) +
    c(2 * q + k, mid + s, 3 * q - k, mid + A, 3 * q, mid + A) +
    c(3 * q + k, mid + A, 4 * q - k, mid + s, 4 * q, mid) +
    `V${r(height)}H0Z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(wavelength)} ${r(height)}" preserveAspectRatio="none"><path d="${d}" fill="${color}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** B10 — layered SVG waves travelling one wavelength per loop (tiles generated once). */
export function createWaves(container: HTMLElement, options: WavesOptions = {}): AmbientControl {
  return cssEffect("createWaves", container, options, "waves", (layer, v) => {
    const count = Math.round(v.number("layers", options.layers, 3, 1, 4));
    const amplitude = v.number("amplitude", options.amplitude, 18, 4, 80);
    const wavelength = v.number("wavelength", options.wavelength, 600, 80, 1600);
    const speed = v.number("speed", options.speed, 12000, 4000, 60000);
    const position = v.oneOf("position", options.position, ["bottom", "top"], "bottom");
    const colors = colorsOf(
      v,
      options.colors,
      [
        "color-mix(in srgb, currentColor 10%, transparent)",
        "color-mix(in srgb, currentColor 16%, transparent)",
        "color-mix(in srgb, currentColor 24%, transparent)",
      ],
      1,
      4,
    );
    layer.setAttribute("data-position", position);
    const height = amplitude * 2 + 40;
    for (let i = 0; i < count; i++) {
      const a = amplitude * (1 - i * 0.18);
      const w = wavelength * (1 + i * 0.35);
      child(layer, "neshel-wave", {
        "--neshel-wave-image": waveTile(w, a, height, colors[i % colors.length] as string),
        "--neshel-wave-length": `${Math.round(w)}px`,
        "--neshel-wave-height": `${Math.round(height)}px`,
        "--neshel-wave-offset": `${i * Math.round(amplitude * 0.6)}px`,
        "--neshel-ambient-period": `${Math.round(speed * (1 + i * 0.4))}ms`,
        "--neshel-ambient-delay": `${-Math.round(speed * 0.31 * i)}ms`,
      });
    }
  });
}
