/**
 * S01 — Path draw, S06 — Line-chart draw-in, S10 — Success checkmark draw, and the shared dash renderer
 * (catalogue §11; contracts/svg-api.md). Lengths come from `dashLength` (native `getTotalLength`, JS geometry
 * fallback, `pathLength` honoured) and are re-measured when `d`/`pathLength` change. Dash styles are written
 * through internal host channels (`stroke-dasharray`, `stroke-dashoffset`), so the consumer's own dash styles
 * are restored exactly when the effect releases. Dash pattern `L, L + pad` with an offset that draws `[0, p·L]`
 * and nothing (no cap dot) at `p = 0`. Reduced motion (`instant`): drawn at once.
 */
import { type ChannelWriter, createChannelWriter } from "../core/channel.js";
import { getMotionHost } from "../core/host.js";
import { clamp } from "../core/interpolate.js";
import { counters } from "./engine/debug.js";
import {
  createSvgEffect,
  elementsOf,
  type ProgressControl,
  type SvgEffectOptions,
} from "./engine/effect.js";
import { dashLength, getPathGeometry, shapeToPathData } from "./engine/geometry.js";

type Styled = Element & { readonly style: CSSStyleDeclaration };

export interface DrawItem {
  readonly element: Element;
  /** Local window `[start, end]` of the overall progress (0–1). */
  window: [number, number];
}

