/**
 * D01 card flip (catalogue §15; contracts/advanced-api.md, research R5). Structure: `root` (perspective) › `inner`
 * (`preserve-3d`, rotated) › two faces (`backface-visibility: hidden`, the back pre-rotated 180°). Every structural
 * style is written through the Motion Host (captured, restored exactly), so the engine works on any markup. One
 * spring drives the progress (0 front … 1 back); the visible face is the one facing the viewer and the other is
 * `inert` + `aria-hidden` — the two faces are distinct consumer content, never a duplicate. Focus inside a face that
 * turns away moves to the visible face. Reduced motion: `fade` (cross-fade, no rotation) or `instant`; engines
 * without `preserve-3d` cross-fade too.
 */
import { createAttributeLedger, moveFocusIfInside, setHidden } from "../core/attributes.js";
import { type ChannelWriter, createChannelWriter } from "../core/channel.js";
import type { TransformLayer } from "../core/compose.js";
import { getMotionHost } from "../core/host.js";
import { motionValue } from "../core/motion-value.js";
import type {
  ProgressSource,
  ProgressTrack,
  ProgressTrackOptions,
} from "../core/progress-driver.js";
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

export type FlipSide = "front" | "back";

export interface CardFlipOptions {
  /** The rotating element (default: the root's first element child). */
  inner?: HTMLElement;
  /** Faces (default: the inner element's first two element children). */
  front?: HTMLElement;
  back?: HTMLElement;
  axis?: "y" | "x";
  direction?: 1 | -1;
  /** px 200–4000 (default 1200). */
  perspective?: number;
  spring?: SpringOptions;
  /** Start on the back (default false). */
  flipped?: boolean;
  /** Under reduced motion: cross-fade (default) or jump. */
  reducedEffect?: "fade" | "instant";
  /** Elements inside the faces that toggle on click (native buttons); `false` disables. */
  toggleSelector?: string | false;
  reducedMotion?: ReducedMotion;
  /** The visible face changed (the rotation crossed 90°). */
  onFlip?(side: FlipSide): void;
  /** A toggle (in-face control or `toggle()`) changed the intended side — the user's intent, before any motion. */
  onToggle?(side: FlipSide): void;
}

export interface CardFlipControl {
  /** The face currently facing the viewer. */
  readonly side: FlipSide;
  /** The side the card is moving to (or resting on). */
  readonly target: FlipSide;
  /** 0 front … 1 back. */
  readonly progress: number;
  /** `"3d"` or `"fade"` (reduced motion with `reducedEffect: "fade"`, or no `preserve-3d`). */
  readonly mode: "3d" | "fade";
  flip(side?: FlipSide): void;
  toggle(): void;
  /** Render an exact pose (no animation). */
  seek(progress: number): void;
  /** Follow a 0–1 source; returns the unsubscribe. */
  drive(source: ProgressSource): () => void;
  /** A value track for a C01 timeline. */
  track(options?: ProgressTrackOptions): ProgressTrack;
  destroy(): void;
}

function supports3d(): boolean {
  const css = (globalThis as { CSS?: { supports?(p: string, v: string): boolean } }).CSS;
  if (!css?.supports) return true;
  return css.supports("transform-style", "preserve-3d");
}

