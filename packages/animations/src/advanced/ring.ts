/**
 * D03 3D ring carousel (catalogue §15; contracts/advanced-api.md, research R7). N items (the root's element children,
 * stacked by `.neshel-ring > *`) sit on a circle: item i is the Motion Host layer of a plane rotated by
 * `i·360°/N − θ` about an axis `r` px behind it, so the front item stays at z = 0. `r` comes from the cached item
 * width (ResizeObserver) or the `radius` option. One spring advances θ toward the target with the shortest path
 * (targets accumulate, so rapid navigation retargets instead of spinning back). `preserve-3d` + `perspective` on the
 * root give depth order; a z-index from cos(angle) is written as a backup. Only the front item is interactive (every
 * other item `inert` + `aria-hidden`, so nothing behind the perspective can take focus); DOM order stays the reading
 * order. Keyboard on the focusable root; drag through the 012 pointer session with `touch-action: pan-y`.
 */
import { createAttributeLedger, setHidden } from "../core/attributes.js";
import { type ChannelWriter, createChannelWriter } from "../core/channel.js";
import { isProduction } from "../core/dev.js";
import { orbitLayer, ringRadius, ringRelative, shortestRingTarget } from "../core/geometry-3d.js";
import { getMotionHost } from "../core/host.js";
import { subscribePointerSession } from "../core/pointer-session.js";
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

export interface RingCarouselOptions {
  index?: number;
  /** `"auto"` (from the item width) or px 50–4000. */
  radius?: "auto" | number;
  /** px 0–400 between items (auto radius; default 24). */
  gap?: number;
  /** px 200–6000 (default 1400). */
  perspective?: number;
  spring?: SpringOptions;
  keyboard?: boolean;
  drag?: boolean;
  /** Accessible name of the carousel (required unless the root is labelled). */
  label?: string;
  /** Text of the live announcement (default "Slide n of N"). */
  announce?(index: number, count: number): string;
  reducedMotion?: ReducedMotion;
  onChange?(index: number): void;
}

export interface RingControl {
  readonly index: number;
  readonly count: number;
  /** Current ring angle (deg). */
  readonly angle: number;
  go(index: number): void;
  next(): void;
  previous(): void;
  refresh(): void;
  destroy(): void;
}

interface Item {
  element: HTMLElement;
  writer: ChannelWriter;
  key: symbol;
}

