/**
 * Transform gestures G08 `pinchZoom` and G09 `rotateGesture` (catalogue §4; contracts/api-012.md §1). Two-
 * pointer recognisers that share pointers (non-exclusive), so pinch and rotate run together. G08 attaches to
 * the media element and listens on its frame (the parent, structure W); geometry is read once per gesture
 * start or command. `touch-action` keeps one-finger page scrolling at scale 1 and becomes `none` only while
 * zoomed in (research R2).
 */
import type { SpringPreset } from "../core/defaults.js";
import { type ChannelClaim, defineEffect } from "../core/effect.js";
import { measureBox } from "../core/layout-box.js";
import type { SpringOptions } from "../core/spring.js";
import { createSpringRig } from "../core/springs.js";
import { validator } from "../core/validate.js";
import { bindControls, type GestureControls } from "./engine/controls.js";
import { createGesture, type GestureState, type Vec } from "./engine/gesture.js";
import {
  clampTo,
  type GestureCommonOptions,
  ownKey,
  type ResolvedCommon,
  resolveCommon,
} from "./shared.js";

const TRANSFORM: ChannelClaim = { channel: "transform", mode: "compose" };

/** G08 — Pinch-zoom media. */
export interface PinchZoomOptions extends GestureCommonOptions {
  /** Minimum scale (0.5–1, default 1). */
  minScale?: number;
  /** Maximum scale (1–10, default 4). */
  maxScale?: number;
  /** Scale of a double tap / double click (1–10, default 2; 1 disables). */
  doubleTapScale?: number;
  /** Ctrl/⌘ + wheel and trackpad pinch zoom over the frame (opt-in; prevents the page zoom there). */
  wheel?: boolean;
  /** Factor of the zoom keys and buttons (1.1–4, default 1.5). */
  step?: number;
  spring?: SpringOptions | SpringPreset;
  /** Called with the scale after a gesture, a key or a command. */
  onZoomChange?: (scale: number) => void;
}

interface ResolvedPinch extends ResolvedCommon {
  minScale: number;
  maxScale: number;
  doubleTapScale: number;
  wheel: boolean;
  step: number;
  spring: Required<SpringOptions>;
  onZoomChange: ((scale: number) => void) | undefined;
}

const pinchV = /* @__PURE__ */ validator("pinchZoom");

interface ClientBox {
  left: number;
  top: number;
  width: number;
  height: number;
}
const clientBox = (element: Element): ClientBox => {
  const box = measureBox(element);
  return {
    left: box.x - (window.scrollX || 0),
    top: box.y - (window.scrollY || 0),
    width: box.width,
    height: box.height,
  };
};