export interface DashRenderer {
  render(progress: number): void;
  release(): void;
  lengths(): number[];
  destroy(): void;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

/** Dash renderer of several elements, each over its own window of the progress. */
export function createDashRenderer(
  items: readonly DrawItem[],
  id: string,
  reverse = false,
): DashRenderer {
  const writers: ChannelWriter[] = items.map((item) =>
    createChannelWriter(item.element as Styled, ["stroke-dasharray", "stroke-dashoffset"], { id }),
  );
  let lengths = items.map((item) => {
    counters.measures++;
    return dashLength(item.element);
  });
  let last = Number.NaN;
  const Observer =
    items[0]?.element.ownerDocument?.defaultView?.MutationObserver ??
    (typeof MutationObserver === "function" ? MutationObserver : undefined);
  const observer = Observer
    ? new Observer(() => {
        lengths = items.map((item) => dashLength(item.element));
        if (!Number.isNaN(last)) renderer.render(last);
      })
    : undefined;
  for (const item of items)
    observer?.observe(item.element, {
      attributes: true,
      attributeFilter: [
        "d",
        "pathLength",
        "points",
        "r",
        "x1",
        "x2",
        "y1",
        "y2",
        "width",
        "height",
      ],
    });
  const renderer: DashRenderer = {
    render(progress) {
      last = progress;
      items.forEach((item, i) => {
        const L = lengths[i] as number;
        const writer = writers[i] as ChannelWriter;
        if (!(L > 0)) return; // zero-length: nothing to draw
        const [a, b] = item.window;
        const local = clamp(b > a ? (progress - a) / (b - a) : progress >= b ? 1 : 0, 0, 1);
        const pad = Math.max(1, L * 0.01);
        writer.set("stroke-dasharray", `${round(L)} ${round(L + pad)}`);
        const offset = (1 - local) * (L + pad / 2);
        writer.set("stroke-dashoffset", String(round(reverse ? -offset : offset)));
      });
    },
    release() {
      for (const writer of writers) writer.release();
    },
    lengths: () => [...lengths],
    destroy() {
      observer?.disconnect();
      renderer.release();
    },
  };
  return renderer;
}

export interface PathDrawOptions extends SvgEffectOptions {
  /** ms between consecutive paths (0–5000; default 0). */
  stagger?: number;
  /** Draw from the end towards the start (default false). */
  reverse?: boolean;
  /** Restore the consumer's dash styles when the draw completes forwards (default true). */
  release?: boolean;
}

function windows(count: number, duration: number, stagger: number): Array<[number, number]> {
  const total = duration + stagger * Math.max(0, count - 1);
  return Array.from({ length: count }, (_, i) => [
    total > 0 ? (i * stagger) / total : 0,
    total > 0 ? (i * stagger + duration) / total : 1,
  ]);
}

/** S01 — draw one or more SVG geometry elements. */
export function createPathDraw(
  paths: Element | Iterable<Element>,
  options: PathDrawOptions = {},
): ProgressControl {
  const list = elementsOf(paths, undefined, "createPathDraw");
  if (list.length === 0) throw new TypeError("createPathDraw: no element to draw.");
  const stagger = options?.stagger ?? 0;
  if (typeof stagger !== "number" || !(stagger >= 0 && stagger <= 5000))
    throw new TypeError('createPathDraw: "stagger" must be from 0 to 5000.');
  const release = options?.release ?? true;
  let renderer: DashRenderer | undefined;
  const effect = createSvgEffect(list[0] as Element, options, {
    name: "createPathDraw",
    defaults: { duration: 1200, easing: "standard" },
    total: (duration) => duration + stagger * (list.length - 1),
    render: (progress) => renderer?.render(progress),
    onSettle(result) {
      if (release && result.status === "completed" && result.direction === "forward")
        renderer?.release();
    },
  });
  renderer = createDashRenderer(
    list.map((element, i) => ({
      element,
      window: windows(list.length, effect.duration, stagger)[i] as [number, number],
    })),
    "svg/path-draw",
    options?.reverse === true,
  );
  if (effect.driver.state !== "idle" || effect.driver.driven)
    renderer.render(effect.driver.progress);
  effect.onDestroy(() => renderer?.destroy());
  return effect.control;
}

export interface ChartDrawOptions extends SvgEffectOptions {
  /** Line elements (or a selector inside the svg). */
  lines: string | Element | Iterable<Element>;
  /** Point markers revealed when the line passes them (selector or elements). */
  points?: string | Element | Iterable<Element>;
  /** ms between lines (default 150). */
  stagger?: number;
}

function pointX(element: Element): number {
  for (const name of ["cx", "x"]) {
    const value = Number.parseFloat(element.getAttribute(name) ?? "");
    if (Number.isFinite(value))
      return element.localName === "rect"
        ? value + Number.parseFloat(element.getAttribute("width") ?? "0") / 2
        : value;
  }
  const box = (element as SVGGraphicsElement).getBBox?.();
  return box ? box.x + box.width / 2 : 0;
}

/** S06 — draw the consumer's chart lines; reveal points as the line passes them (no charting engine). */
export function createChartDraw(svg: Element, options: ChartDrawOptions): ProgressControl {
  if (!svg || svg.nodeType !== 1) throw new TypeError("createChartDraw: svg must be an element.");
  const lines = elementsOf(options?.lines, svg, "createChartDraw");
  if (lines.length === 0) throw new TypeError('createChartDraw: "lines" matched no element.');
  const points =
    options.points === undefined ? [] : elementsOf(options.points, svg, "createChartDraw");
  const stagger = options.stagger ?? 150;
  if (typeof stagger !== "number" || !(stagger >= 0 && stagger <= 5000))
    throw new TypeError('createChartDraw: "stagger" must be from 0 to 5000.');
  let renderer: DashRenderer | undefined;
  let wins: Array<[number, number]> = [];
  // Each point: the overall progress at which the nearest line's drawn length passes its x.
  let thresholds: number[] = [];
  const keys = points.map(() => Symbol("svg/chart-point"));
  const renderPoints = (progress: number) => {
    points.forEach((point, i) => {
      const host = getMotionHost(point as Styled);
      const visible = clamp((progress - (thresholds[i] ?? 0)) / 0.04 + 1, 0, 1);
      host.setOpacity(keys[i] as symbol, visible >= 1 ? undefined : visible);
    });
  };
  const effect = createSvgEffect(svg, options, {
    name: "createChartDraw",
    defaults: { duration: 1400, easing: "standard" },
    total: (duration) => duration + stagger * (lines.length - 1),
    render(progress) {
      renderer?.render(progress);
      renderPoints(progress);
    },
    onSettle(result) {
      if (result.status === "completed" && result.direction === "forward") renderer?.release();
    },
  });
  wins = windows(lines.length, effect.duration, stagger);
  renderer = createDashRenderer(
    lines.map((element, i) => ({ element, window: wins[i] as [number, number] })),
    "svg/chart-draw",
  );
  const geometries = lines.map((line) => {
    const d = shapeToPathData(line);
    return d ? getPathGeometry(d) : undefined;
  });
  thresholds = points.map((point) => {
    const x = pointX(point);
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    geometries.forEach((geometry, li) => {
      if (!geometry || geometry.length === 0) return;
      // Binary search on x along the (x-monotonic) line.
      let lo = 0;
      let hi = geometry.length;
      for (let k = 0; k < 30; k++) {
        const mid = (lo + hi) / 2;
        if (geometry.pointAt(mid).x < x) lo = mid;
        else hi = mid;
      }
      const at = geometry.pointAt(hi);
      const distance = Math.abs(at.x - x);
      if (distance < bestDistance) {
        bestDistance = distance;
        const [a, b] = wins[li] as [number, number];
        best = a + (b - a) * (hi / geometry.length);
      }
    });
    return best;
  });
  if (effect.driver.state !== "idle" || effect.driver.driven) {
    renderer.render(effect.driver.progress);
    renderPoints(effect.driver.progress);
  }
  effect.onDestroy(() => {
    renderer?.destroy();
    points.forEach((point, i) => {
      getMotionHost(point as Styled).setOpacity(keys[i] as symbol, undefined);
    });
  });
  return effect.control;
}

export interface CheckmarkOptions extends SvgEffectOptions {
  /** Circle element (default: the first `circle`/`path` in the svg when `circle` is true). */
  circleElement?: Element;
  /** Check element (default: the last `path`/`polyline` in the svg). */
  checkElement?: Element;
  /** Draw the circle first (default true). */
  circle?: boolean;
}

/** S10 — draw a success checkmark (circle, then check). Adds no role or live region. */
export function createCheckmark(svg: Element, options: CheckmarkOptions = {}): ProgressControl {
  if (!svg || svg.nodeType !== 1) throw new TypeError("createCheckmark: svg must be an element.");
  const shapes = [...svg.querySelectorAll("circle, path, polyline")];
  const check = options.checkElement ?? shapes[shapes.length - 1];
  const withCircle = options.circle !== false;
  const circle = withCircle
    ? (options.circleElement ?? (shapes.length > 1 ? shapes[0] : undefined))
    : undefined;
  if (!check) throw new TypeError("createCheckmark: no check path found.");
  const items: DrawItem[] = circle
    ? [
        { element: circle, window: [0, 0.6] },
        { element: check, window: [0.45, 1] },
      ]
    : [{ element: check, window: [0, 1] }];
  let renderer: DashRenderer | undefined;
  const effect = createSvgEffect(svg, options, {
    name: "createCheckmark",
    defaults: { duration: 600, easing: "standard" },
    render: (progress) => renderer?.render(progress),
    onSettle(result) {
      if (result.status === "completed" && result.direction === "forward") renderer?.release();
    },
  });
  renderer = createDashRenderer(items, "svg/checkmark");
  if (effect.driver.state !== "idle" || effect.driver.driven)
    renderer.render(effect.driver.progress);
  effect.onDestroy(() => renderer?.destroy());
  return effect.control;
}
