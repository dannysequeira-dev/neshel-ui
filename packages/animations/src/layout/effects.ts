/**
 * Layout Animations — effect definitions L01–L07, L09, L10 (catalogue §9; contracts/api-012.md §2,
 * layout-engine.md). FLIP offsets are transform layers written through motion hosts (they compose with every
 * other effect); heights animate package-rendered wrappers; the tab indicator is a package-rendered layer.
 * L08 presence is the state machine in `engine/presence.ts` behind `<Presence>`.
 */
import { releaseChannels, requestChannels, setExclusive } from "../core/arbiter.js";
import { animateValue, type MotionControl } from "../core/controls.js";
import type { DurationPreset, SpringPreset } from "../core/defaults.js";
import type { Easing, EasingPreset } from "../core/easing.js";
import { toCssEasing } from "../core/easing.js";
import { type ChannelClaim, defineEffect, type EffectContext } from "../core/effect.js";
import {
  createFlipAnimator,
  type FlipAnimator,
  type FlipTransition,
  type LayoutMode,
} from "../core/flip.js";
import { type Claim, getMotionHost } from "../core/host.js";
import { measureBox } from "../core/layout-box.js";
import { motionValue } from "../core/motion-value.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import type { SpringOptions } from "../core/spring.js";
import { addToken, FX_ATTRIBUTE, FX_REDUCED_ATTRIBUTE, toggleToken } from "../core/tokens.js";
import { type Validator, validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";
import type { LayoutGroup } from "./engine/group.js";
import { createHeightAnimator, supportsSizeInterpolation } from "./engine/height.js";
import { createReflow, entryHeight, observeSize } from "./engine/reflow.js";

const TRANSFORM: ChannelClaim = { channel: "transform", mode: "compose" };
const OPACITY: ChannelClaim = { channel: "opacity", mode: "multiply" };

/** Transition of layout animations: a spring (default) or a tween. */
export type LayoutTransition =
  | { type: "spring"; spring?: SpringOptions | SpringPreset }
  | { type: "tween"; duration?: number | DurationPreset; easing?: Easing | EasingPreset };

function resolveTransition(v: Validator, value: unknown): FlipTransition {
  if (value === undefined || value === null) {
    return { type: "spring", spring: v.spring(undefined, { stiffness: 300, damping: 30 }) };
  }
  const t = value as LayoutTransition;
  if (t.type === "tween") {
    return {
      type: "tween",
      duration: v.duration("transition.duration", t.duration, 320),
      easing: v.easing(t.easing),
    };
  }
  if (t.type === "spring") {
    return { type: "spring", spring: v.spring(t.spring, { stiffness: 300, damping: 30 }) };
  }
  return v.fail(`invalid "transition"; expected { type: "spring" | "tween", … }.`);
}

const isGroup = (value: unknown): value is LayoutGroup =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as LayoutGroup).register === "function" &&
  typeof (value as LayoutGroup).snapshot === "function";

/* ------------------------------------------------------------------------------------------------ */
/** L01 — FLIP move / reorder (and L04 shared layout with a `layoutId`). */
export interface FlipMoveOptions {
  /** The group whose snapshot/play cycle animates this element (`createLayoutGroup()`; `<LayoutGroup>`). */
  group?: LayoutGroup;
  /** What is animated (default `"position"`; `"size"`/`"both"` add a non-uniform scale). */
  layout?: LayoutMode;
  transition?: LayoutTransition;
  reducedMotion?: ReducedMotion;
}

/** L04 — Shared layout: the same logical item rendered by a new element animates from the old one. */
export interface SharedLayoutOptions extends FlipMoveOptions {
  /** Stable id shared by the old and the new element (required). */
  layoutId?: string;
}

interface ResolvedFlip {
  group: LayoutGroup | undefined;
  layout: LayoutMode;
  transition: FlipTransition;
  layoutId: string | undefined;
  reducedMotion: ReducedMotion;
}

