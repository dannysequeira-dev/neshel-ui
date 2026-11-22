/**
 * Canvas 2D ambient effects (catalogue §13; contracts/ambient-api.md §2–§4, ADR 0030 §2, research R11): B04
 * particles and B05 starfield. One decorative canvas surface per effect (lazy, DPR-capped, resized in the write
 * phase, context loss handled, released on destroy), drawn by ONE scheduler task only while the ambient lifecycle
 * says it may move, throttled to `fps`. Seeded PRNG → deterministic fields. Hard density caps (400 particles, 800
 * stars) keep the measured 2D cost bounded; `lowPower` (auto: ≤ 4 logical cores or `prefers-reduced-data`)
 * halves density and caps 30 fps. Reduced motion draws one still frame.
 */
import { createCanvasSurface } from "../core/surface.js";
import type { Validator } from "../core/validate.js";
import {
  type AmbientControl,
  type AmbientOptions,
  createAmbient,
  resolveAmbient,
} from "./engine/ambient.js";

export interface CanvasAmbientOptions extends AmbientOptions {
  /** CSS colour (default: the container's text colour). */
  color?: string;
  /** PRNG seed (default 7). */
  seed?: number;
  /** Frame-rate cap 15–60 (default 60; 30 in low-power mode). */
  fps?: number;
  /** DPR cap 1–3 (default 2). */
  maxDpr?: number;
  /** `auto` (default) detects limited devices; `true`/`false` force it. */
  lowPower?: "auto" | boolean;
}