export const pinchZoom = /* @__PURE__ */ defineEffect<PinchZoomOptions, ResolvedPinch>({
  id: "physics/pinch-zoom",
  family: "physics",
  channels: [TRANSFORM],
  reducedMotion: "instant",
  resolve(input) {
    const o = pinchV.options(input);
    const minScale = pinchV.number("minScale", o.minScale, 1, 0.5, 1);
    return {
      ...resolveCommon(o, pinchV),
      minScale,
      maxScale: pinchV.number("maxScale", o.maxScale, 4, 1, 10),
      doubleTapScale: pinchV.number("doubleTapScale", o.doubleTapScale, 2, 1, 10),
      wheel: pinchV.flag("wheel", o.wheel, false),
      step: pinchV.number("step", o.step, 1.5, 1.1, 4),
      spring: pinchV.spring(o.spring, { stiffness: 300, damping: 32 }),
      onZoomChange: pinchV.callback("onZoomChange", o.onZoomChange),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const element = context.element as HTMLElement;
    const area = element.parentElement ?? element;
    let s = 1;
    let t: Vec = { x: 0, y: 0 };
    let center: Vec = { x: 0, y: 0 };
    let frame: ClientBox = { left: 0, top: 0, width: 0, height: 0 };
    let natural = { width: 0, height: 0 };
    let previousScale = 1;
    let lastTap: { time: number; x: number; y: number } | undefined;
    let reported = 1;

    const rig = createSpringRig(
      context.scheduler,
      { s: 1, x: 0, y: 0 },
      context.options.spring,
      (v) => {
        if (Math.abs(v.s - 1) + Math.abs(v.x) + Math.abs(v.y) < 1e-3)
          context.channels.transform.clear();
        else context.channels.transform.set({ translateX: v.x, translateY: v.y, scale: v.s });
      },
    );

    function measure(): void {
      const box = clientBox(element);
      natural = { width: box.width, height: box.height };
      center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      frame = area === element ? box : clientBox(area);
    }
    /** Allowed translation range for scale `scale` (content covers or stays inside the frame). */
    function clampT(scale: number, value: Vec): Vec {
      const hw = (scale * natural.width) / 2;
      const hh = (scale * natural.height) / 2;
      const ax = frame.left - (center.x - hw);
      const bx = frame.left + frame.width - (center.x + hw);
      const ay = frame.top - (center.y - hh);
      const by = frame.top + frame.height - (center.y + hh);
      return {
        x: clampTo(value.x, Math.min(ax, bx), Math.max(ax, bx)),
        y: clampTo(value.y, Math.min(ay, by), Math.max(ay, by)),
      };
    }
    /** Scale to `next` about the client point `focus`, keeping the content point under it fixed. */
    function zoomAbout(next: number, focus: Vec, base: Vec = t, from = s): Vec {
      const ratio = next / from;
      return {
        x: focus.x - center.x - ratio * (focus.x - center.x - base.x),
        y: focus.y - center.y - ratio * (focus.y - center.y - base.y),
      };
    }
    const touchAction = () => (s > 1.001 ? [] : (["pan-x", "pan-y"] as const).slice());
    function settle(target: { s: number; t: Vec }, animate = true): void {
      const o = context.options;
      const scale = clampTo(target.s, o.minScale, o.maxScale);
      const next = clampT(scale, target.t);
      s = scale;
      t = next;
      if (context.reduced || !animate) rig.set({ s, x: t.x, y: t.y });
      else rig.to({ s, x: t.x, y: t.y });
      gesture.setOptions(gestureOptions());
      if (Math.abs(s - reported) > 1e-3) {
        reported = s;
        o.onZoomChange?.(s);
      }
    }

    const gestureOptions = () => ({
      pointers: 2 as const,
      exclusive: false,
      threshold: context.options.threshold,
      pointerTypes: context.options.pointerTypes,
      touchAction: touchAction(),
      accept: () => !context.options.disabled,
      onStart(state: GestureState) {
        measure();
        rig.stop();
        s = rig.values.s;
        t = { x: rig.values.x, y: rig.values.y };
        previousScale = state.scale;
      },
      onMove(state: GestureState) {
        const o = context.options;
        const ratio = state.scale / previousScale;
        previousScale = state.scale;
        if (state.pointers < 2 && s <= 1.001) return; // one pointer pans only while zoomed in
        let base = { x: t.x + state.delta.x, y: t.y + state.delta.y };
        // Direct manipulation: a little elasticity past the limits, settled on release.
        const next = clampTo(s * ratio, o.minScale * 0.8, o.maxScale * 1.25);
        base = zoomAbout(next, state.origin, base, s);
        s = next;
        t = base;
        rig.set({ s, x: t.x, y: t.y });
      },
      onEnd() {
        settle({ s, t });
      },
      onCancel() {
        settle({ s, t });
      },
      onTap(state: GestureState) {
        const o = context.options;
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        const p = state.origin;
        if (
          o.doubleTapScale > 1 &&
          lastTap &&
          now - lastTap.time < 320 &&
          Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30
        ) {
          lastTap = undefined;
          measure();
          if (s > 1.01) settle({ s: 1, t: { x: 0, y: 0 } });
          else settle({ s: o.doubleTapScale, t: zoomAbout(o.doubleTapScale, p) });
          return;
        }
        lastTap = { time: now, x: p.x, y: p.y };
      },
    });
    const gesture = createGesture(area, gestureOptions());

    const zoomBy = (factor: number) => {
      if (!(factor > 0)) return;
      measure();
      const next = clampTo(s * factor, context.options.minScale, context.options.maxScale);
      settle({ s: next, t: zoomAbout(next, center) });
    };
    const commands: Partial<GestureControls> = {
      zoomBy,
      zoomTo(scale) {
        if (scale > 0) zoomBy(scale / s);
      },
      reset() {
        measure();
        settle({ s: 1, t: { x: 0, y: 0 } });
      },
      moveBy(dx, dy) {
        measure();
        settle({ s, t: { x: t.x + dx, y: t.y + dy } });
      },
    };
    let bound = context.options.controls;
    let unbind = bindControls(bound, commands);

    function onKey(event: KeyboardEvent): void {
      const o = context.options;
      if (o.disabled || !ownKey(area, event)) return;
      const pan = 40;
      if (event.key === "+" || event.key === "=") zoomBy(o.step);
      else if (event.key === "-" || event.key === "_") zoomBy(1 / o.step);
      else if (event.key === "0") commands.reset?.();
      else if (s > 1.001 && event.key.startsWith("Arrow")) {
        const dx = event.key === "ArrowLeft" ? pan : event.key === "ArrowRight" ? -pan : 0;
        const dy = event.key === "ArrowUp" ? pan : event.key === "ArrowDown" ? -pan : 0;
        commands.moveBy?.(dx, dy);
      } else return;
      event.preventDefault();
    }
    function onWheel(event: WheelEvent): void {
      const o = context.options;
      if (!o.wheel || o.disabled || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault(); // only over the frame, only with the zoom modifier (opt-in)
      measure();
      const next = clampTo(s * Math.exp(-event.deltaY * 0.01), o.minScale, o.maxScale);
      settle({ s: next, t: zoomAbout(next, { x: event.clientX, y: event.clientY }) }, false);
    }
    area.addEventListener("keydown", onKey);
    area.addEventListener("wheel", onWheel, { passive: false });
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (reduced) rig.set({ s, x: t.x, y: t.y });
    });

    return {
      update(next) {
        rig.setSpring(next.spring);
        gesture.setOptions(gestureOptions());
        if (next.controls !== bound) {
          unbind();
          bound = next.controls;
          unbind = bindControls(bound, commands);
        }
        if (s > next.maxScale || s < next.minScale) {
          measure();
          settle({ s, t });
        }
      },
      destroy() {
        gesture.destroy();
        rig.stop();
        unbind();
        unsubscribeReduced();
        area.removeEventListener("keydown", onKey);
        area.removeEventListener("wheel", onWheel);
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** G09 — Rotate gesture. */
export interface RotateGestureOptions extends GestureCommonOptions {
  /** Snap the rotation to multiples of `step` degrees on release (0 = free, default 0). */
  step?: number;
  /** Degrees per `[` / `]` key and default `rotateBy` button step (1–90, default 15). */
  keyStep?: number;
  spring?: SpringOptions | SpringPreset;
  /** Called with the rotation (degrees) after a gesture, a key or a command. */
  onRotateEnd?: (degrees: number) => void;
}

interface ResolvedRotate extends ResolvedCommon {
  step: number;
  keyStep: number;
  spring: Required<SpringOptions>;
  onRotateEnd: ((degrees: number) => void) | undefined;
}

const rotateV = /* @__PURE__ */ validator("rotateGesture");

export const rotateGesture = /* @__PURE__ */ defineEffect<RotateGestureOptions, ResolvedRotate>({
  id: "physics/rotate",
  family: "physics",
  channels: [TRANSFORM],
  reducedMotion: "instant",
  resolve(input) {
    const o = rotateV.options(input);
    return {
      ...resolveCommon(o, rotateV),
      step: rotateV.number("step", o.step, 0, 0, 180),
      keyStep: rotateV.number("keyStep", o.keyStep, 15, 1, 90),
      spring: rotateV.spring(o.spring, { stiffness: 300, damping: 30 }),
      onRotateEnd: rotateV.callback("onRotateEnd", o.onRotateEnd),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const element = context.element as HTMLElement;
    let rotation = 0;
    let base = 0;
    const rig = createSpringRig(context.scheduler, { r: 0 }, context.options.spring, ({ r }) => {
      if (Math.abs(r) < 1e-3) context.channels.transform.clear();
      else context.channels.transform.set({ rotateZ: r });
    });
    function settle(target: number): void {
      const o = context.options;
      rotation = o.step > 0 ? Math.round(target / o.step) * o.step : target;
      if (context.reduced) rig.set({ r: rotation });
      else rig.to({ r: rotation });
      o.onRotateEnd?.(rotation);
    }
    const gestureOptions = () => ({
      pointers: 2 as const,
      exclusive: false,
      threshold: context.options.threshold,
      pointerTypes: context.options.pointerTypes,
      touchAction: ["pan-x", "pan-y"] as ("pan-x" | "pan-y")[],
      accept: () => !context.options.disabled,
      onStart() {
        rig.stop();
        base = rotation = rig.values.r;
      },
      onMove(state: GestureState) {
        if (state.pointers < 2 && state.rotation === 0) return;
        rotation = base + state.rotation;
        rig.set({ r: rotation });
      },
      onEnd() {
        settle(rotation);
      },
      onCancel() {
        settle(rotation);
      },
    });
    const gesture = createGesture(element, gestureOptions());
    const commands: Partial<GestureControls> = {
      rotateBy(degrees) {
        if (Number.isFinite(degrees)) settle(rotation + degrees);
      },
      reset() {
        settle(0);
      },
    };
    let bound = context.options.controls;
    let unbind = bindControls(bound, commands);
    function onKey(event: KeyboardEvent): void {
      const o = context.options;
      if (o.disabled || !ownKey(element, event)) return;
      if (event.key === "[") settle(rotation - o.keyStep);
      else if (event.key === "]") settle(rotation + o.keyStep);
      else if (event.key === "0") settle(0);
      else return;
      event.preventDefault();
    }
    element.addEventListener("keydown", onKey);
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (reduced) rig.set({ r: rotation });
    });
    return {
      update(next) {
        rig.setSpring(next.spring);
        gesture.setOptions(gestureOptions());
        if (next.controls !== bound) {
          unbind();
          bound = next.controls;
          unbind = bindControls(bound, commands);
        }
      },
      destroy() {
        gesture.destroy();
        rig.stop();
        unbind();
        unsubscribeReduced();
        element.removeEventListener("keydown", onKey);
      },
    };
  },
});