function resolveFlip(name: string, requireId: boolean) {
  const v = validator(name);
  return (input: SharedLayoutOptions | undefined): ResolvedFlip => {
    const o = v.options(input);
    if (o.group !== undefined && o.group !== null && !isGroup(o.group)) {
      v.fail(`invalid "group"; create it with createLayoutGroup() or render inside <LayoutGroup>.`);
    }
    let layoutId: string | undefined;
    if (o.layoutId !== undefined && o.layoutId !== null) {
      if (typeof o.layoutId !== "string" || o.layoutId === "")
        v.fail(`invalid "layoutId"; expected a non-empty string.`);
      layoutId = o.layoutId;
    } else if (requireId) v.fail(`"layoutId" is required.`);
    return {
      group: o.group ?? undefined,
      layout: v.oneOf("layout", o.layout, ["position", "size", "both"] as const, "position"),
      transition: resolveTransition(v, o.transition),
      layoutId,
      reducedMotion: v.reducedMotion(o.reducedMotion),
    };
  };
}

function setupFlip(context: EffectContext<ResolvedFlip>) {
  const animator = createFlipAnimator(context.scheduler, context.options.transition, (layer) => {
    if (layer) context.channels.transform.set(layer);
    else context.channels.transform.clear();
  });
  let group = context.options.group;
  const entry = {
    animator,
    layout: context.options.layout,
    layoutId: context.options.layoutId,
    animate: () => !context.reduced,
  };
  let unregister = group?.register(context.element, entry);
  const unsubscribeReduced = context.onReducedChange((reduced) => {
    if (reduced) animator.stop();
  });
  return {
    update(next: ResolvedFlip) {
      animator.setTransition(next.transition);
      entry.layout = next.layout;
      entry.layoutId = next.layoutId;
      if (next.group !== group) {
        unregister?.();
        group = next.group;
        unregister = group?.register(context.element, entry);
      }
    },
    destroy() {
      unregister?.();
      unsubscribeReduced();
      animator.stop();
    },
  };
}

const flipResolve = /* @__PURE__ */ resolveFlip("flipMove", false);
export const flipMove = /* @__PURE__ */ defineEffect<FlipMoveOptions, ResolvedFlip>({
  id: "layout/flip",
  family: "layout",
  channels: [TRANSFORM],
  reducedMotion: "instant",
  resolve: (input) => flipResolve(input),
  policy: (o) => o.reducedMotion,
  setup: setupFlip,
});

const sharedResolve = /* @__PURE__ */ resolveFlip("sharedLayout", true);
export const sharedLayout = /* @__PURE__ */ defineEffect<SharedLayoutOptions, ResolvedFlip>({
  id: "layout/shared",
  family: "layout",
  channels: [TRANSFORM],
  reducedMotion: "instant",
  resolve: (input) => sharedResolve(input),
  policy: (o) => o.reducedMotion,
  setup: setupFlip,
});

/* ------------------------------------------------------------------------------------------------ */
/** Animators of a container's children, written through each child's motion host (internal). */
function childAnimators(context: EffectContext<{ transition: FlipTransition }>, id: string) {
  const map = new Map<Element, { animator: FlipAnimator }>();
  return {
    of(child: HTMLElement): FlipAnimator {
      let entry = map.get(child);
      if (!entry) {
        const key = Symbol(id);
        const host = getMotionHost(child);
        entry = {
          animator: createFlipAnimator(context.scheduler, context.options.transition, (layer) =>
            host.setLayer(key, layer),
          ),
        };
        map.set(child, entry);
      }
      entry.animator.setTransition(context.options.transition);
      return entry.animator;
    },
    stopAll() {
      for (const { animator } of map.values()) animator.stop();
    },
    clear() {
      for (const { animator } of map.values()) animator.stop();
      map.clear();
    },
  };
}

/** L05 — Grid reflow. */
export interface GridReflowOptions {
  transition?: LayoutTransition;
  reducedMotion?: ReducedMotion;
}
interface ResolvedReflow {
  transition: FlipTransition;
  reducedMotion: ReducedMotion;
}
const reflowV = /* @__PURE__ */ validator("gridReflow");

