/**
 * C09 — Autoplay storyboard with pause/stop controls (catalogue §7, structure G; contracts/cinematic-api.md,
 * research R9, WCAG 2.2.2).
 *
 * Frames are the consumer's elements; one is current. A frame change is a short C01 timeline of pose tracks
 * on the outgoing and incoming frames (fade, or slide by direction). Autoplay is opt-in and advances with a
 * timer only while ALL hold: the user has not paused, motion is not reduced, the storyboard is at least half
 * visible (IntersectionObserver), the page is visible, and neither pointer hover nor keyboard focus is
 * inside it. A user pause is sticky until `play()`. The scheduler is idle between frame changes.
 *
 * Without JavaScript every frame is visible (a list). With the engine, non-current frames get `inert` and
 * `aria-hidden` and the root gets `data-neshel-storyboard` (CSS stacks the frames).
 */
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";
import type { Styled } from "./engine/pose.js";
import { createTimeline, type Timeline } from "./engine/timeline.js";

export interface StoryboardOptions {
  /** ms per frame while autoplaying (2000–30000, default 5000). */
  interval?: number;
  /** Start rotating automatically (default false; never under reduced motion). */
  autoplay?: boolean;
  /** Wrap from the last frame to the first (default true). */
  loop?: boolean;
  /** Frame change (default `"fade"`). */
  transition?: "fade" | "slide";
  /** ms of a frame change (0–2000, default 450). */
  duration?: number;
  /** Initial frame (default 0). */
  start?: number;
  reducedMotion?: ReducedMotion;
  onChange?(index: number, cause: "user" | "autoplay"): void;
  onPlayingChange?(playing: boolean): void;
}

export interface Storyboard {
  readonly index: number;
  readonly count: number;
  /** The user's intent (not paused by hover/visibility). */
  readonly playing: boolean;
  /** Whether the timer is actually running now. */
  readonly rotating: boolean;
  play(): void;
  pause(): void;
  /** Pause and return to the first frame. */
  stop(): void;
  next(): void;
  previous(): void;
  goTo(index: number): void;
  destroy(): void;
}

const v = /* @__PURE__ */ validator("createStoryboard");

