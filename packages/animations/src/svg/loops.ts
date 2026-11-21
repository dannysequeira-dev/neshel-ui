/**
 * Continuous SVG effects (catalogue §11; contracts/svg-api.md, research R11, R12, R14): S05 animated gradient
 * stops, S07 turbulence wobble and S09 dash flow. Each is a visibility-gated loop of the shared scheduler —
 * no task while off-screen, on a hidden page or under reduced motion — finite by default (`Infinity`
 * explicit), with `pause()`/`play()`/`stop()`, seekable and timeline/source-drivable.
 */
import { type ChannelWriter, createChannelWriter } from "../core/channel.js";
import { createLoop, type LoopEffectControl, loopEffectControl } from "../core/loop.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { type Validator, validator } from "../core/validate.js";
import { createAttributeWriter } from "./engine/attributes.js";
import { counters, getSvgSupport } from "./engine/debug.js";
import { elementsOf } from "./engine/effect.js";

type Styled = Element & { readonly style: CSSStyleDeclaration };

export type { LoopEffectControl };

export interface LoopSvgOptions {
  /** One cycle, ms. */
  duration?: number;
  /** Extra cycles (0–1000 or `Infinity`, explicit). */
  repeat?: number;
  reducedMotion?: ReducedMotion;
  /** `visible`/`mount` start on creation (default); `manual` waits for `play()`. */
  trigger?: "visible" | "mount" | "manual";
  onComplete?(): void;
}

function loopEffect(
  name: string,
  gate: Element,
  options: LoopSvgOptions,
  defaults: { duration: number; repeat: number },
  render: (time: number, period: number) => void,
  rest: () => void,
  destroy: () => void,
  staticMode = false,
): { control: LoopEffectControl; v: Validator } {
  const v = validator(name);
  const o = v.options(options);
  const period = v.number("duration", o.duration, defaults.duration, 100, 600_000);
  const repeat =
    o.repeat === Number.POSITIVE_INFINITY
      ? o.repeat
      : v.number("repeat", o.repeat, defaults.repeat, 0, 1000);
  const policy = v.reducedMotion(o.reducedMotion);
  const trigger = v.oneOf("trigger", o.trigger, ["visible", "mount", "manual"], "visible");
  counters.effects++;
  const loop = createLoop({
    element: gate,
    period,
    repeat,
    reducedMotion: staticMode ? "always" : policy,
    render: (time) => render(time, period),
    rest,
    onComplete: v.callback<() => void>("onComplete", o.onComplete),
  });
  let destroyed = false;
  const control = loopEffectControl(loop, period, repeat, () => {
    if (destroyed) return;
    destroyed = true;
    loop.destroy();
    destroy();
    counters.effects--;
  });
  if (trigger !== "manual") control.play();
  else rest();
  return { control, v };
}

export interface GradientStop {
  color?: readonly [string, string];
  opacity?: readonly [number, number];
  offset?: readonly [number, number];
}

export interface GradientStopsOptions extends LoopSvgOptions {
  /** Per stop (by index among the gradient's `<stop>` children). */
  stops: readonly (GradientStop | undefined)[];
  /** Alternate back and forth inside a cycle (default true). */
  yoyo?: boolean;
}

function forcedColors(): boolean {
  const media = (globalThis as { matchMedia?: (q: string) => MediaQueryList }).matchMedia;
  return typeof media === "function" && media("(forced-colors: active)").matches;
}

