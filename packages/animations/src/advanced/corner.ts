/**
 * D05 CornerRecede (catalogue §15 footnote 9; contracts/advanced-api.md, research R9). The 008 R7 technique 2 (hinged
 * fold, owner-approved recommendation for live content) productised — a fold, not a tilt: the live surface is clipped
 * without the corner triangle (exclusive `clip-path` host channel) and a decorative flap — an inert, `aria-hidden`,
 * ID-free copy of the surface (or a plain surface-coloured triangle) — rotates about the straight crease. By default
 * the corner under the pointer recedes (moves away from the viewer); `reverse` lifts it. Kept from the prototype: the
 * fold collapses to 0 at rest (no hairline seam) and one spring drives the amount. Added: the Tilt3D box hit area
 * (008 R6), proximity to the corner with a neutral centre, a corner change that first returns to 0 (no geometry jump),
 * a crease overlap of 0.75 px (no gap), a gentle focus-visible fold, instant reduced motion, a flap created on the
 * first fold and removed at rest, kept in sync by a MutationObserver coalesced into the write phase.
 */
import { createAttributeLedger } from "../core/attributes.js";
import { createChannelWriter } from "../core/channel.js";
import { CORNERS, type Corner, cornerOf, cornerSigns, foldGeometry } from "../core/geometry-3d.js";
import { trackPointer } from "../core/pointer.js";
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
import { decorativeClone, makeDecorative } from "./clone.js";
import { counters } from "./engine/debug.js";

export type { Corner } from "../core/geometry-3d.js";

export interface CornerRecedeOptions {
  /** The live content element that is clipped (default: the root's first element child). */
  surface?: HTMLElement;
  /** Fold leg as a fraction of the shorter side 0.1–0.6 (default 0.35). */
  size?: number;
  /** Maximum fold angle, deg 10–85 (default 60). */
  angle?: number;
  /** Lift the corner toward the viewer instead of receding (default false). */
  reverse?: boolean;
  /** Corners that may fold (default all four). */
  corners?: readonly Corner[];
  /** Neutral zone around the centre 0–0.9 (default 0.3). */
  threshold?: number;
  spring?: SpringOptions;
  /** Corner folded at 35 % while focus inside is `:focus-visible`; `false` disables (default "top-right"). */
  focusCorner?: Corner | false;
  /** `"clone"`: inert ID-free copy of the surface; `"plain"`: a surface-coloured triangle (default "clone"). */
  flap?: "clone" | "plain";
  /** Flap darkening 0–0.6 (default 0.3). */
  shade?: number;
  /** px 300–3000 perspective of the flap (default 900). */
  perspective?: number;
  pointerTypes?: readonly ("mouse" | "pen" | "touch")[];
  reducedMotion?: ReducedMotion;
}

export interface CornerRecedeControl {
  readonly corner: Corner;
  /** Rendered fold amount 0–1. */
  readonly amount: number;
  /** Animate to a pose (programmatic or external progress). */
  set(corner: Corner, amount: number): void;
  /** Render a pose exactly (no animation). */
  seek(corner: Corner, amount: number): void;
  reset(): void;
  destroy(): void;
}

const FOCUS_AMOUNT = 0.35;
const FLAP_STYLE =
  "position:absolute;pointer-events:none;user-select:none;-webkit-user-select:none;backface-visibility:hidden;will-change:transform";

function focusVisibleWithin(root: Element): boolean {
  const active = root.ownerDocument.activeElement;
  if (!active || !root.contains(active)) return false;
  try {
    return active.matches(":focus-visible");
  } catch {
    return true;
  }
}