export const gridReflow = /* @__PURE__ */ defineEffect<GridReflowOptions, ResolvedReflow>({
  id: "layout/grid-reflow",
  family: "layout",
  // Moves the container's children (through their hosts), not the container.
  channels: [],
  reducedMotion: "instant",
  resolve(input) {
    const o = reflowV.options(input);
    return {
      transition: resolveTransition(reflowV, o.transition),
      reducedMotion: reflowV.reducedMotion(o.reducedMotion),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const container = context.element as HTMLElement;
    const animators = childAnimators(context, "layout/grid-reflow");
    const reflow = createReflow(container, {
      animatorOf: animators.of,
      animate: () => !context.reduced,
    });
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (reduced) animators.stopAll();
    });
    return {
      update() {},
      destroy() {
        reflow.destroy();
        unsubscribeReduced();
        animators.clear();
      },
    };
  },
});

/** L10 — Masonry reflow. */
export interface MasonryOptions extends GridReflowOptions {
  /** Fixed column count (1–12); omitted: as many columns of `minColumnWidth` as fit. */
  columns?: number;
  /** Minimum column width in px when `columns` is omitted (80–800, default 220). */
  minColumnWidth?: number;
  /** Gap in px (0–96, default 16). */
  gap?: number;
  /** Row unit in px used for spans (1–32, default 4). */
  unit?: number;
}
interface ResolvedMasonry extends ResolvedReflow {
  columns: number | undefined;
  minColumnWidth: number;
  gap: number;
  unit: number;
}
const masonryV = /* @__PURE__ */ validator("masonry");
const MASONRY_CHANNELS: ChannelClaim[] = [
  { channel: "--neshel-masonry-template", mode: "exclusive" },
  { channel: "--neshel-masonry-gap", mode: "exclusive" },
  { channel: "--neshel-masonry-unit", mode: "exclusive" },
];

