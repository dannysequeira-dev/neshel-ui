/**
 * Observe-only gestures on scroll containers: G04 `pullToRefresh` and G06 `elasticEdge` (catalogue §4;
 * contracts/api-012.md §1, research R3). Neither prevents a default, sets `touch-action` on the scroller or
 * touches the document: touch input is read from passive Touch Events (pointer events where `TouchEvent`
 * does not exist), mouse/pen through the shared pointer session, wheel passively. Scroll extents are read once
 * per input burst, never per event.
 */
import { type ChannelClaim, defineEffect } from "../core/effect.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import { afterDelay, createSpringRig } from "../core/springs.js";
import {
  addToken,
  FX_ACTIVE_ATTRIBUTE,
  FX_ATTRIBUTE,
  FX_REDUCED_ATTRIBUTE,
  toggleToken,
} from "../core/tokens.js";
import { validator } from "../core/validate.js";
import { bindControls, type GestureControls } from "./engine/controls.js";
import { createGesture, type GestureState } from "./engine/gesture.js";
import { rubberband } from "./engine/physics.js";
import { type GestureCommonOptions, type ResolvedCommon, resolveCommon } from "./shared.js";

const TRANSFORM: ChannelClaim = { channel: "transform", mode: "compose" };
const hasTouchEvents = () => typeof window !== "undefined" && "TouchEvent" in window;
const SETTLE: Required<SpringOptions> = {
  stiffness: 320,
  damping: 30,
  mass: 1,
  restDelta: 0.1,
  restSpeed: 0.1,
};

/* ------------------------------------------------------------------------------------------------ */
/** G04 — Pull-to-refresh indicator. */
export interface PullToRefreshOptions extends GestureCommonOptions {
  /** Pull distance (px) that triggers a refresh on release (24–240, default 72). */
  threshold?: number;
  /** The refresh action (provided by the consumer); a returned promise keeps the busy state until it settles. */
  onRefresh?: () => unknown;
  /** Called with `"refreshing"` and `"done"` (announcements; `<PullToRefresh>` announces them). */
  onStatus?: (status: "refreshing" | "done") => void;
}

interface ResolvedPull extends Omit<ResolvedCommon, "threshold"> {
  threshold: number;
  onRefresh: (() => unknown) | undefined;
  onStatus: ((status: "refreshing" | "done") => void) | undefined;
}

const pullV = /* @__PURE__ */ validator("pullToRefresh");