function mulberry(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function detectLowPower(): boolean {
  const nav = (globalThis as { navigator?: { hardwareConcurrency?: number } }).navigator;
  const media = (globalThis as { matchMedia?: (q: string) => MediaQueryList }).matchMedia;
  const cores = nav?.hardwareConcurrency;
  return (
    (typeof cores === "number" && cores > 0 && cores <= 4) ||
    (typeof media === "function" && media("(prefers-reduced-data: reduce)").matches)
  );
}

interface CanvasCommon {
  v: Validator;
  color: string;
  seed: number;
  fps: number;
  maxDpr: number;
  low: boolean;
}

function common(v: Validator, container: HTMLElement, o: CanvasAmbientOptions): CanvasCommon {
  if (!container || container.nodeType !== 1) v.fail('"container" must be an element.');
  const lowOption = o.lowPower ?? "auto";
  if (lowOption !== "auto" && typeof lowOption !== "boolean")
    v.fail('"lowPower" must be "auto", true or false.');
  const low = lowOption === "auto" ? detectLowPower() : lowOption;
  let color = v.css("color", o.color, "currentColor");
  if (color === "currentColor") {
    // One style read at creation: canvas cannot resolve `currentColor`.
    const view = container.ownerDocument.defaultView;
    color = (view?.getComputedStyle?.(container).color || "#ffffff").trim() || "#ffffff";
  }
  return {
    v,
    color,
    seed: v.number("seed", o.seed, 7, -2147483648, 2147483647),
    fps: Math.min(v.number("fps", o.fps, 60, 15, 60), low ? 30 : 60),
    maxDpr: v.number("maxDpr", o.maxDpr, 2, 1, 3),
    low,
  };
}

export interface ParticlesOptions extends CanvasAmbientOptions {
  /** Particles per 100 000 px² (0–40, default 8). */
  density?: number;
  /** Upper bound (1–400, default 120). */
  max?: number;
  /** Radius in px (0.5–6, default 1.6). */
  size?: number;
  /** px per second (0–120, default 18). */
  speed?: number;
  /** Lines between near particles (only with ≤ 150 particles; default false). */
  links?: boolean;
  /** Link distance in px (20–200, default 110). */
  linkDistance?: number;
}

/** B04 — a seeded particle field drifting and wrapping, optionally linked. */
export function createParticles(
  container: HTMLElement,
  options: ParticlesOptions = {},
): AmbientControl {
  const resolved = resolveAmbient("createParticles", options);
  const c = common(resolved.v, container, options);
  const { v } = c;
  const density = v.number("density", options.density, 8, 0, 40) * (c.low ? 0.5 : 1);
  const max = Math.round(v.number("max", options.max, 120, 1, 400));
  const size = v.number("size", options.size, 1.6, 0.5, 6);
  const speed = v.number("speed", options.speed, 18, 0, 120);
  const linkDistance = v.number("linkDistance", options.linkDistance, 110, 20, 200);
  let links = v.flag("links", options.links, false);
  let n = 0;
  let data = new Float32Array(0); // x, y, vx, vy per particle
  const surface = createCanvasSurface(container, {
    maxDpr: c.maxDpr,
    className: "neshel-ambient-canvas",
    onResize: (w, h) => {
      seed(w, h);
      draw();
    },
    onRestore: () => draw(),
  });
  function seed(w: number, h: number): void {
    n = Math.min(max, Math.round((density * w * h) / 100000));
    if (links && n > 150) links = false;
    const random = mulberry(c.seed);
    data = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const angle = random() * Math.PI * 2;
      const s = speed * (0.4 + random() * 0.6);
      data[i * 4] = random() * w;
      data[i * 4 + 1] = random() * h;
      data[i * 4 + 2] = Math.cos(angle) * s;
      data[i * 4 + 3] = Math.sin(angle) * s;
    }
  }
  function draw(): void {
    const ctx = surface.ensure();
    if (!ctx || surface.lost) return;
    const w = surface.width;
    const h = surface.height;
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = c.color;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = data[i * 4] as number;
      const y = data[i * 4 + 1] as number;
      ctx.moveTo(x + size, y);
      ctx.arc(x, y, size, 0, Math.PI * 2);
    }
    ctx.fill();
    if (!links) return;
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 0.6;
    const d2 = linkDistance * linkDistance;
    for (let i = 0; i < n; i++) {
      const xi = data[i * 4] as number;
      const yi = data[i * 4 + 1] as number;
      for (let j = i + 1; j < n; j++) {
        const dx = xi - (data[j * 4] as number);
        const dy = yi - (data[j * 4 + 1] as number);
        const dist = dx * dx + dy * dy;
        if (dist > d2) continue;
        ctx.globalAlpha = (1 - dist / d2) * 0.5;
        ctx.beginPath();
        ctx.moveTo(xi, yi);
        ctx.lineTo(data[j * 4] as number, data[j * 4 + 1] as number);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  let created = false;
  const ensure = () => {
    if (created) return;
    created = true;
    if (surface.ensure()) {
      if (surface.canvas) surface.canvas.style.zIndex = "-1";
      seed(surface.width, surface.height);
    }
  };
  return createAmbient("createParticles", resolved, {
    gate: container,
    fps: c.fps,
    frame(_time, delta) {
      ensure();
      const w = surface.width;
      const h = surface.height;
      const dt = Math.min(delta, 100) / 1000;
      for (let i = 0; i < n; i++) {
        let x = (data[i * 4] as number) + (data[i * 4 + 2] as number) * dt;
        let y = (data[i * 4 + 1] as number) + (data[i * 4 + 3] as number) * dt;
        if (x < 0) x += w;
        else if (x > w) x -= w;
        if (y < 0) y += h;
        else if (y > h) y -= h;
        data[i * 4] = x;
        data[i * 4 + 1] = y;
      }
      draw();
    },
    rest() {
      ensure();
      draw();
    },
    destroy: () => surface.release(),
  });
}

export interface StarfieldOptions extends CanvasAmbientOptions {
  /** Stars per 100 000 px² (0–80, default 20). */
  density?: number;
  /** Upper bound (1–800, default 360). */
  max?: number;
  /** `drift` (default, sideways parallax) or `warp` (stars fly outward; more vestibular). */
  mode?: "drift" | "warp";
  /** 0–1 (default 0.25). */
  speed?: number;
  /** Twinkle amplitude 0–1 (default 0.3; ≤ 1 Hz per star, no flashing). */
  twinkle?: number;
}

/** B05 — a seeded starfield with depth (drift parallax or warp), twinkling softly. */
export function createStarfield(
  container: HTMLElement,
  options: StarfieldOptions = {},
): AmbientControl {
  const resolved = resolveAmbient("createStarfield", options);
  const c = common(resolved.v, container, options);
  const { v } = c;
  const density = v.number("density", options.density, 20, 0, 80) * (c.low ? 0.5 : 1);
  const max = Math.round(v.number("max", options.max, 360, 1, 800));
  const mode = v.oneOf("mode", options.mode, ["drift", "warp"], "drift");
  const speed = v.number("speed", options.speed, 0.25, 0, 1);
  const twinkle = v.number("twinkle", options.twinkle, 0.3, 0, 1);
  let n = 0;
  let stars = new Float32Array(0); // x, y (normalised −1…1), z (0.05…1), phase
  const BUCKETS = 4;
  const surface = createCanvasSurface(container, {
    maxDpr: c.maxDpr,
    className: "neshel-ambient-canvas",
    onResize: (w, h) => {
      seed(w, h);
      draw(lastTime);
    },
    onRestore: () => draw(lastTime),
  });
  let random = mulberry(c.seed);
  function seed(w: number, h: number): void {
    n = Math.min(max, Math.round((density * w * h) / 100000));
    random = mulberry(c.seed);
    stars = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      stars[i * 4] = random() * 2 - 1;
      stars[i * 4 + 1] = random() * 2 - 1;
      stars[i * 4 + 2] = 0.05 + random() * 0.95;
      stars[i * 4 + 3] = random() * Math.PI * 2;
    }
  }
  let lastTime = 0;
  function draw(time: number): void {
    const ctx = surface.ensure();
    if (!ctx || surface.lost) return;
    const w = surface.width;
    const h = surface.height;
    const cxp = w / 2;
    const cyp = h / 2;
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = c.color;
    const t = time / 1000;
    for (let b = 0; b < BUCKETS; b++) {
      ctx.globalAlpha = 1 - (twinkle * b) / BUCKETS;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const phase = stars[i * 4 + 3] as number;
        // ≤ 1 Hz twinkle per star (frequency 0.3–0.8 Hz from the phase).
        const level = twinkle > 0 ? 0.5 + 0.5 * Math.sin(phase + t * (1.9 + (phase % 3))) : 1;
        if (Math.min(BUCKETS - 1, Math.floor((1 - level) * BUCKETS)) !== b) continue;
        const z = stars[i * 4 + 2] as number;
        let x: number;
        let y: number;
        let r: number;
        if (mode === "warp") {
          x = cxp + ((stars[i * 4] as number) / z) * cxp * 0.5;
          y = cyp + ((stars[i * 4 + 1] as number) / z) * cyp * 0.5;
          r = Math.max(0.4, (1 - z) * 2);
          if (x < -2 || x > w + 2 || y < -2 || y > h + 2) continue;
        } else {
          x = ((stars[i * 4] as number) + 1) * 0.5 * w;
          y = ((stars[i * 4 + 1] as number) + 1) * 0.5 * h;
          r = 0.4 + (1 - z) * 1.4;
        }
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  let created = false;
  const ensure = () => {
    if (created) return;
    created = true;
    if (surface.ensure()) {
      if (surface.canvas) surface.canvas.style.zIndex = "-1";
      seed(surface.width, surface.height);
    }
  };
  return createAmbient("createStarfield", resolved, {
    gate: container,
    fps: c.fps,
    frame(time, delta) {
      ensure();
      lastTime = time;
      const dt = Math.min(delta, 100) / 1000;
      for (let i = 0; i < n; i++) {
        if (mode === "warp") {
          let z = (stars[i * 4 + 2] as number) - dt * speed * 0.35;
          if (z <= 0.05) {
            z = 1;
            stars[i * 4] = random() * 2 - 1;
            stars[i * 4 + 1] = random() * 2 - 1;
          }
          stars[i * 4 + 2] = z;
        } else {
          // Nearer stars move faster (parallax); wraps around.
          let x =
            (stars[i * 4] as number) - dt * speed * 0.12 * (1.2 - (stars[i * 4 + 2] as number));
          if (x < -1) x += 2;
          stars[i * 4] = x;
        }
      }
      draw(time);
    },
    rest() {
      ensure();
      draw(lastTime);
    },
    destroy: () => surface.release(),
  });
}
