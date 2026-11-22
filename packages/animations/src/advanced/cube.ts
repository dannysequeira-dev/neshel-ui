/**
 * D02 cube rotation (catalogue §15; contracts/advanced-api.md, research R6). Panels are the root's element children
 * stacked in one grid cell (`.neshel-cube > *`, `advanced.css`). A transition rotates two faces of a cube about an
 * axis `d` px behind them (`d` = half the root's width for axis `y`, half its height for axis `x`, cached from a
 * ResizeObserver box — no layout read per frame): the outgoing face to ∓90°, the incoming face from ±90° to 0°, each
 * through a Motion Host transform layer. Only the logical active panel is interactive; every other panel is `inert`
 * + `aria-hidden` and non-participating panels are `visibility: hidden`. The 014 progress driver gives seek,
 * reverse, finish, cancel, `track()` and `drive()`. Interruptions: `go()` back to the origin reverses the running
 * transition; another target waits for the running one to settle (only the newest target is kept). Reduced motion:
 * cross-fade.
 */
import { createAttributeLedger, moveFocusIfInside, setHidden } from "../core/attributes.js";
import { type ChannelWriter, createChannelWriter } from "../core/channel.js";
import type { MotionResult } from "../core/controls.js";
import type { Easing, EasingPreset } from "../core/easing.js";
import { type Axis3D, orbitLayer } from "../core/geometry-3d.js";
import { getMotionHost } from "../core/host.js";
import { createProgressDriver, type ProgressControl } from "../core/progress-driver.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../core/reduced-motion.js";
import { getFrameScheduler } from "../core/scheduler.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";

export interface CubeRotateOptions {
  axis?: Axis3D;
  /** Initial panel (default 0). */
  index?: number;
  /** ms 0–10000 (default 700). */
  duration?: number;
  easing?: Easing | EasingPreset;
  /** px 200–6000 (default 1600). */
  perspective?: number;
  /** Wrap around at the ends (default true). */
  loop?: boolean;
  reducedMotion?: ReducedMotion;
  onChange?(index: number): void;
}

export interface CubeControl extends Omit<ProgressControl, "destroy"> {
  /** Logical active panel. */
  readonly index: number;
  readonly count: number;
  readonly mode: "3d" | "fade";
  go(index: number, options?: { direction?: 1 | -1 }): void;
  next(): void;
  previous(): void;
  /** Re-read the panels (children changed). */
  refresh(): void;
  destroy(): void;
}

interface Panel {
  element: HTMLElement;
  writer: ChannelWriter;
  key: symbol;
}