/** S05 — animate the colours, opacities and offsets of a gradient's stops. */
export function createGradientStops(
  gradient: Element,
  options: GradientStopsOptions,
): LoopEffectControl {
  if (!gradient || gradient.nodeType !== 1)
    throw new TypeError("createGradientStops: gradient must be an element.");
  const stops = [...gradient.querySelectorAll(":scope > stop")];
  const specs = options?.stops;
  if (!Array.isArray(specs) || specs.length === 0)
    throw new TypeError('createGradientStops: "stops" must be a non-empty array.');
  if (specs.length > stops.length)
    throw new TypeError("createGradientStops: more stop specs than <stop> elements.");
  const v = validator("createGradientStops");
  specs.forEach((spec, i) => {
    if (!spec) return;
    if (spec.color) for (const c of spec.color) v.css(`stops[${i}].color`, c, "");
    for (const key of ["opacity", "offset"] as const) {
      const pair = spec[key];
      if (
        pair &&
        !(pair.length === 2 && pair.every((n: number) => typeof n === "number" && n >= 0 && n <= 1))
      )
        v.fail(`stops[${i}].${key} must be two numbers from 0 to 1.`);
    }
  });
  const colorMix = getSvgSupport().colorMix;
  const yoyo = options.yoyo !== false;
  const writers = new Map<Element, ChannelWriter>();
  const attributes = stops.map((stop) => createAttributeWriter(stop, "createGradientStops"));
  const writerOf = (stop: Element) => {
    let writer = writers.get(stop);
    if (!writer) {
      writer = createChannelWriter(stop as Styled, ["stop-color", "stop-opacity"], {
        id: "svg/gradient-stops",
      });
      writers.set(stop, writer);
    }
    return writer;
  };
  const round = (n: number) => Math.round(n * 10000) / 10000;
  const { control } = loopEffect(
    "createGradientStops",
    gradient.closest("svg") ?? gradient,
    options,
    { duration: 2400, repeat: 0 },
    (time, period) => {
      const u = (time % period) / period;
      const p = yoyo ? (u < 0.5 ? u * 2 : 2 - u * 2) : u;
      const e = p * p * (3 - 2 * p);
      specs.forEach((spec, i) => {
        const stop = stops[i] as Element;
        if (!spec) return;
        if (spec.color) {
          const value = colorMix
            ? `color-mix(in oklab, ${spec.color[1]} ${round(e * 100)}%, ${spec.color[0]})`
            : e < 0.5
              ? spec.color[0]
              : spec.color[1];
          writerOf(stop).set("stop-color", value);
        }
        if (spec.opacity)
          writerOf(stop).set(
            "stop-opacity",
            String(round(spec.opacity[0] + (spec.opacity[1] - spec.opacity[0]) * e)),
          );
        if (spec.offset)
          (attributes[i] as ReturnType<typeof createAttributeWriter>).set(
            "offset",
            String(round(spec.offset[0] + (spec.offset[1] - spec.offset[0]) * e)),
          );
      });
    },
    () => {
      for (const writer of writers.values()) writer.release();
      for (const writer of attributes) writer.restore();
    },
    () => {
      for (const writer of writers.values()) writer.release();
      for (const writer of attributes) writer.restore();
    },
    forcedColors(),
  );
  return control;
}

export interface TurbulenceOptions extends LoopSvgOptions {
  /** Base frequency 0.001–0.2 (default 0.02). */
  frequency?: number;
  /** Displacement in px 0–24 (default 6). */
  amplitude?: number;
  /** Octaves 1–3 (default 1). */
  octaves?: number;
  /** Frequency oscillation, cycles per second 0–2 (default 0.5). */
  speed?: number;
  /** Filter updates per second 1–30 (default 20). */
  rate?: number;
  /** Filter region padding 0–0.25 (default 0.1). */
  region?: number;
}

let filterIds = 0;
const SVG_NS = "http://www.w3.org/2000/svg";