export function createCornerRecede(
  root: HTMLElement,
  options: CornerRecedeOptions = {},
): CornerRecedeControl {
  const v = validator("createCornerRecede");
  if (!root || root.nodeType !== 1) v.fail('"root" must be an element.');
  const o = v.options(options);
  const surface = (o.surface ?? root.firstElementChild) as HTMLElement | null;
  if (!surface) v.fail("the root has no surface element.");
  const size = v.number("size", o.size, 0.35, 0.1, 0.6);
  const angle = v.number("angle", o.angle, 60, 10, 85);
  const reverse = v.flag("reverse", o.reverse, false);
  const threshold = v.number("threshold", o.threshold, 0.3, 0, 0.9);
  const spring = v.spring(o.spring, { stiffness: 260, damping: 18 });
  const shade = v.number("shade", o.shade, 0.3, 0, 0.6);
  const perspective = v.number("perspective", o.perspective, 900, 300, 3000);
  const flapMode = v.oneOf("flap", o.flap, ["clone", "plain"], "clone");
  const policy = v.reducedMotion(o.reducedMotion);
  const corners = o.corners === undefined ? CORNERS : o.corners;
  if (!Array.isArray(corners) || corners.length === 0 || corners.some((c) => !CORNERS.includes(c)))
    v.fail(`"corners" must be a non-empty list of: ${CORNERS.join(", ")}.`);
  const focusCorner =
    o.focusCorner === false ? false : v.oneOf("focusCorner", o.focusCorner, CORNERS, "top-right");
  const types = new Set<string>(o.pointerTypes ?? ["mouse", "pen"]);
  const s = surface as HTMLElement;

  const writer = createChannelWriter(s, ["clip-path"], { id: "advanced/corner-recede" });
  const ledger = createAttributeLedger();
  let systemReduced = prefersReducedMotion();
  const reduced = () => shouldReduceMotion(policy, systemReduced);
  let corner: Corner = focusCorner || "top-right";
  let pending: { corner: Corner; amount: number } | undefined;
  let desired = 0;
  let pointerActive = false;
  let box: { left: number; top: number; w: number; h: number } | undefined;
  let flap: { container: HTMLDivElement; content: HTMLElement; shade: HTMLSpanElement } | undefined;
  let mutation: MutationObserver | undefined;
  let cancelResync: (() => void) | undefined;
  let destroyed = false;
  counters.effects++;

  function measure(): NonNullable<typeof box> {
    box = {
      left: s.offsetLeft,
      top: s.offsetTop,
      w: s.offsetWidth || s.getBoundingClientRect().width,
      h: s.offsetHeight || s.getBoundingClientRect().height,
    };
    return box;
  }

  function fillFlap(container: HTMLDivElement): HTMLElement {
    if (flapMode === "plain") {
      const plain = root.ownerDocument.createElement("div");
      let background = "";
      try {
        const cs = getComputedStyle(s);
        background =
          cs.backgroundImage && cs.backgroundImage !== "none"
            ? cs.backgroundImage
            : cs.backgroundColor;
      } catch {}
      plain.setAttribute(
        "style",
        `position:absolute;inset:0;border-radius:inherit;background:${background || "var(--neshel-corner-flap, #e2e8f0)"}`,
      );
      container.appendChild(plain);
      return plain;
    }
    const copy = decorativeClone(s) as HTMLElement;
    copy.style.setProperty("position", "absolute");
    copy.style.setProperty("inset", "0");
    copy.style.setProperty("margin", "0");
    copy.style.setProperty("width", "100%");
    copy.style.setProperty("height", "100%");
    copy.style.setProperty("box-sizing", "border-box");
    copy.style.removeProperty("clip-path");
    copy.style.removeProperty("transform");
    container.appendChild(copy);
    return copy;
  }

  function ensureFlap(b: NonNullable<typeof box>): NonNullable<typeof flap> {
    if (flap) return flap;
    const container = root.ownerDocument.createElement("div");
    container.className = "neshel-corner-flap";
    container.setAttribute("style", FLAP_STYLE);
    makeDecorative(container);
    const content = fillFlap(container);
    const shadeLayer = root.ownerDocument.createElement("span");
    shadeLayer.setAttribute(
      "style",
      "position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;border-radius:inherit",
    );
    container.appendChild(shadeLayer);
    root.appendChild(container);
    flap = { container, content, shade: shadeLayer };
    counters.flaps++;
    position(b);
    if (flapMode === "clone" && typeof MutationObserver === "function") {
      mutation = new MutationObserver(() => {
        cancelResync ??= getFrameScheduler().schedule(() => {
          cancelResync = undefined;
          if (!flap) return;
          const next = fillFlap(flap.container);
          flap.content.remove();
          flap.container.insertBefore(next, flap.shade);
          flap.content = next;
        }, "write");
      });
      mutation.observe(s, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
      counters.observers++;
    }
    return flap;
  }

  function position(b: NonNullable<typeof box>): void {
    if (!flap) return;
    const st = flap.container.style;
    st.setProperty("left", `${b.left}px`);
    st.setProperty("top", `${b.top}px`);
    st.setProperty("width", `${b.w}px`);
    st.setProperty("height", `${b.h}px`);
    try {
      st.setProperty("border-radius", getComputedStyle(s).borderRadius);
    } catch {}
  }

  function removeFlap(): void {
    cancelResync?.();
    cancelResync = undefined;
    if (mutation) {
      mutation.disconnect();
      mutation = undefined;
      counters.observers--;
    }
    if (flap) {
      flap.container.remove();
      flap = undefined;
      counters.flaps--;
    }
  }

  function render(amount: number): void {
    if (destroyed) return;
    if (pending && amount <= 0.02) {
      corner = pending.corner;
      desired = pending.amount;
      pending = undefined;
      if (desired > 0) {
        if (reduced()) rig.set({ a: desired });
        else rig.to({ a: desired });
      }
    }
    if (amount <= 0.0005) {
      writer.release();
      removeFlap();
      ledger.set(root, "data-neshel-corner", null);
      return;
    }
    const b = box ?? measure();
    if (b.w <= 0 || b.h <= 0) return;
    const leg = size * Math.min(b.w, b.h) * Math.min(1, amount * 50);
    const g = foldGeometry(corner, b.w, b.h, leg, angle, Math.min(1, amount), !reverse);
    writer.set("clip-path", g.base);
    const f = ensureFlap(b);
    const st = f.container.style;
    st.setProperty("clip-path", g.flap);
    st.setProperty("transform-origin", g.origin);
    st.setProperty("transform", `perspective(${perspective}px) ${g.transform}`);
    f.shade.style.setProperty(
      "opacity",
      String(Math.round(Math.min(1, amount) * shade * 1000) / 1000),
    );
    ledger.set(root, "data-neshel-corner", corner);
  }

  const rig = createSpringRig(getFrameScheduler(), { a: 0 }, spring, (values) => render(values.a));

  function aim(nextCorner: Corner, amount: number): void {
    if (destroyed) return;
    const a = Math.min(1, Math.max(0, amount));
    if (nextCorner !== corner && rig.values.a > 0.02) {
      // Return to flat first, then fold the new corner (no geometry jump across corners).
      pending = { corner: nextCorner, amount: a };
      desired = 0;
      if (reduced()) {
        rig.set({ a: 0 });
        render(0);
      } else rig.to({ a: 0 });
      return;
    }
    pending = undefined;
    corner = nextCorner;
    desired = a;
    if (reduced()) rig.set({ a });
    else rig.to({ a });
  }

  function proximity(x: number, y: number, c: Corner): number {
    const { sx, sy } = cornerSigns(c);
    const raw = 1 - Math.hypot(x - sx, y - sy) / Math.SQRT2;
    return Math.min(1, Math.max(0, (raw - threshold) / (1 - threshold)));
  }

  function rest(): void {
    if (focusCorner && focusVisibleWithin(root)) aim(focusCorner, FOCUS_AMOUNT);
    else aim(corner, 0);
  }

  const cleanups: Array<() => void> = [];
  cleanups.push(
    trackPointer(root, {
      pointerTypes: types,
      onMove(sample) {
        pointerActive = true;
        if (!box) measure();
        const c = cornerOf(sample.x, sample.y);
        if (!corners.includes(c)) {
          aim(corner, 0);
          return;
        }
        aim(c, proximity(sample.x, sample.y, c));
      },
      onLeave() {
        pointerActive = false;
        box = undefined;
        rest();
      },
    }),
  );
  if (focusCorner) {
    const onFocus = () => {
      if (!pointerActive && focusVisibleWithin(root)) aim(focusCorner, FOCUS_AMOUNT);
    };
    const onBlur = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && root.contains(next)) return;
      if (!pointerActive) aim(corner, 0);
    };
    root.addEventListener("focusin", onFocus);
    root.addEventListener("focusout", onBlur);
    cleanups.push(() => {
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("focusout", onBlur);
    });
  }
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => {
      box = undefined; // re-measured on the next render (write phase reads are cached per hover)
    });
    observer.observe(s);
    counters.observers++;
    cleanups.push(() => {
      observer.disconnect();
      counters.observers--;
    });
  }
  cleanups.push(
    subscribeReducedMotion((value) => {
      systemReduced = value;
      if (reduced()) {
        rig.stop();
        if (pending) {
          corner = pending.corner;
          desired = pending.amount;
          pending = undefined;
        }
        rig.set({ a: desired });
      }
    }),
  );

  return {
    get corner() {
      return corner;
    },
    get amount() {
      return rig.values.a;
    },
    set(nextCorner, amount) {
      if (!CORNERS.includes(nextCorner)) v.fail(`invalid corner ${JSON.stringify(nextCorner)}.`);
      aim(nextCorner, amount);
    },
    seek(nextCorner, amount) {
      if (destroyed) return;
      if (!CORNERS.includes(nextCorner)) v.fail(`invalid corner ${JSON.stringify(nextCorner)}.`);
      pending = undefined;
      corner = nextCorner;
      desired = Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 0));
      rig.stop();
      rig.set({ a: desired });
    },
    reset() {
      aim(corner, 0);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const fn of cleanups.splice(0).reverse()) fn();
      rig.stop();
      removeFlap();
      writer.release();
      ledger.restore();
      counters.effects--;
    },
  };
}