export function createStoryboard(
  root: HTMLElement,
  frames: readonly HTMLElement[],
  options: StoryboardOptions = {},
): Storyboard {
  const o = v.options(options);
  const interval = v.number("interval", o.interval, 5000, 2000, 30000);
  const loop = v.flag("loop", o.loop, true);
  const transition = v.oneOf("transition", o.transition, ["fade", "slide"] as const, "fade");
  const duration = v.number("duration", o.duration, 450, 0, 2000);
  const policy = v.reducedMotion(o.reducedMotion);
  const onChange = v.callback<(index: number, cause: "user" | "autoplay") => void>(
    "onChange",
    o.onChange,
  );
  const onPlayingChange = v.callback<(playing: boolean) => void>(
    "onPlayingChange",
    o.onPlayingChange,
  );
  if (!root?.ownerDocument) v.fail('"root" must be an element.');
  if (!Array.isArray(frames) || frames.length === 0) v.fail('"frames" must be a non-empty array.');
  const count = frames.length;
  let index = Math.round(v.number("start", o.start, 0, 0, count - 1));
  const reduced = () => shouldReduceMotion(policy, prefersReducedMotion());
  let playing = v.flag("autoplay", o.autoplay, false) && !reduced();
  let visible = true;
  let hovered = false;
  let focused = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let remaining = interval;
  let startedAt = 0;
  let change: Timeline | undefined;
  let destroyed = false;

  const hadRootAttribute = root.getAttribute("data-neshel-storyboard");
  root.setAttribute("data-neshel-storyboard", "");
  const saved = frames.map((frame) => ({
    inert: frame.getAttribute("inert"),
    hidden: frame.getAttribute("aria-hidden"),
  }));

  function present(current: number): void {
    for (const [i, frame] of frames.entries()) {
      if (i === current) {
        frame.removeAttribute("inert");
        frame.removeAttribute("aria-hidden");
        frame.setAttribute("data-current", "");
      } else {
        frame.setAttribute("inert", "");
        frame.setAttribute("aria-hidden", "true");
        frame.removeAttribute("data-current");
      }
    }
  }
  present(index);

  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const pageVisible = () => typeof document === "undefined" || !document.hidden;
  const shouldRotate = () =>
    playing && !reduced() && visible && pageVisible() && !hovered && !focused && !destroyed;

  function clearTimer(): void {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
    remaining = Math.max(0, remaining - (now() - startedAt));
  }

  function sync(): void {
    if (shouldRotate()) {
      if (timer !== undefined) return;
      startedAt = now();
      timer = setTimeout(() => {
        timer = undefined;
        remaining = interval;
        if (!shouldRotate()) return;
        const next = index + 1;
        if (next >= count && !loop) {
          setPlaying(false);
          return;
        }
        show(next % count, "autoplay", 1);
        sync();
      }, remaining);
    } else clearTimer();
  }

  function setPlaying(next: boolean): void {
    if (playing === next) return;
    playing = next;
    onPlayingChange?.(next);
  }

  function show(next: number, cause: "user" | "autoplay", direction: 1 | -1): void {
    if (destroyed || next === index) return;
    const outgoing = frames[index] as Styled;
    const incoming = frames[next] as Styled;
    change?.destroy();
    change = undefined;
    index = next;
    present(index);
    onChange?.(index, cause);
    if (reduced() || duration === 0) return; // off: instant frame change
    outgoing.setAttribute("data-leaving", "");
    const travel = transition === "slide" ? 48 * direction : 0;
    const timeline = createTimeline({
      onComplete: () => {
        outgoing.removeAttribute("data-leaving");
        timeline.destroy();
        if (change === timeline) change = undefined;
      },
    });
    timeline.add({
      target: outgoing,
      from: {},
      to: { opacity: 0, x: -travel },
      duration,
      easing: "accelerate",
    });
    timeline.add(
      { target: incoming, from: { opacity: 0, x: travel }, to: {}, duration, easing: "decelerate" },
      "<",
    );
    change = timeline;
    timeline.play();
    void timeline.finished.then((result) => {
      if (result.status !== "completed") outgoing.removeAttribute("data-leaving");
    });
  }

  const onEnter = () => {
    hovered = true;
    sync();
  };
  const onLeave = () => {
    hovered = false;
    sync();
  };
  const onFocusIn = () => {
    focused = true;
    sync();
  };
  const onFocusOut = (event: FocusEvent) => {
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    focused = false;
    sync();
  };
  const onVisibility = () => sync();
  root.addEventListener("pointerenter", onEnter);
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
  const unsubscribeReduced = subscribeReducedMotion(() => {
    if (reduced()) {
      change?.finish();
      setPlaying(false);
    }
    sync();
  });
  let observer: IntersectionObserver | undefined;
  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible = entry.intersectionRatio >= 0.5;
        sync();
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(root);
    counters.observers++;
  }
  sync();

  const go = (next: number, direction: 1 | -1) => {
    remaining = interval;
    clearTimer();
    show(next, "user", direction);
    sync();
  };

  return {
    get index() {
      return index;
    },
    count,
    get playing() {
      return playing;
    },
    get rotating() {
      return timer !== undefined;
    },
    play() {
      if (destroyed || reduced()) return;
      setPlaying(true);
      sync();
    },
    pause() {
      setPlaying(false);
      sync();
    },
    stop() {
      setPlaying(false);
      remaining = interval;
      clearTimer();
      if (index !== 0) show(0, "user", -1);
    },
    next() {
      const next = index + 1;
      if (next >= count && !loop) return;
      go(next % count, 1);
    },
    previous() {
      const previous = index - 1;
      if (previous < 0 && !loop) return;
      go((previous + count) % count, -1);
    },
    goTo(target) {
      if (!Number.isInteger(target) || target < 0 || target >= count) {
        v.fail(`goTo: invalid frame ${String(target)}.`);
      }
      go(target, target > index ? 1 : -1);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimer();
      change?.destroy();
      unsubscribeReduced();
      observer?.disconnect();
      if (observer) counters.observers = Math.max(0, counters.observers - 1);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      for (const [i, frame] of frames.entries()) {
        const before = saved[i] as { inert: string | null; hidden: string | null };
        if (before.inert === null) frame.removeAttribute("inert");
        else frame.setAttribute("inert", before.inert);
        if (before.hidden === null) frame.removeAttribute("aria-hidden");
        else frame.setAttribute("aria-hidden", before.hidden);
        frame.removeAttribute("data-current");
        frame.removeAttribute("data-leaving");
      }
      if (hadRootAttribute === null) root.removeAttribute("data-neshel-storyboard");
      else root.setAttribute("data-neshel-storyboard", hadRootAttribute);
    },
  };
}