/** S07 — turbulence wobble through a package SVG filter (bounded; off under reduced motion). */
export function createTurbulence(
  element: Element,
  options: TurbulenceOptions = {},
): LoopEffectControl {
  if (!element || element.nodeType !== 1 || !element.ownerDocument)
    throw new TypeError("createTurbulence: element must be an element.");
  const v = validator("createTurbulence");
  const frequency = v.number("frequency", options.frequency, 0.02, 0.001, 0.2);
  const amplitude = v.number("amplitude", options.amplitude, 6, 0, 24);
  const octaves = v.number("octaves", options.octaves, 1, 1, 3);
  const speed = v.number("speed", options.speed, 0.5, 0, 2);
  const rate = v.number("rate", options.rate, 20, 1, 30);
  const region = v.number("region", options.region, 0.1, 0, 0.25);
  const doc = element.ownerDocument;
  const id = `neshel-turbulence-${++filterIds}`;
  let host: SVGSVGElement | undefined;
  let turbulence: Element | undefined;
  let displacement: Element | undefined;
  let lastTick = -1;
  const writer = createChannelWriter(element as Styled, ["filter"], { id: "svg/turbulence" });
  const build = () => {
    if (host) return;
    host = doc.createElementNS(SVG_NS, "svg") as SVGSVGElement;
    host.setAttribute("aria-hidden", "true");
    host.setAttribute("focusable", "false");
    host.setAttribute("class", "neshel-svg-filter-host");
    host.setAttribute("width", "0");
    host.setAttribute("height", "0");
    host.setAttribute(
      "style",
      "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none",
    );
    const filter = doc.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("x", `${-region * 100}%`);
    filter.setAttribute("y", `${-region * 100}%`);
    filter.setAttribute("width", `${(1 + 2 * region) * 100}%`);
    filter.setAttribute("height", `${(1 + 2 * region) * 100}%`);
    turbulence = doc.createElementNS(SVG_NS, "feTurbulence");
    turbulence.setAttribute("type", "turbulence");
    turbulence.setAttribute("baseFrequency", String(frequency));
    turbulence.setAttribute("numOctaves", String(octaves));
    turbulence.setAttribute("seed", "2");
    turbulence.setAttribute("result", "noise");
    displacement = doc.createElementNS(SVG_NS, "feDisplacementMap");
    displacement.setAttribute("in", "SourceGraphic");
    displacement.setAttribute("in2", "noise");
    displacement.setAttribute("scale", String(amplitude));
    filter.append(turbulence, displacement);
    host.appendChild(filter);
    doc.body.appendChild(host);
    counters.filters++;
  };
  const remove = () => {
    writer.release();
    if (host) {
      host.remove();
      host = turbulence = displacement = undefined;
      counters.filters--;
    }
    lastTick = -1;
  };
  const { control } = loopEffect(
    "createTurbulence",
    element,
    options,
    { duration: 4000, repeat: 0 },
    (time) => {
      const tick = Math.floor((time / 1000) * rate);
      if (tick === lastTick) return;
      lastTick = tick;
      build();
      writer.set("filter", `url(#${id})`);
      const t = tick / rate;
      const fx = frequency * (1 + 0.3 * Math.sin(2 * Math.PI * speed * t));
      const fy = frequency * (1 + 0.3 * Math.cos(2 * Math.PI * speed * t));
      turbulence?.setAttribute(
        "baseFrequency",
        `${Math.round(fx * 100000) / 100000} ${Math.round(fy * 100000) / 100000}`,
      );
      counters.attributeWrites++;
    },
    remove,
    remove,
  );
  return control;
}

export interface DashFlowOptions extends LoopSvgOptions {
  /** Dash length (user units, default 6). */
  dash?: number;
  /** Gap length (user units, default 4). */
  gap?: number;
  /** Units per second, negative reverses (−400–400; default 40). */
  speed?: number;
}

/** S09 — marching ants: dashes flowing along paths while visible. */
export function createDashFlow(
  paths: Element | Iterable<Element>,
  options: DashFlowOptions = {},
): LoopEffectControl {
  const list = elementsOf(paths, undefined, "createDashFlow");
  if (list.length === 0) throw new TypeError("createDashFlow: no element.");
  const v = validator("createDashFlow");
  const dash = v.number("dash", options.dash, 6, 0.1, 1000);
  const gap = v.number("gap", options.gap, 4, 0.1, 1000);
  const speed = v.number("speed", options.speed, 40, -400, 400);
  const writers = list.map((path) =>
    createChannelWriter(path as Styled, ["stroke-dasharray", "stroke-dashoffset"], {
      id: "svg/dash-flow",
    }),
  );
  const pattern = `${dash} ${gap}`;
  const { control } = loopEffect(
    "createDashFlow",
    list[0] as Element,
    { duration: 4000, ...options },
    { duration: 4000, repeat: 0 },
    (time) => {
      const offset = -((speed * time) / 1000) % (dash + gap);
      for (const writer of writers) {
        writer.set("stroke-dasharray", pattern);
        writer.set("stroke-dashoffset", String(Math.round(offset * 1000) / 1000));
      }
    },
    () => {
      // Static: the dashes stay visible without motion.
      for (const writer of writers) {
        writer.set("stroke-dasharray", pattern);
        writer.set("stroke-dashoffset", "0");
      }
    },
    () => {
      for (const writer of writers) writer.release();
    },
  );
  return control;
}
