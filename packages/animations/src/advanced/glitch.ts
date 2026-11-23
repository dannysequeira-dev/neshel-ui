/**
 * D07 RGB split / glitch (catalogue §15; contracts/advanced-api.md, research R11). Accessibility first: the text exists
 * once (the consumer's element); two decorative channel layers — inert, `aria-hidden`, unselectable, ID-free copies —
 * exist only while a burst runs. Flash safety (WCAG 2.3.1/2.3.3): slice changes are capped at 3 per second (hard cap,
 * no option above it), a burst lasts 100–2000 ms, the channel offset is ≤ 6 px and follows a smooth sine envelope (no
 * abrupt luminance step), layers stay at ≤ 0.8 opacity and each slice covers ≤ 30 % of the height. Slice positions come
 * from a seeded generator (deterministic). One update task on the shared scheduler while a burst runs; none otherwise.
 * Reduced motion: off.
 */
import { createAttributeLedger } from "../core/attributes.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../core/reduced-motion.js";
import { getFrameScheduler } from "../core/scheduler.js";
import { validator } from "../core/validate.js";
import { decorativeClone, makeDecorative } from "./clone.js";
import { counters } from "./engine/debug.js";

export type GlitchTrigger = "hover-focus" | "hover" | "focus" | "visible" | "manual";

export interface GlitchOptions {
  /** 0–1 (offset ≤ 6 px; default 0.4). */
  intensity?: number;
  /** Burst length ms 100–2000 (default 600). */
  duration?: number;
  /** Slice changes per second 1–3 (hard cap 3; default 3). */
  rate?: number;
  trigger?: GlitchTrigger;
  /** Two CSS colours of the channel layers. */
  colors?: readonly [string, string];
  /** Integer seed of the slice pattern (default 1). */
  seed?: number;
  reducedMotion?: ReducedMotion;
}

export interface GlitchControl {
  readonly active: boolean;
  play(): void;
  stop(): void;
  destroy(): void;
}

/** Maximum slice changes per second (WCAG 2.3.1 general flash threshold). */
export const GLITCH_MAX_RATE = 3;
const MAX_OFFSET = 6;
const LAYER_STYLE =
  "position:absolute;inset:0;pointer-events:none;user-select:none;-webkit-user-select:none;opacity:0.8;white-space:inherit";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGlitch(element: HTMLElement, options: GlitchOptions = {}): GlitchControl {
  const v = validator("createGlitch");
  if (!element || element.nodeType !== 1) v.fail('"element" must be an element.');
  const o = v.options(options);
  const intensity = v.number("intensity", o.intensity, 0.4, 0, 1);
  const duration = v.number("duration", o.duration, 600, 100, 2000);
  const rate = v.number("rate", o.rate, GLITCH_MAX_RATE, 1, GLITCH_MAX_RATE);
  const trigger = v.oneOf(
    "trigger",
    o.trigger,
    ["hover-focus", "hover", "focus", "visible", "manual"],
    "hover-focus",
  );
  const colors = o.colors ?? ["#ff2a6d", "#05d9e8"];
  if (!Array.isArray(colors) || colors.length !== 2) v.fail('"colors" must be two CSS colours.');
  const colorA = v.css("colors[0]", colors[0], "#ff2a6d");
  const colorB = v.css("colors[1]", colors[1], "#05d9e8");
  const seed = Math.round(v.number("seed", o.seed, 1, 0, 2 ** 31));
  const policy = v.reducedMotion(o.reducedMotion);

  const ledger = createAttributeLedger();
  let systemReduced = prefersReducedMotion();
  const reduced = () => shouldReduceMotion(policy, systemReduced);
  let layers: HTMLSpanElement[] = [];
  let cancel: (() => void) | undefined;
  let elapsed = 0;
  let lastStep = Number.NEGATIVE_INFINITY;
  let random = mulberry32(seed);
  let destroyed = false;
  counters.effects++;

  function buildLayer(color: string): HTMLSpanElement {
    const layer = element.ownerDocument.createElement("span");
    layer.className = "neshel-glitch-layer";
    layer.setAttribute("style", LAYER_STYLE);
    layer.style.setProperty("color", color);
    layer.style.setProperty("-webkit-text-fill-color", color);
    makeDecorative(layer);
    for (const node of [...element.childNodes]) {
      if (node.nodeType === 1 && (node as Element).classList.contains("neshel-glitch-layer"))
        continue;
      layer.appendChild(
        node.nodeType === 1 ? decorativeClone(node as Element) : node.cloneNode(true),
      );
    }
    return layer;
  }

  function removeLayers(): void {
    for (const layer of layers) layer.remove();
    counters.glitchLayers -= layers.length;
    layers = [];
  }

  function step(): void {
    counters.glitchSteps++;
    layers.forEach((layer) => {
      const height = 0.1 + random() * 0.2; // ≤ 30 % of the height
      const top = random() * (1 - height);
      layer.style.setProperty(
        "clip-path",
        `inset(${(top * 100).toFixed(1)}% 0 ${((1 - top - height) * 100).toFixed(1)}% 0)`,
      );
    });
  }

  function stop(): void {
    cancel?.();
    cancel = undefined;
    removeLayers();
    ledger.restore();
  }

  function play(): void {
    if (destroyed || reduced() || cancel) return;
    random = mulberry32(seed);
    layers = [buildLayer(colorA), buildLayer(colorB)];
    for (const layer of layers) element.appendChild(layer);
    counters.glitchLayers += layers.length;
    ledger.set(element, "data-neshel-glitch", "active");
    elapsed = 0;
    lastStep = Number.NEGATIVE_INFINITY;
    const interval = 1000 / rate;
    cancel = getFrameScheduler().schedule(({ delta }) => {
      elapsed += delta * 1000;
      if (elapsed >= duration) {
        stop();
        return false;
      }
      if (elapsed - lastStep >= interval) {
        lastStep = lastStep === Number.NEGATIVE_INFINITY ? 0 : lastStep + interval;
        if (elapsed - lastStep >= interval) lastStep = elapsed; // never two changes in one interval
        step();
      }
      const envelope = Math.sin(Math.PI * Math.min(1, elapsed / duration));
      const offset = Math.round(MAX_OFFSET * intensity * envelope * 100) / 100;
      const [a, b] = layers;
      a?.style.setProperty("transform", `translate(${-offset}px, 0)`);
      b?.style.setProperty("transform", `translate(${offset}px, 0)`);
      return true;
    }, "update");
  }

  const cleanups: Array<() => void> = [];
  const hover = trigger === "hover" || trigger === "hover-focus";
  const focus = trigger === "focus" || trigger === "hover-focus";
  if (hover) {
    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== "touch") play();
    };
    element.addEventListener("pointerenter", onEnter);
    cleanups.push(() => element.removeEventListener("pointerenter", onEnter));
  }
  if (focus) {
    const onFocus = () => {
      try {
        if (element.matches(":focus-visible") || element.querySelector(":focus-visible")) play();
      } catch {
        play();
      }
    };
    element.addEventListener("focusin", onFocus);
    cleanups.push(() => element.removeEventListener("focusin", onFocus));
  }
  if (trigger === "visible" && typeof IntersectionObserver === "function") {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          play();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    cleanups.push(() => observer.disconnect());
  }
  cleanups.push(
    subscribeReducedMotion((value) => {
      systemReduced = value;
      if (reduced()) stop();
    }),
  );

  return {
    get active() {
      return cancel !== undefined;
    },
    play,
    stop,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const fn of cleanups.splice(0).reverse()) fn();
      stop();
      counters.effects--;
    },
  };
}