export const masonry = /* @__PURE__ */ defineEffect<MasonryOptions, ResolvedMasonry>({
  id: "layout/masonry",
  family: "layout",
  channels: MASONRY_CHANNELS,
  reducedMotion: "instant",
  resolve(input) {
    const o = masonryV.options(input);
    return {
      transition: resolveTransition(masonryV, o.transition),
      reducedMotion: masonryV.reducedMotion(o.reducedMotion),
      columns:
        o.columns === undefined ? undefined : masonryV.number("columns", o.columns, 3, 1, 12),
      minColumnWidth: masonryV.number("minColumnWidth", o.minColumnWidth, 220, 80, 800),
      gap: masonryV.number("gap", o.gap, 16, 0, 96),
      unit: masonryV.number("unit", o.unit, 4, 1, 32),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const container = context.element as HTMLElement;
    // The masonry grid applies only once every span is known (the plain `.neshel-masonry` grid until then),
    // and that first switch is not animated.
    let removeToken: (() => void) | undefined;
    let phase: "init" | "applied" | "settling" | "ready" = "init";
    const template = context.channels.exclusive("--neshel-masonry-template");
    const gap = context.channels.exclusive("--neshel-masonry-gap");
    const unit = context.channels.exclusive("--neshel-masonry-unit");
    const params = () => {
      const o = context.options;
      template.set(
        o.columns
          ? `repeat(${o.columns}, minmax(0, 1fr))`
          : `repeat(auto-fill, minmax(min(${o.minColumnWidth}px, 100%), 1fr))`,
      );
      gap.set(`${o.gap}px`);
      unit.set(`${o.unit}px`);
    };
    params();
    getMotionHost(container).flush();
    // Row spans: one exclusive claim per item on its own host.
    const spans = new Map<Element, { claim: Claim; last: number }>();
    function writeSpan(child: HTMLElement, height: number): void {
      const o = context.options;
      // Rows of `unit` px with no row gap: the vertical gap is part of each item's span.
      const span = Math.max(1, Math.ceil((height + o.gap) / o.unit));
      let entry = spans.get(child);
      const host = getMotionHost(child);
      if (!entry) {
        const claim: Claim = {
          id: "layout/masonry",
          priority: 0,
          channels: ["--neshel-masonry-span"],
          onGrant: () =>
            setExclusive(host, claim, "--neshel-masonry-span", String(entry?.last ?? 1)),
          onRevoke: () => {},
        };
        requestChannels(host, claim, "silent");
        entry = { claim, last: 0 };
        spans.set(child, entry);
      }
      if (entry.last === span) return;
      entry.last = span;
      // Written in the scheduler's write phase (never inside the observer callback: a span changes the
      // container's size, which would be an undelivered ResizeObserver notification).
      setExclusive(host, entry.claim, "--neshel-masonry-span", String(span));
    }
    const pending = new Map<HTMLElement, number>();
    let cancelWrite: (() => void) | undefined;
    function flushSpans(): void {
      cancelWrite = undefined;
      for (const [child, height] of pending) writeSpan(child, height);
      // Already in the write phase: apply now, in the same frame as the token (a host flush scheduled from
      // here would only run next frame).
      for (const child of pending.keys()) getMotionHost(child).flush();
      pending.clear();
      if (!removeToken) {
        removeToken = addToken(container, FX_ATTRIBUTE, "masonry");
        phase = "applied";
      }
    }
    const animators = childAnimators(context, "layout/masonry");
    const reflow = createReflow(container, {
      animatorOf: animators.of,
      animate: () => phase === "ready" && !context.reduced,
      onSizes(entries) {
        if (phase === "applied") {
          // First pass with the masonry layout: cached, not animated.
          phase = "settling";
          context.scheduler.schedule(() => {
            phase = "ready";
          }, "write");
        }
        for (const entry of entries) {
          if (entry.target !== container)
            pending.set(entry.target as HTMLElement, entryHeight(entry));
        }
        if (pending.size > 0) cancelWrite ??= context.scheduler.schedule(flushSpans, "write");
      },
    });
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (reduced) animators.stopAll();
    });
    return {
      update() {
        params();
        for (const child of spans.keys()) {
          const element = child as HTMLElement;
          const entry = spans.get(child);
          if (entry) entry.last = 0;
          pending.set(element, element.offsetHeight);
        }
        cancelWrite ??= context.scheduler.schedule(flushSpans, "write");
      },
      destroy() {
        reflow.destroy();
        unsubscribeReduced();
        animators.clear();
        cancelWrite?.();
        for (const [child, { claim }] of spans)
          releaseChannels(getMotionHost(child as HTMLElement), claim);
        spans.clear();
        removeToken?.();
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** L02 — Auto-height: the element's height follows its content's observed height. */
export interface AutoHeightOptions {
  /** ms or preset (default 280). */
  duration?: number | DurationPreset;
  easing?: Easing | EasingPreset;
  reducedMotion?: ReducedMotion;
}
interface ResolvedHeight {
  duration: number;
  easing: Easing;
  reducedMotion: ReducedMotion;
}
const autoV = /* @__PURE__ */ validator("autoHeight");

export const autoHeight = /* @__PURE__ */ defineEffect<AutoHeightOptions, ResolvedHeight>({
  id: "layout/auto-height",
  family: "layout",
  // A transient WAAPI animation of the (package-rendered) wrapper; no inline style is written.
  channels: [],
  reducedMotion: "instant",
  resolve(input) {
    const o = autoV.options(input);
    return {
      duration: autoV.duration("duration", o.duration, 280),
      easing: autoV.easing(o.easing, "standard"),
      reducedMotion: autoV.reducedMotion(o.reducedMotion),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const wrapper = context.element as HTMLElement;
    const removeToken = addToken(wrapper, FX_ATTRIBUTE, "auto-height");
    const animator = createHeightAnimator(wrapper, "auto-height");
    let last: number | undefined;
    let content = wrapper.firstElementChild as HTMLElement | null;
    /**
     * DOM-driven content changes are seen by a MutationObserver — a microtask after the change, BEFORE the
     * frame's layout — where the new height is read once (one forced layout per mutation batch, never per
     * frame) and the animation starts, so no layout changes happen inside a ResizeObserver callback (which
     * would be an undelivered notification for other observed elements). Size changes without a mutation
     * (fonts, images, viewport) are recorded by the ResizeObserver and apply without animation.
     */
    function onMutation(): void {
      if (!content?.isConnected) return;
      const next = content.offsetHeight;
      counters.reads++;
      const previous = last;
      last = next;
      if (previous === undefined || Math.abs(next - previous) < 0.5) return;
      if (context.reduced) {
        animator.cancel();
        return;
      }
      const from = animator.current() ?? previous;
      animator.run(from, next, context.options.duration, context.options.easing);
    }
    function onSize(entries: readonly ResizeObserverEntry[]): void {
      const entry = entries[entries.length - 1];
      if (entry) last = entryHeight(entry); // record only: never write inside the observer callback
    }
    const mutations =
      typeof MutationObserver === "undefined" ? undefined : new MutationObserver(onMutation);
    const observe = () => {
      if (!content) return () => {};
      mutations?.observe(content, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        // Not `style`: motion layers inside the content must not trigger a measurement per frame.
        attributeFilter: ["class", "hidden", "open"],
      });
      return observeSize(content, onSize);
    };
    let unobserve = observe();
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (reduced) animator.cancel();
    });
    return {
      update() {
        if (wrapper.firstElementChild !== content) {
          unobserve();
          mutations?.disconnect();
          content = wrapper.firstElementChild as HTMLElement | null;
          last = undefined;
          unobserve = observe();
        }
      },
      destroy() {
        unobserve();
        mutations?.disconnect();
        unsubscribeReduced();
        animator.cancel();
        removeToken();
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** L06 — Accordion height (collapse / expand a package-rendered panel). */
export interface CollapseOptions extends AutoHeightOptions {
  /** Expanded state (controlled by the consumer). */
  open?: boolean;
  /** `"auto"` (default): CSS `interpolate-size` where supported, measured WAAPI otherwise. */
  driver?: "auto" | "css" | "js";
  /** Find-in-page matched hidden content: ask the consumer to open the panel. */
  onRequestOpen?: () => void;
}
interface ResolvedCollapse extends ResolvedHeight {
  open: boolean;
  driver: "auto" | "css" | "js";
  onRequestOpen: (() => void) | undefined;
}
const collapseV = /* @__PURE__ */ validator("collapse");

export const collapse = /* @__PURE__ */ defineEffect<CollapseOptions, ResolvedCollapse>({
  id: "layout/collapse",
  family: "layout",
  channels: [
    { channel: "--neshel-collapse-duration", mode: "exclusive" },
    { channel: "--neshel-collapse-easing", mode: "exclusive" },
  ],
  reducedMotion: "instant",
  resolve(input) {
    const o = collapseV.options(input);
    return {
      open: collapseV.flag("open", o.open, false),
      driver: collapseV.oneOf("driver", o.driver, ["auto", "css", "js"] as const, "auto"),
      duration: collapseV.duration("duration", o.duration, 280),
      easing: collapseV.easing(o.easing, "standard"),
      onRequestOpen: collapseV.callback("onRequestOpen", o.onRequestOpen),
      reducedMotion: collapseV.reducedMotion(o.reducedMotion),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const panel = context.element as HTMLElement;
    const removeToken = addToken(panel, FX_ATTRIBUTE, "collapse");
    const cssToken = toggleToken(panel, FX_ATTRIBUTE, "collapse-css");
    const reducedToken = toggleToken(panel, FX_REDUCED_ATTRIBUTE, "collapse");
    const durationVar = context.channels.exclusive("--neshel-collapse-duration");
    const easingVar = context.channels.exclusive("--neshel-collapse-easing");
    const animator = createHeightAnimator(panel, "collapse");
    const untilFound = typeof document !== "undefined" && "onbeforematch" in document.body;
    let open = context.options.open;
    let cancelSettle: (() => void) | undefined;
    const css = () => {
      const d = context.options.driver;
      return d === "css" || (d === "auto" && supportsSizeInterpolation());
    };
    const params = () => {
      const o = context.options;
      cssToken(css());
      reducedToken(context.reduced);
      durationVar.set(`${o.duration}ms`);
      easingVar.set(toCssEasing(o.easing));
    };
    function hideContent(): void {
      if (open) return;
      if (untilFound) panel.setAttribute("hidden", "until-found");
      else panel.inert = true;
    }
    function showContent(): void {
      panel.removeAttribute("hidden");
      panel.inert = false;
    }
    function settleLater(ms: number): void {
      cancelSettle?.();
      const timer = setTimeout(() => {
        cancelSettle = undefined;
        hideContent();
      }, ms);
      cancelSettle = () => clearTimeout(timer);
    }
    function apply(animate: boolean): void {
      const o = context.options;
      const instant = !animate || context.reduced;
      cancelSettle?.();
      cancelSettle = undefined;
      if (open) {
        const from =
          animator.current() ?? (panel.getAttribute("data-state") === "open" ? undefined : 0);
        showContent();
        panel.setAttribute("data-state", "open");
        if (instant || css()) {
          animator.cancel();
          return;
        }
        animator.run(from ?? 0, panel.scrollHeight, o.duration, o.easing);
        return;
      }
      const from = animator.current() ?? panel.offsetHeight;
      panel.setAttribute("data-state", "closed");
      if (instant) {
        animator.cancel();
        hideContent();
        return;
      }
      if (css()) {
        animator.cancel();
        settleLater(o.duration + 50);
        return;
      }
      animator.run(from, 0, o.duration, o.easing, hideContent);
    }
    const onBeforeMatch = () => context.options.onRequestOpen?.();
    panel.addEventListener("beforematch", onBeforeMatch);
    params();
    getMotionHost(panel).flush();
    apply(false);
    const unsubscribeReduced = context.onReducedChange(() => {
      params();
      if (context.reduced) {
        animator.cancel();
        if (!open) hideContent();
      }
    });
    return {
      update(next) {
        params();
        if (next.open !== open) {
          open = next.open;
          apply(true);
        }
      },
      destroy() {
        cancelSettle?.();
        animator.cancel();
        unsubscribeReduced();
        panel.removeEventListener("beforematch", onBeforeMatch);
        cssToken(false);
        reducedToken(false);
        removeToken();
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** L07 — Tab indicator slide (a package-rendered indicator inside the tab list). */
export interface TabIndicatorOptions {
  /** The active tab: an element, its index among the tabs (`[role="tab"]`, else children), or null. */
  active?: Element | number | null;
  orientation?: "horizontal" | "vertical";
  duration?: number | DurationPreset;
  easing?: Easing | EasingPreset;
  reducedMotion?: ReducedMotion;
}
interface ResolvedIndicator extends ResolvedHeight {
  active: Element | number | null;
  orientation: "horizontal" | "vertical";
}
const indicatorV = /* @__PURE__ */ validator("tabIndicator");

export const tabIndicator = /* @__PURE__ */ defineEffect<TabIndicatorOptions, ResolvedIndicator>({
  id: "layout/tab-indicator",
  family: "layout",
  channels: [],
  reducedMotion: "instant",
  resolve(input) {
    const o = indicatorV.options(input);
    const active = o.active ?? null;
    if (
      active !== null &&
      typeof active !== "number" &&
      !(typeof active === "object" && "nodeType" in (active as object))
    ) {
      indicatorV.fail(`invalid "active"; expected an element, an index or null.`);
    }
    return {
      active,
      orientation: indicatorV.oneOf(
        "orientation",
        o.orientation,
        ["horizontal", "vertical"] as const,
        "horizontal",
      ),
      duration: indicatorV.duration("duration", o.duration, 260),
      easing: indicatorV.easing(o.easing, "standard"),
      reducedMotion: indicatorV.reducedMotion(o.reducedMotion),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const list = context.element as HTMLElement;
    const removeToken = addToken(list, FX_ATTRIBUTE, "tab-indicator");
    const reducedToken = toggleToken(list, FX_REDUCED_ATTRIBUTE, "tab-indicator");
    const indicator = document.createElement("span");
    indicator.className = "neshel-tab-indicator";
    indicator.setAttribute("aria-hidden", "true");
    list.append(indicator);
    let cancelRead: (() => void) | undefined;
    let unobserveTab: () => void = () => {};
    let observedTab: Element | null = null;
    const tabOf = (): Element | null => {
      const active = context.options.active;
      if (active === null || typeof active !== "number") return active as Element | null;
      const tabs = list.querySelectorAll('[role="tab"]');
      const pool =
        tabs.length > 0 ? [...tabs] : [...list.children].filter((child) => child !== indicator);
      return pool[active] ?? null;
    };
    function place(): void {
      const tab = tabOf();
      if (tab !== observedTab) {
        unobserveTab();
        observedTab = tab;
        unobserveTab = tab ? observeSize(tab, place) : () => {};
      }
      const o = context.options;
      reducedToken(context.reduced);
      indicator.style.setProperty("--neshel-indicator-duration", `${o.duration}ms`);
      indicator.style.setProperty("--neshel-indicator-easing", toCssEasing(o.easing));
      indicator.toggleAttribute("data-vertical", o.orientation === "vertical");
      if (!tab) {
        indicator.removeAttribute("data-visible");
        return;
      }
      const a = measureBox(tab);
      const b = measureBox(list);
      const x = a.x - b.x - list.clientLeft;
      const y = a.y - b.y - list.clientTop;
      const horizontal = o.orientation === "horizontal";
      indicator.style.setProperty(
        "--neshel-indicator-offset",
        `${(horizontal ? x : y).toFixed(2)}px`,
      );
      indicator.style.setProperty(
        "--neshel-indicator-size",
        (horizontal ? a.width : a.height).toFixed(2),
      );
      indicator.setAttribute("data-visible", "");
    }
    const schedule = () => {
      cancelRead ??= context.scheduler.schedule(() => {
        cancelRead = undefined;
        place();
        // Transitions start only after the first placement (no slide from the corner on load).
        if (!indicator.hasAttribute("data-ready")) {
          context.scheduler.schedule(() => {
            indicator.setAttribute("data-ready", "");
          }, "write");
        }
      }, "read");
    };
    schedule();
    const unobserveList = observeSize(list, place);
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    fonts?.addEventListener?.("loadingdone", schedule);
    const unsubscribeReduced = context.onReducedChange(() => reducedToken(context.reduced));
    return {
      update: schedule,
      destroy() {
        cancelRead?.();
        unobserveList();
        unobserveTab();
        fonts?.removeEventListener?.("loadingdone", schedule);
        unsubscribeReduced();
        indicator.remove();
        reducedToken(false);
        removeToken();
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** L09 — Content cross-fade swap (one layer of a swap; `<CrossFade>` stacks two). */
export interface CrossFadeOptions {
  /** Shown (fades in) or hidden (fades out). Default true. */
  visible?: boolean;
  /** Fade in when attached visible (default false: SSR content stays visible). */
  appear?: boolean;
  duration?: number | DurationPreset;
  easing?: Easing | EasingPreset;
  /** Called once each time the layer has faded out. */
  onHidden?: () => void;
  reducedMotion?: ReducedMotion;
}
interface ResolvedCrossFade extends ResolvedHeight {
  visible: boolean;
  appear: boolean;
  onHidden: (() => void) | undefined;
}
const fadeV = /* @__PURE__ */ validator("crossFade");

export const crossFade = /* @__PURE__ */ defineEffect<CrossFadeOptions, ResolvedCrossFade>({
  id: "layout/cross-fade",
  family: "layout",
  channels: [OPACITY],
  reducedMotion: "instant",
  resolve(input) {
    const o = fadeV.options(input);
    return {
      visible: fadeV.flag("visible", o.visible, true),
      appear: fadeV.flag("appear", o.appear, false),
      duration: fadeV.duration("duration", o.duration, 220),
      easing: fadeV.easing(o.easing, "standard"),
      onHidden: fadeV.callback("onHidden", o.onHidden),
      reducedMotion: fadeV.reducedMotion(o.reducedMotion),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const value = motionValue(context.options.visible && !context.options.appear ? 1 : 0);
    let control: MotionControl | undefined;
    let visible = context.options.visible;
    let run = 0;
    const render = (v: number) => {
      if (v >= 0.999) context.channels.opacity.clear();
      else context.channels.opacity.set(Math.round(v * 1000) / 1000);
    };
    const unsubscribeValue = value.subscribe(render);
    render(value.get());
    function go(): void {
      const id = ++run;
      control?.cancel();
      control = undefined;
      const target = visible ? 1 : 0;
      const done = () => {
        if (id === run && !visible) context.options.onHidden?.();
      };
      if (context.reduced || value.get() === target) {
        value.set(target);
        done();
        return;
      }
      const o = context.options;
      const remaining = Math.abs(target - value.get());
      const current = animateValue(
        value,
        target,
        { type: "tween", duration: o.duration * remaining, easing: o.easing },
        { reducedMotion: "never" },
      );
      control = current;
      current.finished.then((result) => {
        if (control === current) control = undefined;
        if (result.status === "completed") done();
      });
    }
    if (visible && context.options.appear) go();
    if (!visible) go();
    const unsubscribeReduced = context.onReducedChange((reduced) => {
      if (reduced && control) control.finish();
    });
    return {
      update(next) {
        if (next.visible !== visible) {
          visible = next.visible;
          go();
        }
      },
      destroy() {
        run++;
        control?.cancel();
        unsubscribeValue();
        unsubscribeReduced();
        context.channels.opacity.clear();
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------ */
/** L03 — List item enter / exit (opacity, 4 % scale and 8 px offset; siblings FLIP in a group). */
export interface ListItemOptions {
  /** Present (enters) or leaving (exits, then `onExited`). Default true. */
  present?: boolean;
  /** Animate the first appearance (default true; `<AnimatedList>` sets false for initial items). */
  appear?: boolean;
  duration?: number | DurationPreset;
  easing?: Easing | EasingPreset;
  onExited?: () => void;
  reducedMotion?: ReducedMotion;
}
interface ResolvedListItem extends ResolvedHeight {
  present: boolean;
  appear: boolean;
  onExited: (() => void) | undefined;
}
const listV = /* @__PURE__ */ validator("listItem");

export const listItem = /* @__PURE__ */ defineEffect<ListItemOptions, ResolvedListItem>({
  id: "layout/list-item",
  family: "layout",
  channels: [TRANSFORM, OPACITY],
  reducedMotion: "fade",
  resolve(input) {
    const o = listV.options(input);
    return {
      present: listV.flag("present", o.present, true),
      appear: listV.flag("appear", o.appear, true),
      duration: listV.duration("duration", o.duration, 240),
      easing: listV.easing(o.easing, "standard"),
      onExited: listV.callback("onExited", o.onExited),
      reducedMotion: listV.reducedMotion(o.reducedMotion),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const progress = motionValue(context.options.present && !context.options.appear ? 1 : 0);
    let control: MotionControl | undefined;
    let present = context.options.present;
    let run = 0;
    const render = (p: number) => {
      if (p >= 0.999) {
        context.channels.opacity.clear();
        context.channels.transform.clear();
        return;
      }
      context.channels.opacity.set(Math.round(p * 1000) / 1000);
      if (context.reduced) context.channels.transform.clear();
      else context.channels.transform.set({ scale: 0.96 + 0.04 * p, translateY: 8 * (1 - p) });
    };
    const unsubscribeValue = progress.subscribe(render);
    render(progress.get());
    function go(): void {
      const id = ++run;
      control?.cancel();
      control = undefined;
      const target = present ? 1 : 0;
      const done = () => {
        if (id === run && !present) context.options.onExited?.();
      };
      if (progress.get() === target) {
        done();
        return;
      }
      const o = context.options;
      // Continuous: an interrupted run continues from its current progress.
      const current = animateValue(
        progress,
        target,
        {
          type: "tween",
          duration: o.duration * Math.abs(target - progress.get()),
          easing: o.easing,
        },
        { reducedMotion: "never" },
      );
      control = current;
      current.finished.then((result) => {
        if (control === current) control = undefined;
        if (result.status === "completed") done();
      });
    }
    if (!present || context.options.appear) go();
    const unsubscribeReduced = context.onReducedChange(() => render(progress.get()));
    return {
      update(next) {
        if (next.present !== present) {
          present = next.present;
          go();
        }
      },
      destroy() {
        run++;
        control?.cancel();
        unsubscribeValue();
        unsubscribeReduced();
        context.channels.opacity.clear();
        context.channels.transform.clear();
      },
    };
  },
});
