/**
 * Native scroll-driven driver (contracts/scroll-engine.md §4, research R1/R2/R4). Animates ONE registered
 * custom property of an element with WAAPI and a `ScrollTimeline`/`ViewTimeline` — browser-timed, no
 * per-frame JavaScript (not a claim of compositor execution, ADR 0026) — and never `transform`/`opacity`
 * (those belong to the motion host). Ranges are strings (`"cover 0%"`; Firefox has no `CSS.percent`),
 * progress is read with `getComputedTiming()` (`currentTime` is not portable).
 *
 * Behavioural check: once the JS model of the same timeline has measured, the next read phase compares the
 * native progress with it; `null` (up to 3 frames) or a difference above 0.02 cancels the native animation
 * and hands over to the JS driver (`onFallback`).
 */
import { getFrameScheduler } from "../../core/scheduler.js";
import { counters } from "./debug.js";
import { getInternals, type ParsedEdge, progressAt, type ScrollProgress } from "./progress.js";

interface TimelineHost {
  ScrollTimeline?: new (options: { source?: Element; axis?: string }) => AnimationTimeline;
  ViewTimeline?: new (options: { subject: Element; axis?: string }) => AnimationTimeline;
  CSS?: { registerProperty?: (definition: PropertyDefinition) => void };
}

const TOLERANCE = 0.02;
const registered = new Set<string>();

export type DriverPreference = "auto" | "native" | "js";

/** Whether the APIs of the native driver exist (behaviour is checked per animation). */
export function nativeScrollAvailable(): boolean {
  const host = globalThis as TimelineHost;
  return (
    typeof host.ScrollTimeline === "function" &&
    typeof host.ViewTimeline === "function" &&
    typeof host.CSS?.registerProperty === "function" &&
    typeof Element !== "undefined" &&
    typeof Element.prototype.animate === "function"
  );
}

/** Register a custom property once (an existing registration, e.g. from scroll.css, is kept). */
export function registerScrollProperty(name: string, syntax = "<number>", initial = "0"): void {
  if (registered.has(name)) return;
  registered.add(name);
  try {
    (globalThis as TimelineHost).CSS?.registerProperty?.({
      name,
      syntax,
      inherits: true,
      initialValue: initial,
    });
  } catch {
    // Already registered (InvalidModificationError): keep the existing definition.
  }
}

const edgeString = (edge: ParsedEdge): string | undefined =>
  edge.kind === "named" ? `${edge.name} ${edge.percent}%` : undefined;

/** Whether a timeline can be expressed natively (named view ranges, or the full scroll range). */
export function expressible(progress: ScrollProgress): boolean {
  const info = getInternals(progress);
  if (!info || info.smooth) return false;
  const [a, b] = info.range;
  if (info.subject) return a.kind === "named" && b.kind === "named";
  const startsAtZero = (a.kind === "percent" && a.percent === 0) || (a.kind === "px" && a.px === 0);
  return startsAtZero && b.kind === "percent" && b.percent === 100;
}

export interface NativeBinding {
  cancel(): void;
}

/**
 * Start a native animation of `property` from `from` to `to` along `progress`'s timeline. Returns
 * `undefined` when native is unavailable or not expressible (the caller uses the JS driver).
 */
export function bindNative(
  element: Element,
  property: string,
  progress: ScrollProgress,
  values: readonly [string, string],
  onFallback: () => void,
): NativeBinding | undefined {
  const found = getInternals(progress);
  if (!found || !nativeScrollAvailable() || !expressible(progress)) return undefined;
  const info = found;
  const host = globalThis as unknown as Required<TimelineHost>;
  let animation: Animation | undefined;
  try {
    registerScrollProperty(property);
    const timeline = info.subject
      ? new host.ViewTimeline({ subject: info.subject, axis: info.axis })
      : new host.ScrollTimeline({
          source: info.sourceElement ?? document.documentElement,
          axis: info.axis,
        });
    const options: KeyframeAnimationOptions & { rangeStart?: string; rangeEnd?: string } = {
      timeline,
      fill: "both",
    };
    const start = edgeString(info.range[0]);
    const end = edgeString(info.range[1]);
    if (start) options.rangeStart = start;
    if (end) options.rangeEnd = end;
    animation = element.animate(
      { [property]: [values[0], values[1]] } as Keyframe[] & PropertyIndexedKeyframes,
      options,
    );
  } catch {
    animation?.cancel();
    return undefined;
  }
  counters.nativeAnimations++;
  let cancelled = false;
  let attempts = 0;
  let remeasured = false;
  let checkTask: (() => void) | undefined;

  function cancel(): void {
    if (cancelled) return;
    cancelled = true;
    counters.nativeAnimations--;
    stopCheck();
    animation?.cancel();
  }

  function check(): boolean {
    if (cancelled) return false;
    const native = animation?.effect?.getComputedTiming().progress;
    if ((native === null || native === undefined) && ++attempts < 3) return true;
    checkTask = undefined;
    // Compare at the current position (the user may have scrolled since the last update).
    info.source.readPosition();
    const g = progress.geometry;
    const expected = progressAt(info.source.position[info.axis], g.start, g.end);
    const mismatch =
      native === null || native === undefined || Math.abs(native - expected) > TOLERANCE;
    if (mismatch && !remeasured) {
      // The JS model may be the stale side (a change no observer reported yet): re-measure once and
      // compare again after the next update before deciding.
      remeasured = true;
      attempts = 0;
      progress.refresh();
      return false;
    }
    if (mismatch) {
      cancel();
      counters.nativeFallbacks++;
      counters.lastFallback = { native: native ?? null, expected, property };
      onFallback();
      return false;
    }
    stopCheck(); // verified
    return false;
  }

  // Wait for the JS model's first measurement, then compare in the next read phase.
  let stopUpdates: (() => void) | undefined = info.onUpdate(() => {
    if (checkTask || cancelled) return;
    checkTask = getFrameScheduler().schedule(check, "read");
  });
  function stopCheck(): void {
    stopUpdates?.();
    stopUpdates = undefined;
    checkTask?.();
    checkTask = undefined;
  }

  return { cancel };
}
