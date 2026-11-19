"use client";
/**
 * `useTimeline` (C01 React binding; contracts/timeline-engine.md §6). The timeline is created in a layout
 * effect (client only), built with the current refs, destroyed on cleanup or when `deps` change — StrictMode
 * safe — and reached through a stable handle that forwards to the live timeline. No React state changes:
 * zero renders per frame and none on creation. On the server the handle is inert.
 */
import { type DependencyList, useLayoutEffect, useRef } from "react";
import type { MotionResult } from "../core/controls.js";
import { createTimeline, type Timeline, type TimelineOptions } from "./engine/timeline.js";

export interface TimelineHandle {
  /** The live timeline (`undefined` before mount, after unmount and on the server). */
  readonly current: Timeline | undefined;
  play(): void;
  pause(): void;
  reverse(): void;
  finish(): void;
  cancel(): void;
  seek(progress: number): void;
  seekTo(at: number | string, options?: { fire?: boolean }): void;
  /** Resolves with the live run's result (`undefined` when no timeline exists). */
  finished(): Promise<MotionResult | undefined>;
}

const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

export function useTimeline(
  build: (timeline: Timeline) => void,
  deps: DependencyList = [],
  options?: TimelineOptions & { autoplay?: boolean },
): TimelineHandle {
  const live = useRef<Timeline | undefined>(undefined);
  const latest = useRef({ build, options });
  latest.current = { build, options };
  const handle = useRef<TimelineHandle | null>(null);
  handle.current ??= {
    get current() {
      return live.current;
    },
    play: () => live.current?.play(),
    pause: () => live.current?.pause(),
    reverse: () => live.current?.reverse(),
    finish: () => live.current?.finish(),
    cancel: () => live.current?.cancel(),
    seek: (progress) => live.current?.seek(progress),
    seekTo: (at, seekOptions) => live.current?.seekTo(at, seekOptions),
    finished: () => (live.current ? live.current.finished : Promise.resolve(undefined)),
  };

  useClientLayoutEffect(() => {
    const { build: currentBuild, options: currentOptions } = latest.current;
    const { autoplay, ...timelineOptions } = currentOptions ?? {};
    const timeline = createTimeline(timelineOptions);
    live.current = timeline;
    try {
      currentBuild(timeline);
    } catch (error) {
      timeline.destroy();
      live.current = undefined;
      throw error;
    }
    if (autoplay) timeline.play();
    return () => {
      timeline.destroy();
      if (live.current === timeline) live.current = undefined;
    };
  }, deps);

  return handle.current;
}
