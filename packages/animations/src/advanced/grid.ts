/**
 * D09 perspective grid floor (catalogue §15; contracts/advanced-api.md, research R13). One package layer (`aria-hidden`,
 * `pointer-events: none`, clipped — nothing overflows the root; `z-index: -1` inside the root's stacking context,
 * the 015 ambient rule — `.neshel-grid-host` isolates it) holds a plane rotated about its top edge, which is the
 * horizon; `perspective-origin` is the vanishing point. Lines are two linear gradients (inline, so the floor renders
 * without the stylesheet); a mask fades it toward the horizon. Motion: the plane's child translates by exactly one cell
 * per loop (seamless) with keyframes in `advanced.css` on package elements, paused unless the engine marks the layer
 * running (visible through the shared visibility gate, page shown, not reduced, within the finite duration — 5 s by
 * default like ADR 0030 ambient effects; `Infinity` is explicit and needs a consumer pause control). The plane is
 * bounded to the visible floor (research R2: an oversized plane was expensive in Firefox/WebKit).
 */
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import { subscribeVisibility } from "../core/visibility-gate.js";
import { counters } from "./engine/debug.js";

export interface PerspectiveGridOptions {
  /** Horizon as a fraction of the height 0–0.9 (default 0.45). */
  horizon?: number;
  /** Horizontal vanishing point 0–1 (default 0.5). */
  vanishing?: number;
  /** Plane tilt, deg 45–85 (default 72). */
  angle?: number;
  /** Cell size px 8–256 (default 48). */
  cell?: number;
  /** Line width px 1–6 (default 2). */
  line?: number;
  /** Line colour (default `currentColor`). */
  color?: string;
  /** Opacity 0.05–1 (default 0.8). */
  opacity?: number;
  /** Fade toward the horizon (default true). */
  fade?: boolean;
  /** Cells per second toward the viewer 0–8 (default 1). */
  speed?: number;
  /** Lateral cells per second −4–4 (default 0). */
  drift?: number;
  /** Running time ms 0–600000 or `Infinity` (default 5000). */
  duration?: number;
  reducedMotion?: ReducedMotion;
}

export type GridState = "running" | "paused" | "completed" | "reduced" | "static";

export interface GridControl {
  readonly state: GridState;
  play(): void;
  pause(): void;
  destroy(): void;
}

const LAYER_STYLE =
  "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:-1;contain:strict";

