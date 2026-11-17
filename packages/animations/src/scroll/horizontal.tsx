"use client";
/**
 * SP04 — horizontal scroll section (Phase 011; contracts/accessibility-011.md §2–§3, research R7).
 *
 * Structure (package-rendered): `section.neshel-hscroll > div.neshel-hscroll-stage > div.neshel-hscroll-track`.
 * Layouts (`data-neshel-hscroll`):
 * - `scroll` — server markup and fallback: the stage is a native horizontal scroller (keyboard, touch and
 *   wheel work as the browser defines; nothing pinned);
 * - `pinned` — the section is `100vh + distance` tall, the stage is CSS-sticky and the track moves
 *   `translateX(−progress · distance)` through the motion host while the page scrolls vertically;
 * - `stacked` — the cards are laid out vertically (reduced motion for `auto`/`pinned`, or
 *   `layout="stacked"`).
 *
 * `distance` (track overflow) is measured only in geometry passes and written to the section through its
 * motion host (captured and restored; the consumer's inline value survives unmount). Focus entering an off-screen card resets the clipped stage's `scrollLeft` and scrolls the
 * document to the vertical position that shows the card — the only scroll write in the engine, caused by
 * focus, never by wheel or keys.
 */
import {
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { attachEffect, defineEffect, type EffectHandle } from "../core/effect.js";
import { prefersReducedMotion, subscribeReducedMotion } from "../core/reduced-motion.js";
import { joinClass, useHostRef } from "../react/motion-host.js";
import { invalidate, type Measurable, registerGeometry } from "./engine/geometry.js";
import { createScrollProgress, type ScrollProgress } from "./engine/progress.js";
import { getScrollSource } from "./engine/source.js";
import { roundTo } from "./shared.js";

export type HorizontalLayout = "auto" | "pinned" | "stacked" | "scroll";

export interface HorizontalScrollProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /**
   * `"auto"` (default) and `"pinned"`: pinned when the track overflows (else a native scroller), stacked
   * whenever motion is reduced (live). `"stacked"`: always vertical. `"scroll"`: always a native
   * horizontal scroller (user-driven, kept under reduced motion).
   */
  layout?: HorizontalLayout;
  /** Accessible name of the region (recommended). */
  label?: string;
  trackClassName?: string;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

interface TrackOptions {
  timeline: ScrollProgress;
  distance: () => number;
}

/** Internal: the track's transform layer (package-owned element, written through its host). */
const horizontalTrack = /* @__PURE__ */ defineEffect<TrackOptions, TrackOptions>({
  id: "scroll/horizontal-track",
  family: "scroll",
  channels: [{ channel: "transform", mode: "compose" }],
  reducedMotion: "static",
  resolve: (options) => options as TrackOptions,
  setup(context) {
    const o = context.options;
    const draw = (p: number) => {
      const x = roundTo(-p * o.distance());
      if (x === 0) context.channels.transform.clear();
      else context.channels.transform.set({ translateX: x });
    };
    const unsubscribe = o.timeline.subscribe(draw);
    return {
      update() {
        draw(o.timeline.get());
      },
      destroy() {
        unsubscribe();
        context.channels.transform.clear();
      },
    };
  },
});

/**
 * Internal: the section's `--neshel-hscroll-distance`, written through the section's motion host
 * (ADR 0022 style ownership): the consumer's inline value and priority are captured and restored on
 * release; an external edit while mounted becomes the baseline to restore (the engine keeps writing the
 * measured value, which the pinned height needs).
 */
const horizontalDistance = /* @__PURE__ */ defineEffect<{ distance: number }, { distance: number }>(
  {
    id: "scroll/horizontal-distance",
    family: "scroll",
    channels: [{ channel: "--neshel-hscroll-distance", mode: "exclusive" }],
    reducedMotion: "instant",
    resolve: (options) => options as { distance: number },
    setup(context) {
      const channel = context.channels.exclusive("--neshel-hscroll-distance");
      const write = (options: { distance: number }) => channel.set(`${options.distance}px`);
      write(context.options);
      return { update: write, destroy: () => channel.clear() };
    },
  },
);

export function HorizontalScroll({
  layout = "auto",
  label,
  trackClassName,
  className,
  style,
  ref,
  children,
  onFocus,
  ...rest
}: HorizontalScrollProps) {
  const [section, setRef] = useHostRef<HTMLElement>(ref);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<ScrollProgress | undefined>(undefined);
  const distanceRef = useRef(0);
  const [reduced, setReduced] = useState(false);
  const [overflow, setOverflow] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReduced(prefersReducedMotion());
    return subscribeReducedMotion(setReduced);
  }, []);

  // Reduced motion replaces scroll-linked travel (auto and explicit pinned) with the vertical layout;
  // `scroll` (user-driven native scroller) and `stacked` have no scroll-linked motion to reduce.
  const mode: Exclude<HorizontalLayout, "auto"> = !mounted
    ? "scroll"
    : layout === "auto" || layout === "pinned"
      ? reduced
        ? "stacked"
        : overflow
          ? "pinned"
          : "scroll"
      : layout;

  // Measure the track overflow (geometry passes only) in every mode, so a layout switch is informed.
  useLayoutEffect(() => {
    const sectionElement = section.current;
    const stageElement = stage.current;
    const trackElement = track.current;
    if (!sectionElement || !stageElement || !trackElement) return;
    let distanceHandle: EffectHandle<{ distance: number }> | undefined;
    const item: Measurable = {
      source: getScrollSource(null),
      targets: () => [stageElement, trackElement, ...trackElement.children],
      ancestors: () => [trackElement],
      measure() {
        distanceRef.current = Math.max(0, trackElement.scrollWidth - stageElement.clientWidth);
      },
      measured() {
        const distance = distanceRef.current;
        // The host writes in the write phase; the first measurement claims the variable.
        if (distanceHandle) distanceHandle.update({ distance });
        else distanceHandle = attachEffect(sectionElement, horizontalDistance, { distance });
        setOverflow(distance > 1);
      },
    };
    const unregister = registerGeometry(item);
    return () => {
      unregister();
      distanceHandle?.destroy(); // restores the consumer's value (or removes ours)
    };
  }, [section]);

  // Pinned: progress over the section's pinned span drives the track.
  useLayoutEffect(() => {
    const sectionElement = section.current;
    const trackElement = track.current as (HTMLDivElement & { style: CSSStyleDeclaration }) | null;
    if (mode !== "pinned" || !sectionElement || !trackElement) return;
    const timeline = createScrollProgress({
      subject: sectionElement,
      range: ["contain 0%", "contain 100%"],
    });
    timelineRef.current = timeline;
    const handle = attachEffect(trackElement, horizontalTrack, {
      timeline,
      distance: () => distanceRef.current,
    });
    const stopRemeasure = timeline.subscribe(() => {}); // keep following while pinned
    invalidate();
    return () => {
      stopRemeasure();
      handle.destroy();
      timeline.destroy();
      timelineRef.current = undefined;
    };
  }, [section, mode]);

  // Some engines scroll the clipped stage to reveal focus after the focus event: the track position is
  // ours, so a pinned stage is always reset (it cannot be scrolled by the user: overflow is hidden).
  useEffect(() => {
    const stageElement = stage.current;
    if (mode !== "pinned" || !stageElement) return;
    const reset = () => {
      if (stageElement.scrollLeft !== 0) stageElement.scrollLeft = 0;
    };
    reset();
    stageElement.addEventListener("scroll", reset, { passive: true });
    return () => stageElement.removeEventListener("scroll", reset);
  }, [mode]);

  function handleFocus(event: FocusEvent<HTMLElement>): void {
    onFocus?.(event);
    const timeline = timelineRef.current;
    const stageElement = stage.current;
    const trackElement = track.current;
    if (mode !== "pinned" || !timeline || !stageElement || !trackElement) return;
    // Browsers scroll clipped overflow to reveal focus; the track position is ours.
    stageElement.scrollLeft = 0;
    let card = event.target as HTMLElement | null;
    while (card && card.parentElement !== trackElement) card = card.parentElement;
    if (!card) return;
    const distance = distanceRef.current;
    if (distance <= 0) return;
    const current = timeline.getRaw() * distance;
    const visible =
      card.offsetLeft >= current &&
      card.offsetLeft + card.offsetWidth <= current + stageElement.clientWidth;
    if (visible) return;
    const target = Math.min(1, Math.max(0, card.offsetLeft / distance));
    const { start, end } = timeline.geometry;
    window.scrollTo({ top: start + target * (end - start), behavior: "instant" });
  }

  return (
    <section
      {...rest}
      ref={setRef}
      role={label ? "region" : rest.role}
      aria-label={label ?? rest["aria-label"]}
      data-neshel-hscroll={mode}
      className={joinClass("neshel-hscroll", className)}
      style={style as CSSProperties}
      onFocus={handleFocus}
    >
      <div ref={stage} className="neshel-hscroll-stage">
        <div ref={track} className={joinClass("neshel-hscroll-track", trackClassName)}>
          {children}
        </div>
      </div>
    </section>
  );
}