export function createRingCarousel(
  root: HTMLElement,
  options: RingCarouselOptions = {},
): RingControl {
  const v = validator("createRingCarousel");
  if (!root || root.nodeType !== 1) v.fail('"root" must be an element.');
  const o = v.options(options);
  const radiusOption =
    o.radius === undefined || o.radius === "auto"
      ? "auto"
      : v.number("radius", o.radius, 400, 50, 4000);
  const gap = v.number("gap", o.gap, 24, 0, 400);
  const perspective = v.number("perspective", o.perspective, 1400, 200, 6000);
  const spring = v.spring(o.spring, { stiffness: 120, damping: 20 });
  const keyboard = v.flag("keyboard", o.keyboard, true);
  const drag = v.flag("drag", o.drag, true);
  const policy = v.reducedMotion(o.reducedMotion);
  const onChange = v.callback<(index: number) => void>("onChange", o.onChange);
  const announceText =
    v.callback<(i: number, n: number) => string>("announce", o.announce) ??
    ((i: number, n: number) => `Slide ${i + 1} of ${n}`);
  if (o.label !== undefined && (typeof o.label !== "string" || !o.label.trim()))
    v.fail('"label" must be a non-empty string.');
  if (
    !o.label &&
    !isProduction() &&
    !root.getAttribute("aria-label") &&
    !root.getAttribute("aria-labelledby")
  )
    v.fail('a carousel needs an accessible name: pass "label" or label the root.');

  const ledger = createAttributeLedger();
  const rootWriter = createChannelWriter(root, ["perspective", "transform-style"], {
    id: "advanced/ring",
  });
  let items: Item[] = [];
  let systemReduced = prefersReducedMotion();
  const reduced = () => shouldReduceMotion(policy, systemReduced);
  let itemWidth = 0;
  let index = 0;
  let target = 0;
  let destroyed = false;
  counters.effects++;

  // Live region (package-rendered, visually hidden by inline style; works without the stylesheet).
  const live = root.ownerDocument.createElement("span");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  live.className = "neshel-ring-live";
  live.setAttribute(
    "style",
    "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;margin:-1px;padding:0;border:0",
  );

  function readItems(): void {
    const elements = [...root.children].filter(
      (c): c is HTMLElement => c.nodeType === 1 && c !== live,
    );
    const kept: Item[] = elements.map(
      (element) =>
        items.find((item) => item.element === element) ?? {
          element,
          writer: createChannelWriter(element, ["backface-visibility", "z-index"], {
            id: "advanced/ring",
          }),
          key: Symbol("advanced/ring"),
        },
    );
    for (const old of items) if (!kept.includes(old)) releaseItem(old);
    items = kept;
    const first = items[0]?.element;
    itemWidth = first ? first.offsetWidth || first.getBoundingClientRect().width || 0 : 0;
    items.forEach((item, i) => {
      ledger.set(item.element, "aria-roledescription", "slide");
      if (!ledger.original(item.element, "role") && /^(DIV|SPAN)$/.test(item.element.tagName))
        ledger.set(item.element, "role", "group");
      if (
        !ledger.original(item.element, "aria-label") &&
        !item.element.getAttribute("aria-labelledby")
      )
        ledger.set(item.element, "aria-label", `${i + 1} of ${items.length}`);
    });
  }
  function releaseItem(item: Item): void {
    const host = getMotionHost(item.element);
    host.setLayer(item.key, undefined);
    item.writer.release();
    ledger.restoreElement(item.element);
  }

  const radius = () =>
    radiusOption === "auto" ? ringRadius(itemWidth || 200, items.length, gap) : radiusOption;

  function render(angle: number): void {
    if (destroyed) return;
    const n = items.length;
    const r = radius();
    items.forEach((item, i) => {
      const rel = ringRelative(i, n, angle);
      const host = getMotionHost(item.element);
      host.setLayer(item.key, Math.abs(rel) < 1e-3 ? undefined : orbitLayer("y", rel, r));
      item.writer.set("backface-visibility", "hidden");
      item.writer.set("z-index", String(Math.round(Math.cos((rel * Math.PI) / 180) * 100) + 100));
    });
  }

  function syncFront(announce: boolean): void {
    const n = items.length;
    const front = ((index % n) + n) % n;
    const previousFront = items.find((item) => item.element.getAttribute("aria-hidden") !== "true");
    items.forEach((item, i) => {
      if (i === front) setHidden(ledger, item.element, false);
    });
    // Focus inside the item that leaves the front returns to the carousel root (never into a hidden item).
    const active = root.ownerDocument.activeElement;
    if (
      previousFront &&
      previousFront.element !== items[front]?.element &&
      active &&
      previousFront.element.contains(active)
    ) {
      if (!root.hasAttribute("tabindex")) ledger.set(root, "tabindex", "-1");
      root.focus({ preventScroll: true });
    }
    items.forEach((item, i) => {
      if (i !== front) setHidden(ledger, item.element, true);
    });
    if (announce) live.textContent = announceText(front, n);
  }

  readItems();
  if (items.length === 0) v.fail("the root has no items (element children).");
  index = Math.min(
    items.length - 1,
    Math.max(0, Math.round(v.number("index", o.index, 0, 0, 1e6))),
  );
  target = (index * 360) / items.length;

  const rig = createSpringRig(getFrameScheduler(), { a: target }, spring, (values) =>
    render(values.a),
  );

  // Root semantics (captured, restored).
  ledger.set(root, "aria-roledescription", "carousel");
  if (!ledger.original(root, "role")) ledger.set(root, "role", "group");
  if (o.label) ledger.set(root, "aria-label", o.label);
  if (keyboard && !root.hasAttribute("tabindex")) ledger.set(root, "tabindex", "0");
  rootWriter.set("perspective", `${perspective}px`);
  rootWriter.set("transform-style", "preserve-3d");
  root.appendChild(live);
  syncFront(false);
  rig.set({ a: target });

  function goTo(nextIndex: number): void {
    if (destroyed) return;
    const n = items.length;
    const normalized = ((Math.round(nextIndex) % n) + n) % n;
    const changed = normalized !== ((index % n) + n) % n;
    // Shortest path from the current target (rapid presses accumulate instead of spinning back).
    const step = 360 / n;
    const delta = ((((normalized - index) % n) + n + Math.floor(n / 2)) % n) - Math.floor(n / 2);
    index = normalized;
    target += delta * step;
    if (reduced()) rig.set({ a: target });
    else rig.to({ a: target });
    syncFront(changed);
    if (changed) onChange?.(index);
  }

  const cleanups: Array<() => void> = [];
  if (keyboard) {
    const onKey = (event: KeyboardEvent) => {
      if (event.target !== root) return;
      const n = items.length;
      const next =
        event.key === "ArrowRight"
          ? index + 1
          : event.key === "ArrowLeft"
            ? index - 1
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? n - 1
                : undefined;
      if (next === undefined) return;
      event.preventDefault();
      goTo(next);
    };
    root.addEventListener("keydown", onKey);
    cleanups.push(() => root.removeEventListener("keydown", onKey));
  }
  if (drag) {
    let start: { angle: number; x: number; y: number; id: number } | undefined;
    let dragging = false;
    let samples: Array<{ a: number; t: number }> = [];
    let suppressClick = false;
    const owner = {};
    const [session, unsubscribe] = subscribePointerSession(root, (type, pointer) => {
      if (type === "down") {
        if (start) return;
        start = { angle: rig.values.a, x: pointer.startX, y: pointer.startY, id: pointer.id };
        dragging = false;
        samples = [];
        return;
      }
      if (!start || pointer.id !== start.id) return;
      const dx = pointer.x - start.x;
      const dy = pointer.y - start.y;
      if (type === "move") {
        if (!dragging) {
          if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
          if (!session.claim([pointer.id], owner)) {
            start = undefined;
            return;
          }
          session.capture(pointer.id);
          dragging = true;
        }
        const circumference = 2 * Math.PI * Math.max(1, radius());
        const a = start.angle - (dx / circumference) * 360;
        rig.stop();
        rig.set({ a });
        samples.push({ a, t: pointer.time });
        if (samples.length > 5) samples.shift();
        return;
      }
      // up / cancel
      const wasDragging = dragging;
      start = undefined;
      dragging = false;
      if (!wasDragging) return;
      suppressClick = type === "up";
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = first && last ? (last.t - first.t) / 1000 : 0;
      const velocity = dt > 0 && first && last ? (last.a - first.a) / dt : 0;
      const projected = rig.values.a + (reduced() ? 0 : velocity * 0.2);
      const n = items.length;
      const step = 360 / n;
      const nearest = Math.round(projected / step);
      target = nearest * step;
      const normalized = ((nearest % n) + n) % n;
      const changed = normalized !== index;
      index = normalized;
      if (reduced()) rig.set({ a: target });
      else rig.to({ a: target });
      syncFront(changed);
      if (changed) onChange?.(index);
    });
    session.setTouchAction(owner, ["pan-y", "pinch-zoom"]);
    const onClickCapture = (event: Event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    root.addEventListener("click", onClickCapture, true);
    cleanups.push(() => {
      root.removeEventListener("click", onClickCapture, true);
      session.setTouchAction(owner, undefined);
      unsubscribe();
    });
  }
  if (radiusOption === "auto" && typeof ResizeObserver === "function") {
    let cancel: (() => void) | undefined;
    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      if (!box) return;
      cancel ??= getFrameScheduler().schedule(() => {
        cancel = undefined;
        if (Math.abs(box.width - itemWidth) < 1) return;
        itemWidth = box.width;
        render(rig.values.a);
      }, "write");
    });
    const first = items[0]?.element;
    if (first) observer.observe(first);
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
      if (reduced()) rig.set({ a: target });
    }),
  );

  const control: RingControl = {
    get index() {
      return index;
    },
    get count() {
      return items.length;
    },
    get angle() {
      return rig.values.a;
    },
    go: goTo,
    next: () => goTo(index + 1),
    previous: () => goTo(index - 1),
    refresh() {
      if (destroyed) return;
      const current = items[index]?.element;
      readItems();
      if (items.length === 0) return;
      const found = items.findIndex((item) => item.element === current);
      index = found >= 0 ? found : Math.min(index, items.length - 1);
      target = shortestRingTarget(rig.values.a, index, items.length);
      rig.set({ a: target });
      syncFront(false);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const fn of cleanups.splice(0).reverse()) fn();
      rig.stop();
      for (const item of items) releaseItem(item);
      items = [];
      live.remove();
      rootWriter.release();
      ledger.restore();
      counters.effects--;
    },
  };
  return control;
}
