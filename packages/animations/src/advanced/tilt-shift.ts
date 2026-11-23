/**
 * D11 tilt-shift blur (catalogue §15; contracts/advanced-api.md, research R15). A package overlay (`aria-hidden`,
 * `pointer-events: none`) above the root's content holds at most two bands per side (horizontal/vertical) or two rings
 * (radial); each band blurs what is behind it with `backdrop-filter` and fades in through a gradient mask, so blur
 * grows away from the focal region in steps. Research R2: duplicated `filter: blur()` layers (31 ms intervals in WebKit)
 * and eight bands (21 ms in Chromium/Firefox) were rejected. Without `backdrop-filter` the bands become a tint (or
 * nothing). Content stays in the DOM, selectable and readable; blur is bounded (≤ 12 px) and the focal band is ≥ 10 %.
 * Static by default; the focus can move through a spring (`setFocus`, `drive`), one style write per band per frame.
 * Reduced motion: static (the focus jumps).
 */
import type { ProgressSource } from "../core/progress-driver.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../core/reduced-motion.js";
import { getFrameScheduler } from "../core/scheduler.js";
import type { SpringOptions } from "../core/spring.js";
import { createSpringRig } from "../core/springs.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";

export interface TiltShiftOptions {
  orientation?: "horizontal" | "vertical" | "radial";
  /** Focal centre 0–1 (default 0.5). */
  focus?: number;
  /** Focal band 0.1–0.9 (default 0.35). */
  size?: number;
  /** Maximum blur px 0–12 (default 6). */
  blur?: number;
  /** Bands per side 1–2 (default 2). */
  bands?: number;
  /** Without `backdrop-filter`: a tint gradient (default) or nothing. */
  fallback?: "tint" | "none";
  tint?: string;
  /** 0–1 source moving the focal centre. */
  progress?: ProgressSource;
  spring?: SpringOptions;
  reducedMotion?: ReducedMotion;
}

export interface TiltShiftControl {
  readonly mode: "backdrop" | "tint" | "none";
  readonly focus: number;
  setFocus(center: number): void;
  drive(source: ProgressSource): () => void;
  destroy(): void;
}

const OVERLAY_STYLE = "position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden";

function supportsBackdrop(): "backdrop-filter" | "-webkit-backdrop-filter" | undefined {
  const css = (globalThis as { CSS?: { supports?(p: string, v: string): boolean } }).CSS;
  if (!css?.supports) return undefined;
  if (css.supports("backdrop-filter", "blur(2px)")) return "backdrop-filter";
  if (css.supports("-webkit-backdrop-filter", "blur(2px)")) return "-webkit-backdrop-filter";
  return undefined;
}

