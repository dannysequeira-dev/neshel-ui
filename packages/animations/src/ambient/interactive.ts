/**
 * B08 floating shapes and B09 pointer-reactive glow (catalogue §13; contracts/ambient-api.md §3). B08 moves the
 * container's element children (consumer elements) through their Motion Hosts — one transform layer each,
 * written by ONE scheduler task of the ambient lifecycle (rule R-1: no CSS animation on consumer elements). B09
 * follows the pointer with the Phase 010 box-based tracker (box measured once per hover, no layout read per
 * move) and writes one custom-property pair per frame on its package layer, smoothed, only while the ambient
 * lifecycle allows motion.
 */
import { getMotionHost } from "../core/host.js";
import { trackPointer } from "../core/pointer.js";
import { getFrameScheduler } from "../core/scheduler.js";
import {
  type AmbientControl,
  type AmbientOptions,
  createAmbient,
  resolveAmbient,
} from "./engine/ambient.js";

export interface FloatingShapesOptions extends AmbientOptions {
  /** px (0–40, default 12). */
  amplitude?: number;
  /** Degrees (0–30, default 6). */
  rotate?: number;
  /** One float cycle in ms (2000–30000, default 7000). */
  period?: number;
  /** Children moved at most (1–24, default 24). */
  max?: number;
}

/** B08 — the container's children bob and sway gently out of phase. */
export function createFloatingShapes(
  container: HTMLElement,
  options: FloatingShapesOptions = {},
): AmbientControl {
  const resolved = resolveAmbient("createFloatingShapes", options);
  const { v } = resolved;
  if (!container || container.nodeType !== 1) v.fail('"container" must be an element.');
  const amplitude = v.number("amplitude", options.amplitude, 12, 0, 40);
  const rotate = v.number("rotate", options.rotate, 6, 0, 30);
  const period = v.number("period", options.period, 7000, 2000, 30000);
  const max = Math.round(v.number("max", options.max, 24, 1, 24));
  const shapes = [...container.children]
    .filter(
      (el): el is HTMLElement =>
        el.nodeType === 1 && !el.classList.contains("neshel-ambient-layer"),
    )
    .slice(0, max)
    .map((element, i) => ({
      host: getMotionHost(element),
      key: Symbol("ambient/floating"),
      phase: (i * 2.399963) % (Math.PI * 2), // golden angle
      rate: 1 + ((i * 0.37) % 0.6),
    }));
  const clear = () => {
    for (const s of shapes) s.host.setLayer(s.key, undefined);
  };
  return createAmbient("createFloatingShapes", resolved, {
    gate: container,
    frame(time) {
      const t = (time / period) * Math.PI * 2;
      for (const s of shapes) {
        const a = t * s.rate + s.phase;
        s.host.setLayer(s.key, {
          translateX: Math.round(Math.cos(a * 0.7) * amplitude * 0.45 * 100) / 100,
          translateY: Math.round(Math.sin(a) * amplitude * 100) / 100,
          rotateZ: Math.round(Math.sin(a * 0.8 + 1) * rotate * 100) / 100,
        });
      }
    },
    rest: clear,
    destroy: clear,
  });
}

export interface PointerGlowOptions extends Omit<AmbientOptions, "duration"> {
  /** Glow diameter in px (80–1200, default 360). */
  size?: number;
  color?: string;
  /** 0–1 (default 0.35). */
  intensity?: number;
  /** 0 (snappy) – 0.95 (floaty), default 0.2. */
  smoothing?: number;
  pointerTypes?: readonly ("mouse" | "pen" | "touch")[];
}

/** B09 — a soft glow under the pointer inside the container (hidden at rest and under reduced motion). */
export function createPointerGlow(
  container: HTMLElement,
  options: PointerGlowOptions = {},
): AmbientControl {
  // Pointer-driven, not autoplaying: no time limit (WCAG 2.2.2 concerns automatic motion).
  const resolved = resolveAmbient("createPointerGlow", options);
  const { v } = resolved;
  if (!container || container.nodeType !== 1) v.fail('"container" must be an element.');
  const size = v.number("size", options.size, 360, 80, 1200);
  const color = v.css("color", options.color, "color-mix(in srgb, currentColor 40%, transparent)");
  const intensity = v.number("intensity", options.intensity, 0.35, 0, 1);
  const smoothing = v.number("smoothing", options.smoothing, 0.2, 0, 0.95);
  const types = new Set<string>(options.pointerTypes ?? ["mouse", "pen"]);
  const layer = container.ownerDocument.createElement("div");
  layer.className = "neshel-ambient-layer neshel-pointer-glow";
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute(
    "style",
    "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:-1",
  );
  layer.style.setProperty("--neshel-glow-size", `${size}px`);
  layer.style.setProperty("--neshel-glow-color", color);
  layer.style.setProperty("--neshel-glow-intensity", String(intensity));
  container.prepend(layer);
  const scheduler = getFrameScheduler();
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let cancel: (() => void) | undefined;
  let fresh = true;
  const write = () => {
    layer.style.setProperty("--neshel-glow-x", `${Math.round(current.x)}px`);
    layer.style.setProperty("--neshel-glow-y", `${Math.round(current.y)}px`);
  };
  const step = () => {
    const k = 1 - smoothing;
    current.x += (target.x - current.x) * k;
    current.y += (target.y - current.y) * k;
    write();
    if (Math.abs(target.x - current.x) < 0.5 && Math.abs(target.y - current.y) < 0.5) {
      current.x = target.x;
      current.y = target.y;
      write();
      cancel = undefined;
      return false;
    }
    return true;
  };
  let control: AmbientControl | undefined;
  const setActive = (on: boolean) => {
    if (on) layer.setAttribute("data-active", "");
    else layer.removeAttribute("data-active");
  };
  const untrack = trackPointer(container, {
    pointerTypes: types,
    onMove(sample) {
      if (!control?.moving) {
        setActive(false);
        return;
      }
      target.x = sample.left;
      target.y = sample.top;
      if (fresh) {
        current.x = target.x;
        current.y = target.y;
        fresh = false;
        write();
      }
      setActive(true);
      cancel ??= scheduler.schedule(step, "write");
    },
    onLeave() {
      fresh = true;
      setActive(false);
    },
  });
  control = createAmbient("createPointerGlow", resolved, {
    gate: container,
    layer,
    interactive: true,
    rest() {
      setActive(false);
      cancel?.();
      cancel = undefined;
    },
    destroy() {
      untrack();
      cancel?.();
      cancel = undefined;
      layer.remove();
    },
  });
  return control;
}