export function createCubeRotate(root: HTMLElement, options: CubeRotateOptions = {}): CubeControl {
  const v = validator("createCubeRotate");
  if (!root || root.nodeType !== 1) v.fail('"root" must be an element.');
  const o = v.options(options);
  const axis = v.oneOf("axis", o.axis, ["y", "x"], "y");
  const duration = v.duration("duration", o.duration, 700);
  const easing = o.easing === undefined ? "standard" : v.easing(o.easing);
  const perspective = v.number("perspective", o.perspective, 1600, 200, 6000);
  const loop = v.flag("loop", o.loop, true);
  const policy = v.reducedMotion(o.reducedMotion);
  const onChange = v.callback<(index: number) => void>("onChange", o.onChange);

  const ledger = createAttributeLedger();
  const rootWriter = createChannelWriter(root, ["perspective"], { id: "advanced/cube" });
  let panels: Panel[] = [];
  let systemReduced = prefersReducedMotion();
  const reduced = () => shouldReduceMotion(policy, systemReduced);
  let size = { w: root.clientWidth, h: root.clientHeight };
  let index = 0;
  let transition: { from: number; to: number; dir: 1 | -1 } | undefined;
  let pending: { to: number; dir: 1 | -1 } | undefined;
  let destroyed = false;
  counters.effects++;

  const depth = () => (axis === "y" ? size.w : size.h) / 2;
  const fade = () => reduced();

  function readPanels(): void {
    const elements = [...root.children].filter((c): c is HTMLElement => c.nodeType === 1);
    const kept: Panel[] = [];
    for (const element of elements) {
      const existing = panels.find((p) => p.element === element);
      kept.push(
        existing ?? {
          element,
          writer: createChannelWriter(element, ["backface-visibility", "visibility"], {
            id: "advanced/cube",
          }),
          key: Symbol("advanced/cube"),
        },
      );
    }
    for (const old of panels) if (!kept.includes(old)) releasePanel(old);
    panels = kept;
  }
  function releasePanel(panel: Panel): void {
    const host = getMotionHost(panel.element);
    host.setLayer(panel.key, undefined);
    host.setOpacity(panel.key, undefined);
    panel.writer.release();
    ledger.restoreElement(panel.element);
  }

  readPanels();
  if (panels.length === 0) v.fail("the root has no panels (element children).");
  index = Math.min(
    panels.length - 1,
    Math.max(0, Math.round(v.number("index", o.index, 0, 0, 1e6))),
  );

  function layout(p: number): void {
    if (destroyed) return;
    const from = transition?.from ?? index;
    const to = transition?.to ?? index;
    const dir = transition?.dir ?? 1;
    const d = depth();
    panels.forEach((panel, i) => {
      const host = getMotionHost(panel.element);
      const participating = i === from || i === to;
      panel.writer.set("visibility", participating ? undefined : "hidden");
      if (!participating) {
        host.setLayer(panel.key, undefined);
        host.setOpacity(panel.key, undefined);
        return;
      }
      if (fade() || from === to) {
        host.setLayer(panel.key, undefined);
        panel.writer.set("backface-visibility", undefined);
        host.setOpacity(panel.key, from === to ? undefined : i === to ? p : 1 - p);
        return;
      }
      host.setOpacity(panel.key, undefined);
      panel.writer.set("backface-visibility", "hidden");
      const deg =
        i === from
          ? (axis === "y" ? -1 : 1) * p * 90 * dir
          : (axis === "y" ? 1 : -1) * (1 - p) * 90 * dir;
      host.setLayer(panel.key, Math.abs(deg) < 1e-3 ? undefined : orbitLayer(axis, deg, d));
    });
  }

  function syncAccessibility(): void {
    panels.forEach((panel, i) => {
      setHidden(ledger, panel.element, i !== index);
    });
  }

  const driver = createProgressDriver({
    duration,
    easing,
    reducedMotion: "never", // reduced motion renders a cross-fade instead of jumping (catalogue "fade")
    render: (p) => layout(p),
  });

  /** Settlement of ONE transition (a late promise of an earlier transition is ignored). */
  function settled(owner: typeof transition, result: MotionResult): void {
    if (destroyed || !owner || transition !== owner) return;
    if (result.status === "interrupted") return;
    // Completed at 1 → target; completed in reverse (0) or cancelled → the nearer panel.
    const settledIndex = driver.progress >= 0.5 ? owner.to : owner.from;
    transition = undefined;
    if (settledIndex !== index) {
      index = settledIndex;
      syncAccessibility();
      onChange?.(index);
    }
    driver.jump(0);
    layout(0);
    if (pending) {
      const next = pending;
      pending = undefined;
      start(next.to, next.dir);
    }
  }

  function start(to: number, dir: 1 | -1): void {
    if (to === index) return;
    const outgoing = panels[index]?.element;
    transition = { from: index, to, dir };
    const incoming = panels[to]?.element;
    if (outgoing && incoming) {
      setHidden(ledger, incoming, false);
      moveFocusIfInside(ledger, outgoing, incoming);
    }
    index = to; // the target is the logical active panel from the start
    syncAccessibility();
    onChange?.(index);
    driver.jump(0);
    layout(0);
    const owner = transition;
    if (duration === 0) driver.finish();
    else driver.play();
    driver.finished.then(
      (result) => settled(owner, result),
      () => {},
    );
  }

  const wrap = (i: number) => {
    const n = panels.length;
    return loop ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i));
  };

  rootWriter.set("perspective", `${perspective}px`);
  syncAccessibility();
  layout(0);

  const cleanups: Array<() => void> = [];
  if (typeof ResizeObserver === "function") {
    let cancel: (() => void) | undefined;
    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      if (!box) return;
      // Apply in the write phase (never inside the observer callback).
      cancel ??= getFrameScheduler().schedule(() => {
        cancel = undefined;
        if (Math.abs(box.width - size.w) < 1 && Math.abs(box.height - size.h) < 1) return;
        size = { w: box.width, h: box.height };
        layout(driver.progress);
      }, "write");
    });
    observer.observe(root);
    counters.observers++;
    cleanups.push(() => {
      cancel?.();
      observer.disconnect();
      counters.observers--;
    });
  }
  cleanups.push(
    subscribeReducedMotion((value) => {
      systemReduced = value;
      layout(driver.progress);
    }),
  );

  const control: CubeControl = {
    get state() {
      return driver.state;
    },
    get progress() {
      return driver.progress;
    },
    get finished() {
      return driver.finished;
    },
    get index() {
      return index;
    },
    get count() {
      return panels.length;
    },
    get mode() {
      return fade() ? "fade" : "3d";
    },
    play: () => driver.play(),
    pause: () => driver.pause(),
    reverse() {
      if (!transition) return;
      // The logical active panel follows the direction of travel.
      const { from, to } = transition;
      index = driver.state === "running" && index === to ? from : to;
      syncAccessibility();
      driver.reverse();
    },
    finish: () => driver.finish(),
    cancel: () => driver.cancel(),
    seek: (p) => driver.seek(p),
    track: (trackOptions) => driver.track(trackOptions),
    drive: (source) => driver.drive(source),
    go(target, goOptions = {}) {
      if (destroyed) return;
      const to = wrap(Math.round(target));
      const n = panels.length;
      const forward = (to - index + n) % n <= n / 2;
      const dir = goOptions.direction ?? (forward ? 1 : -1);
      if (transition && driver.state === "running") {
        if (to === transition.from) {
          // Back to the origin: reverse from the current angle (no jump).
          index = transition.from;
          syncAccessibility();
          onChange?.(index);
          driver.reverse();
          pending = undefined;
          return;
        }
        if (to === transition.to) return;
        pending = { to, dir };
        return;
      }
      start(to, dir);
    },
    next() {
      control.go((pending?.to ?? transition?.to ?? index) + 1, { direction: 1 });
    },
    previous() {
      control.go((pending?.to ?? transition?.to ?? index) - 1, { direction: -1 });
    },
    refresh() {
      if (destroyed) return;
      const current = panels[index]?.element;
      readPanels();
      const found = panels.findIndex((p) => p.element === current);
      index = found >= 0 ? found : Math.min(index, panels.length - 1);
      transition = undefined;
      pending = undefined;
      driver.jump(0);
      syncAccessibility();
      layout(0);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      driver.destroy();
      for (const fn of cleanups.splice(0).reverse()) fn();
      for (const panel of panels) releasePanel(panel);
      panels = [];
      rootWriter.release();
      ledger.restore();
      counters.effects--;
    },
  };
  return control;
}