export function createTiltShift(
  root: HTMLElement,
  options: TiltShiftOptions = {},
): TiltShiftControl {
  const v = validator("createTiltShift");
  if (!root || root.nodeType !== 1) v.fail('"root" must be an element.');
  const o = v.options(options);
  const orientation = v.oneOf(
    "orientation",
    o.orientation,
    ["horizontal", "vertical", "radial"],
    "horizontal",
  );
  const initialFocus = v.number("focus", o.focus, 0.5, 0, 1);
  const size = v.number("size", o.size, 0.35, 0.1, 0.9);
  const blur = v.number("blur", o.blur, 6, 0, 12);
  const bandCount = Math.round(v.number("bands", o.bands, 2, 1, 2));
  const fallback = v.oneOf("fallback", o.fallback, ["tint", "none"], "tint");
  const tint = v.css("tint", o.tint, "rgb(0 0 0 / 0.25)");
  const spring = v.spring(o.spring, { stiffness: 140, damping: 24 });
  const policy = v.reducedMotion(o.reducedMotion);
  const property = supportsBackdrop();
  const mode: TiltShiftControl["mode"] = property ? "backdrop" : fallback;

  const doc = root.ownerDocument;
  const overlay = doc.createElement("div");
  overlay.className = "neshel-tiltshift";
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("style", OVERLAY_STYLE);
  overlay.setAttribute("data-neshel-tiltshift", mode);
  const sides = orientation === "radial" ? 1 : 2;
  const bands: HTMLDivElement[] = [];
  if (mode !== "none") {
    for (let side = 0; side < sides; side++) {
      for (let k = 0; k < bandCount; k++) {
        const band = doc.createElement("div");
        band.className = "neshel-tiltshift-band";
        band.setAttribute("style", "position:absolute;inset:0");
        const amount = blur * ((k + 1) / bandCount);
        if (mode === "backdrop" && property) band.style.setProperty(property, `blur(${amount}px)`);
        else band.style.setProperty("background", tint);
        overlay.appendChild(band);
        bands.push(band);
      }
    }
  }
  root.appendChild(overlay);
  counters.layers++;
  counters.effects++;

  const pct = (n: number) => `${Math.round(Math.min(1, Math.max(0, n)) * 10000) / 100}%`;
  function layout(center: number): void {
    const half = size / 2;
    const start = Math.max(0, center - half);
    const end = Math.min(1, center + half);
    bands.forEach((band, index) => {
      const side = orientation === "radial" ? 0 : Math.floor(index / bandCount);
      const k = index % bandCount; // 0 = lighter band nearest the focus
      // Each stronger band starts further from the focal region (graded blur).
      const reach = (k + 1) / (bandCount + 1);
      let mask: string;
      if (orientation === "radial") {
        const inner = half * (1 + reach * 0.8);
        mask = `radial-gradient(circle at 50% ${pct(center)}, transparent ${pct(half)}, #000 ${pct(inner + 0.1)})`;
      } else {
        const dir = orientation === "horizontal" ? "to bottom" : "to right";
        if (side === 0) {
          const solid = start * (1 - reach);
          mask = `linear-gradient(${dir}, #000 ${pct(solid)}, transparent ${pct(start)})`;
        } else {
          const solid = end + (1 - end) * reach;
          mask = `linear-gradient(${dir}, transparent ${pct(end)}, #000 ${pct(solid)})`;
        }
      }
      band.style.setProperty("mask-image", mask);
      band.style.setProperty("-webkit-mask-image", mask);
    });
    overlay.style.setProperty("--neshel-tiltshift-focus", String(Math.round(center * 1000) / 1000));
  }

  let systemReduced = prefersReducedMotion();
  const reduced = () => shouldReduceMotion(policy, systemReduced);
  let unsubscribeSource: (() => void) | undefined;
  let destroyed = false;
  const rig = createSpringRig(getFrameScheduler(), { f: initialFocus }, spring, (values) =>
    layout(values.f),
  );
  rig.set({ f: initialFocus });

  function moveTo(center: number): void {
    if (destroyed) return;
    const f = Math.min(1, Math.max(0, Number.isFinite(center) ? center : initialFocus));
    if (reduced()) rig.set({ f });
    else rig.to({ f });
  }

  const unsubscribeReduced = subscribeReducedMotion((value) => {
    systemReduced = value;
    if (reduced()) rig.set({ f: rig.values.f });
  });

  const control: TiltShiftControl = {
    mode,
    get focus() {
      return rig.values.f;
    },
    setFocus: moveTo,
    drive(source) {
      if (typeof source?.get !== "function" || typeof source?.subscribe !== "function")
        v.fail('"source" must have get() and subscribe().');
      unsubscribeSource?.();
      moveTo(source.get());
      const stop = source.subscribe(moveTo);
      unsubscribeSource = stop;
      return () => {
        stop();
        if (unsubscribeSource === stop) unsubscribeSource = undefined;
      };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeSource?.();
      unsubscribeReduced();
      rig.stop();
      overlay.remove();
      counters.layers--;
      counters.effects--;
    },
  };
  if (o.progress) control.drive(o.progress);
  return control;
}