export const pullToRefresh = /* @__PURE__ */ defineEffect<PullToRefreshOptions, ResolvedPull>({
  id: "physics/pull-to-refresh",
  family: "physics",
  // Writes only its own package-rendered indicator, never the scroller's styles.
  channels: [],
  reducedMotion: "reduced",
  resolve(input) {
    const o = pullV.options(input);
    const { threshold: _ignored, ...common } = resolveCommon({ ...o, threshold: undefined }, pullV);
    return {
      ...common,
      threshold: pullV.number("threshold", o.threshold, 72, 24, 240),
      onRefresh: pullV.callback("onRefresh", o.onRefresh),
      onStatus: pullV.callback("onStatus", o.onStatus),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const scroller = context.element as HTMLElement;
    const removeToken = addToken(scroller, FX_ATTRIBUTE, "pull-to-refresh");
    const indicator = document.createElement("div");
    indicator.className = "neshel-pull-indicator";
    indicator.setAttribute("aria-hidden", "true");
    scroller.prepend(indicator);
    const busyToken = toggleToken(scroller, FX_ACTIVE_ATTRIBUTE, "pull-to-refresh");
    const reducedToken = toggleToken(scroller, FX_REDUCED_ATTRIBUTE, "pull-to-refresh");
    reducedToken(context.reduced);
    let busy = false;
    let pulling = false;
    let startY = 0;
    let touchId: number | undefined;

    const rig = createSpringRig(context.scheduler, { y: 0 }, SETTLE, ({ y }) => {
      const o = context.options;
      const progress = Math.min(1, y / o.threshold);
      indicator.style.transform = y > 0.05 ? `translate3d(-50%, ${y.toFixed(2)}px, 0)` : "";
      indicator.style.setProperty("--neshel-pull-progress", progress.toFixed(3));
    });
    const shown = (pull: number) => rubberband(Math.max(0, pull), context.options.threshold * 2);
    const show = (y: number, animate: boolean) => {
      if (context.reduced || !animate) rig.set({ y });
      else rig.to({ y });
    };

    function done(): void {
      busy = false;
      busyToken(false);
      scroller.removeAttribute("aria-busy");
      context.options.onStatus?.("done");
      show(0, true);
    }
    function refresh(): void {
      const o = context.options;
      if (busy || o.disabled) return;
      busy = true;
      busyToken(true);
      scroller.setAttribute("aria-busy", "true");
      o.onStatus?.("refreshing");
      show(o.threshold, true);
      let result: unknown;
      try {
        result = o.onRefresh?.();
      } catch (error) {
        done();
        throw error;
      }
      if (result && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<unknown>).then(done, done);
      } else done();
    }
    let lastY = 0;
    /** The content scrolled during a pull: the pull starts over from the current point. */
    const onScroll = () => {
      startY = lastY;
      show(0, false);
    };
    function begin(y: number): void {
      // Only at the top of the scroller (scroll position read once per gesture, never per move).
      if (busy || context.options.disabled || scroller.scrollTop > 0) return;
      pulling = true;
      startY = lastY = y;
      rig.stop();
      scroller.addEventListener("scroll", onScroll, { passive: true });
    }
    function move(y: number): void {
      if (!pulling) return;
      lastY = y;
      show(shown(y - startY), false);
    }
    function stopPulling(): void {
      pulling = false;
      scroller.removeEventListener("scroll", onScroll);
    }
    function finish(): void {
      if (!pulling) return;
      stopPulling();
      if (rig.values.y >= context.options.threshold) refresh();
      else show(0, true);
    }

    // Touch: passive Touch Events (observe-only, research R3).
    const touches = hasTouchEvents();
    const onTouchStart = (event: TouchEvent) => {
      if (touchId !== undefined || event.touches.length !== 1) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      touchId = touch.identifier;
      begin(touch.clientY);
    };
    const findTouch = (event: TouchEvent) =>
      [...event.changedTouches].find((touch) => touch.identifier === touchId);
    const onTouchMove = (event: TouchEvent) => {
      const touch = findTouch(event);
      if (touch) move(touch.clientY);
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (!findTouch(event)) return;
      touchId = undefined;
      finish();
    };
    const onTouchCancel = (event: TouchEvent) => {
      if (!findTouch(event)) return;
      touchId = undefined;
      stopPulling();
      show(0, true);
    };
    if (touches) {
      scroller.addEventListener("touchstart", onTouchStart, { passive: true });
      scroller.addEventListener("touchmove", onTouchMove, { passive: true });
      scroller.addEventListener("touchend", onTouchEnd, { passive: true });
      scroller.addEventListener("touchcancel", onTouchCancel, { passive: true });
    }
    // Mouse and pen (and touch where Touch Events do not exist) through the pointer session.
    const gesture = createGesture(scroller, {
      axis: "y",
      threshold: 4,
      pointerTypes: touches ? ["mouse", "pen"] : ["mouse", "pen", "touch"],
      accept: () => !busy && !context.options.disabled && scroller.scrollTop <= 0,
      onStart(state: GestureState) {
        begin(state.origin.y - state.offset.y);
      },
      onMove(state: GestureState) {
        move(state.origin.y);
      },
      onEnd: finish,
      onCancel() {
        stopPulling();
        show(0, true);
      },
    });

    const commands: Partial<GestureControls> = { refresh };
    let bound = context.options.controls;
    let unbind = bindControls(bound, commands);
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      reducedToken(reduced);
      if (reduced) rig.set({ y: rig.values.y > 0 && !busy ? 0 : rig.values.y });
    });
    return {
      update(next) {
        if (next.controls !== bound) {
          unbind();
          bound = next.controls;
          unbind = bindControls(bound, commands);
        }
      },
      destroy() {
        gesture.destroy();
        stopPulling();
        rig.stop();
        unbind();
        unsubscribeReduced();
        if (touches) {
          scroller.removeEventListener("touchstart", onTouchStart);
          scroller.removeEventListener("touchmove", onTouchMove);
          scroller.removeEventListener("touchend", onTouchEnd);
          scroller.removeEventListener("touchcancel", onTouchCancel);
        }
        busyToken(false);
        reducedToken(false);
        if (busy) scroller.removeAttribute("aria-busy");
        indicator.remove();
        removeToken();
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** G06 — Elastic edge (visual overscroll, decorative). */
export interface ElasticEdgeOptions {
  /** Scroll axis of the container (default `"y"`). */
  axis?: "x" | "y";
  /** Maximum visual stretch in px (8–200, default 64). */
  max?: number;
  /** Decorative: reduced motion turns it off (default `"user"`). */
  reducedMotion?: ReducedMotion;
  disabled?: boolean;
}

interface ResolvedElastic {
  axis: "x" | "y";
  max: number;
  reducedMotion: ReducedMotion;
  disabled: boolean;
}

const elasticV = /* @__PURE__ */ validator("elasticEdge");

export const elasticEdge = /* @__PURE__ */ defineEffect<ElasticEdgeOptions, ResolvedElastic>({
  id: "physics/elastic-edge",
  family: "physics",
  channels: [TRANSFORM],
  reducedMotion: "off",
  resolve(input) {
    const o = elasticV.options(input);
    return {
      axis: elasticV.oneOf("axis", o.axis, ["x", "y"] as const, "y"),
      max: elasticV.number("max", o.max, 64, 8, 200),
      reducedMotion: elasticV.reducedMotion(o.reducedMotion),
      disabled: elasticV.flag("disabled", o.disabled, false),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    // The effect moves the content; the scroller is its parent (structure W).
    const content = context.element as HTMLElement;
    const scroller = content.parentElement ?? content;
    let extent: { max: number } | undefined;
    let over = 0;
    let cancelRelease: (() => void) | undefined;
    let touch: { id: number; start: number; edge: -1 | 0 | 1 } | undefined;
    const horizontal = () => context.options.axis === "x";

    const rig = createSpringRig(context.scheduler, { d: 0 }, SETTLE, ({ d }) => {
      if (Math.abs(d) < 0.05) context.channels.transform.clear();
      else context.channels.transform.set(horizontal() ? { translateX: d } : { translateY: d });
    });
    const position = () => (horizontal() ? scroller.scrollLeft : scroller.scrollTop);
    /** Scroll extent, read once per input burst. */
    const maxScroll = () => {
      extent ??= {
        max: horizontal()
          ? scroller.scrollWidth - scroller.clientWidth
          : scroller.scrollHeight - scroller.clientHeight,
      };
      return extent.max;
    };
    const edge = (): -1 | 0 | 1 => {
      const p = position();
      if (p <= 0) return -1;
      if (p >= maxScroll() - 1) return 1;
      return 0;
    };
    const active = () => !context.reduced && !context.options.disabled;
    const stretch = (amount: number) => {
      over = amount;
      rig.set({
        d: rubberband(over, context.options.max * 2.5) * 0.4 * (context.options.max / 64),
      });
    };
    const scheduleRelease = (ms: number) => {
      cancelRelease?.();
      cancelRelease = afterDelay(context.scheduler, ms, () => {
        cancelRelease = undefined;
        over = 0;
        extent = undefined;
        rig.to({ d: 0 });
      });
    };

    function onWheel(event: WheelEvent): void {
      if (!active() || event.ctrlKey) return;
      const delta = horizontal()
        ? event.deltaX || (event.shiftKey ? event.deltaY : 0)
        : event.deltaY;
      if (delta === 0) return;
      const at = edge();
      if ((at === -1 && delta < 0) || (at === 1 && delta > 0)) {
        stretch(over - delta);
        scheduleRelease(140);
      }
    }
    const onTouchStart = (event: TouchEvent) => {
      if (!active() || touch || event.touches.length !== 1) return;
      const t = event.changedTouches[0];
      if (!t) return;
      extent = undefined;
      touch = { id: t.identifier, start: horizontal() ? t.clientX : t.clientY, edge: edge() };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!touch) return;
      const t = [...event.changedTouches].find((item) => item.identifier === touch?.id);
      if (!t) return;
      const travel = (horizontal() ? t.clientX : t.clientY) - touch.start;
      if ((touch.edge === -1 && travel > 0) || (touch.edge === 1 && travel < 0)) stretch(travel);
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (!touch || ![...event.changedTouches].some((item) => item.identifier === touch?.id))
        return;
      touch = undefined;
      scheduleRelease(0);
    };
    scroller.addEventListener("wheel", onWheel, { passive: true });
    const touches = hasTouchEvents();
    if (touches) {
      scroller.addEventListener("touchstart", onTouchStart, { passive: true });
      scroller.addEventListener("touchmove", onTouchMove, { passive: true });
      scroller.addEventListener("touchend", onTouchEnd, { passive: true });
      scroller.addEventListener("touchcancel", onTouchEnd, { passive: true });
    }
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (reduced) {
        cancelRelease?.();
        cancelRelease = undefined;
        over = 0;
        rig.set({ d: 0 });
      }
    });
    return {
      update() {
        extent = undefined;
      },
      destroy() {
        cancelRelease?.();
        rig.stop();
        unsubscribeReduced();
        scroller.removeEventListener("wheel", onWheel);
        if (touches) {
          scroller.removeEventListener("touchstart", onTouchStart);
          scroller.removeEventListener("touchmove", onTouchMove);
          scroller.removeEventListener("touchend", onTouchEnd);
          scroller.removeEventListener("touchcancel", onTouchEnd);
        }
      },
    };
  },
});