export function createPerspectiveGrid(
  root: HTMLElement,
  options: PerspectiveGridOptions = {},
): GridControl {
  const v = validator("createPerspectiveGrid");
  if (!root || root.nodeType !== 1) v.fail('"root" must be an element.');
  const o = v.options(options);
  const horizon = v.number("horizon", o.horizon, 0.45, 0, 0.9);
  const vanishing = v.number("vanishing", o.vanishing, 0.5, 0, 1);
  const angle = v.number("angle", o.angle, 72, 45, 85);
  const cell = v.number("cell", o.cell, 48, 8, 256);
  const line = v.number("line", o.line, 2, 1, 6);
  const color = v.css("color", o.color, "currentColor");
  const opacity = v.number("opacity", o.opacity, 0.8, 0.05, 1);
  const fade = v.flag("fade", o.fade, true);
  const speed = v.number("speed", o.speed, 1, 0, 8);
  const drift = v.number("drift", o.drift, 0, -4, 4);
  const duration =
    o.duration === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : v.number("duration", o.duration, 5000, 0, 600000);
  const policy = v.reducedMotion(o.reducedMotion);

  const doc = root.ownerDocument;
  const layer = doc.createElement("div");
  layer.className = "neshel-grid-floor";
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("style", LAYER_STYLE);
  const pct = (n: number) => `${Math.round(n * 10000) / 100}%`;
  layer.style.setProperty("perspective", `${Math.round(320 + (85 - angle) * 12)}px`);
  layer.style.setProperty("perspective-origin", `${pct(vanishing)} ${pct(horizon)}`);
  layer.style.setProperty("opacity", String(opacity));
  if (fade) {
    const mask = `linear-gradient(to bottom, transparent ${pct(horizon)}, #000 ${pct(Math.min(1, horizon + 0.25))})`;
    layer.style.setProperty("mask-image", mask);
    layer.style.setProperty("-webkit-mask-image", mask);
  }
  const plane = doc.createElement("div");
  plane.className = "neshel-grid-plane";
  // Bounded plane: twice the floor's height (enough to reach the horizon at the steepest angle), 3× wide.
  plane.setAttribute(
    "style",
    `position:absolute;left:-100%;right:-100%;top:${pct(horizon)};height:${pct(Math.max(0.1, (1 - horizon) * 2))};transform-origin:50% 0;transform:rotateX(${angle}deg)`,
  );
  const lines = doc.createElement("div");
  lines.className = "neshel-grid-lines";
  const gradient = `linear-gradient(${color} ${line}px, transparent ${line}px), linear-gradient(90deg, ${color} ${line}px, transparent ${line}px)`;
  lines.setAttribute(
    "style",
    `position:absolute;left:-${cell}px;right:0;top:-${cell}px;bottom:0;background-image:${gradient};background-size:${cell}px ${cell}px`,
  );
  const moving = speed > 0 || drift !== 0;
  if (moving) {
    const loopSeconds = 1 / Math.max(Math.abs(speed), Math.abs(drift));
    lines.style.setProperty("--neshel-grid-cell", `${speed > 0 ? cell : 0}px`);
    lines.style.setProperty("--neshel-grid-dx", `${drift === 0 ? 0 : Math.sign(drift) * cell}px`);
    lines.style.setProperty("--neshel-grid-duration", `${Math.round(loopSeconds * 1000)}ms`);
  }
  plane.appendChild(lines);
  layer.appendChild(plane);
  root.prepend(layer);
  counters.layers++;
  counters.effects++;

  let systemReduced = prefersReducedMotion();
  const reduced = () => shouldReduceMotion(policy, systemReduced);
  let visible = true;
  let wanted = true;
  let used = 0;
  let startedAt: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let state: GridState = "paused";
  let destroyed = false;
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  function setRunning(on: boolean): void {
    if (on) layer.setAttribute("data-neshel-grid", "running");
    else layer.removeAttribute("data-neshel-grid");
  }
  function halt(): void {
    if (startedAt !== undefined) used += now() - startedAt;
    startedAt = undefined;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    setRunning(false);
  }
  function sync(): void {
    if (destroyed) return;
    if (!moving) {
      state = "static";
      return;
    }
    if (reduced()) {
      halt();
      state = "reduced";
      return;
    }
    if (used >= duration) {
      halt();
      state = "completed";
      return;
    }
    if (!wanted || !visible) {
      halt();
      state = "paused";
      return;
    }
    if (startedAt !== undefined) return;
    startedAt = now();
    setRunning(true);
    state = "running";
    if (Number.isFinite(duration)) {
      timer = setTimeout(
        () => {
          timer = undefined;
          halt();
          used = duration;
          sync();
        },
        Math.max(0, duration - used),
      );
    }
  }

  const unsubscribeGate = subscribeVisibility(root, (next) => {
    visible = next;
    sync();
  });
  const unsubscribeReduced = subscribeReducedMotion((value) => {
    systemReduced = value;
    sync();
  });
  sync();

  return {
    get state() {
      return state;
    },
    play() {
      if (destroyed) return;
      if (state === "completed") used = 0;
      wanted = true;
      sync();
    },
    pause() {
      if (destroyed) return;
      wanted = false;
      sync();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      halt();
      unsubscribeGate();
      unsubscribeReduced();
      layer.remove();
      counters.layers--;
      counters.effects--;
    },
  };
}