export function createCardFlip(root: HTMLElement, options: CardFlipOptions = {}): CardFlipControl {
  const v = validator("createCardFlip");
  if (!root || root.nodeType !== 1) v.fail('"root" must be an element.');
  const o = v.options(options);
  const inner = (o.inner ?? root.firstElementChild) as HTMLElement | null;
  if (!inner) v.fail("the root has no inner element.");
  const faces = [...(inner as HTMLElement).children] as HTMLElement[];
  const front = (o.front ?? faces[0]) as HTMLElement | undefined;
  const back = (o.back ?? faces[1]) as HTMLElement | undefined;
  if (!front || !back || front === back) v.fail("two faces (front and back) are required.");
  const axis = v.oneOf("axis", o.axis, ["y", "x"], "y");
  const direction = o.direction === -1 ? -1 : 1;
  if (o.direction !== undefined && o.direction !== 1 && o.direction !== -1)
    v.fail('"direction" must be 1 or -1.');
  const perspective = v.number("perspective", o.perspective, 1200, 200, 4000);
  const spring = v.spring(o.spring, { stiffness: 170, damping: 22 });
  const reducedEffect = v.oneOf("reducedEffect", o.reducedEffect, ["fade", "instant"], "fade");
  const policy = v.reducedMotion(o.reducedMotion);
  const onFlip = v.callback<(side: FlipSide) => void>("onFlip", o.onFlip);
  const onToggle = v.callback<(side: FlipSide) => void>("onToggle", o.onToggle);
  const toggleSelector =
    o.toggleSelector === false
      ? undefined
      : typeof o.toggleSelector === "string"
        ? o.toggleSelector
        : "[data-neshel-flip-toggle]";
  const f = front as HTMLElement;
  const b = back as HTMLElement;
  const i = inner as HTMLElement;

  const ledger = createAttributeLedger();
  const rootWriter = createChannelWriter(root, ["perspective"], { id: "advanced/flip" });
  const innerWriter = createChannelWriter(i, ["transform-style"], { id: "advanced/flip" });
  const faceWriters: ChannelWriter[] = [f, b].map((face) =>
    createChannelWriter(face, ["backface-visibility"], { id: "advanced/flip" }),
  );
  const key = Symbol("advanced/flip");
  const innerHost = getMotionHost(i);
  const frontHost = getMotionHost(f);
  const backHost = getMotionHost(b);
  let systemReduced = prefersReducedMotion();
  const reduced = () => shouldReduceMotion(policy, systemReduced);
  let mode: "3d" | "fade" = "3d";
  let side: FlipSide | undefined;
  let target = o.flipped === true ? 1 : 0;
  let unsubscribeSource: (() => void) | undefined;
  let destroyed = false;
  counters.effects++;

  function structure(): void {
    if (mode === "3d") {
      rootWriter.set("perspective", `${perspective}px`);
      innerWriter.set("transform-style", "preserve-3d");
      for (const w of faceWriters) w.set("backface-visibility", "hidden");
      backHost.setLayer(key, axis === "y" ? { rotateY: 180 } : { rotateX: 180 });
      frontHost.setOpacity(key, undefined);
      backHost.setOpacity(key, undefined);
    } else {
      rootWriter.release();
      innerWriter.release();
      for (const w of faceWriters) w.release();
      backHost.setLayer(key, undefined);
      innerHost.setLayer(key, undefined);
    }
  }

  function render(p: number): void {
    if (destroyed) return;
    if (mode === "3d") {
      const deg = p * 180 * direction;
      const layer: TransformLayer | undefined =
        Math.abs(deg) < 1e-3 ? undefined : axis === "y" ? { rotateY: deg } : { rotateX: -deg };
      innerHost.setLayer(key, layer);
    } else {
      frontHost.setOpacity(key, 1 - p);
      backHost.setOpacity(key, p);
    }
    const next: FlipSide = p < 0.5 ? "front" : "back";
    if (next !== side) {
      const previous = side;
      side = next;
      const shown = next === "front" ? f : b;
      const hidden = next === "front" ? b : f;
      setHidden(ledger, shown, false);
      // Focus leaves the face that turned away BEFORE that face becomes inert.
      if (previous) moveFocusIfInside(ledger, hidden, shown);
      setHidden(ledger, hidden, true);
      ledger.set(root, "data-neshel-flip", next);
      if (previous) onFlip?.(next);
    }
  }

  const rig = createSpringRig(getFrameScheduler(), { p: target }, spring, (values) =>
    render(values.p),
  );

  function chooseMode(): void {
    const next = (reduced() && reducedEffect === "fade") || !supports3d() ? "fade" : "3d";
    if (next === mode && side !== undefined) return;
    mode = next;
    ledger.set(root, "data-neshel-flip-mode", mode);
    structure();
  }

  function go(next: number): void {
    target = next;
    // Reduced + "instant" jumps; reduced + "fade" lets the same spring animate the cross-fade (no rotation).
    if (reduced() && reducedEffect === "instant") rig.set({ p: next });
    else rig.to({ p: next });
  }

  chooseMode();
  rig.set({ p: target });

  const cleanups: Array<() => void> = [];
  if (toggleSelector) {
    const onClick = (event: Event) => {
      const t = event.target as Element | null;
      const toggle = t?.closest?.(toggleSelector);
      if (toggle && root.contains(toggle)) control.toggle();
    };
    root.addEventListener("click", onClick);
    cleanups.push(() => root.removeEventListener("click", onClick));
  }
  cleanups.push(
    subscribeReducedMotion((value) => {
      systemReduced = value;
      chooseMode();
      if (reduced()) rig.set({ p: target });
      render(rig.values.p);
    }),
  );

  const control: CardFlipControl = {
    get side() {
      return side ?? "front";
    },
    get target() {
      return target >= 0.5 ? "back" : "front";
    },
    get progress() {
      return rig.values.p;
    },
    get mode() {
      return mode;
    },
    flip(next) {
      if (destroyed) return;
      unsubscribeSource?.();
      unsubscribeSource = undefined;
      const want = next ?? (target >= 0.5 ? "front" : "back");
      go(want === "back" ? 1 : 0);
    },
    toggle() {
      if (destroyed) return;
      const next: FlipSide = target >= 0.5 ? "front" : "back";
      control.flip(next);
      onToggle?.(next);
    },
    seek(progress) {
      if (destroyed) return;
      const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
      target = p;
      rig.stop();
      rig.set({ p });
    },
    drive(source) {
      if (destroyed) return () => {};
      if (typeof source?.get !== "function" || typeof source?.subscribe !== "function")
        v.fail('"source" must have get() and subscribe().');
      unsubscribeSource?.();
      control.seek(source.get());
      const stop = source.subscribe((p) => control.seek(p));
      unsubscribeSource = stop;
      return () => {
        stop();
        if (unsubscribeSource === stop) unsubscribeSource = undefined;
      };
    },
    track(trackOptions = {}) {
      const value = motionValue(rig.values.p);
      const stop = value.subscribe((p) => control.seek(p));
      cleanups.push(stop);
      return {
        id: trackOptions.id,
        value,
        from: trackOptions.from ?? 0,
        to: trackOptions.to ?? 1,
        duration: trackOptions.duration ?? 800,
        easing: trackOptions.easing ?? "standard",
      };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeSource?.();
      for (const fn of cleanups.splice(0).reverse()) fn();
      rig.stop();
      innerHost.setLayer(key, undefined);
      backHost.setLayer(key, undefined);
      frontHost.setOpacity(key, undefined);
      backHost.setOpacity(key, undefined);
      rootWriter.release();
      innerWriter.release();
      for (const w of faceWriters) w.release();
      ledger.restore();
      counters.effects--;
    },
  };
  return control;
}
