/**
 * M05 duotone transition (catalogue §12; contracts/media-api.md, research R4). A package SVG filter (hidden 0×0
 * `aria-hidden` host, as S07) maps luminance to two colours (`feColorMatrix` + `feComponentTransfer`) and mixes
 * the result with the source through `feComposite arithmetic` (`k2 = amount`, `k3 = 1 − amount`), so the
 * transition is one attribute pair per frame. The element's `filter` is an exclusive Motion Host channel: the
 * consumer's inline filter is captured and restored, the image itself is never modified. Without SVG filters on
 * HTML (behavioural check) the same channel carries a CSS `grayscale()` fallback; under forced colours no filter.
 */
import { createChannelWriter } from "../core/channel.js";
import {
  createProgressEffect,
  type ProgressControl,
  type ProgressEffectOptions,
} from "../core/progress-effect.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";

type Styled = Element & { readonly style: CSSStyleDeclaration };

export interface DuotoneOptions extends ProgressEffectOptions {
  /** Colour of the shadows (default `#1b1f3a`). Hex `#rgb`/`#rrggbb` or `rgb(r g b)`. */
  shadow?: string;
  /** Colour of the highlights (default `#f2c14e`). */
  highlight?: string;
  /** Final amount of duotone 0–1 (default 1). */
  amount?: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";
let ids = 0;

/** sRGB channels 0–1 of a hex or `rgb()` colour (filters need numbers, not CSS colours). */
export function parseColor(value: string): [number, number, number] | undefined {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const h = hex[1] as string;
    const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
    return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255) as [
      number,
      number,
      number,
    ];
  }
  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(value.trim());
  if (rgb) return [rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, Number(n)) / 255) as never;
  return undefined;
}

function forcedColors(): boolean {
  const media = (globalThis as { matchMedia?: (q: string) => MediaQueryList }).matchMedia;
  return typeof media === "function" && media("(forced-colors: active)").matches;
}

/** Whether `filter: url(#…)` applies to HTML elements (behavioural; true in current engines). */
function svgFilterOnHtml(): boolean {
  const css = (globalThis as { CSS?: { supports?(p: string, v: string): boolean } }).CSS;
  return typeof css?.supports === "function" && css.supports("filter", "url(#a)");
}

export function createDuotone(element: Element, options: DuotoneOptions = {}): ProgressControl {
  const v = validator("createDuotone");
  if (!element || element.nodeType !== 1 || !element.ownerDocument)
    v.fail('"element" must be an element.');
  const shadowText = v.css("shadow", options.shadow, "#1b1f3a");
  const highlightText = v.css("highlight", options.highlight, "#f2c14e");
  const shadow = parseColor(shadowText);
  const highlight = parseColor(highlightText);
  if (!shadow || !highlight) v.fail('"shadow" and "highlight" must be hex or rgb() colours.');
  const amount = v.number("amount", options.amount, 1, 0, 1);
  const doc = element.ownerDocument;
  const id = `neshel-duotone-${++ids}`;
  const writer = createChannelWriter(element as Styled, ["filter"], { id: "media/duotone" });
  const native = svgFilterOnHtml();
  const forced = forcedColors();
  let host: SVGSVGElement | undefined;
  let composite: Element | undefined;
  const build = () => {
    if (host || !native) return;
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
    filter.setAttribute("color-interpolation-filters", "sRGB");
    const matrix = doc.createElementNS(SVG_NS, "feColorMatrix");
    matrix.setAttribute("type", "matrix");
    // Luminance (Rec. 709) into every channel.
    matrix.setAttribute(
      "values",
      "0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0",
    );
    matrix.setAttribute("in", "SourceGraphic");
    matrix.setAttribute("result", "gray");
    const transfer = doc.createElementNS(SVG_NS, "feComponentTransfer");
    transfer.setAttribute("in", "gray");
    transfer.setAttribute("result", "duo");
    ["R", "G", "B"].forEach((channel, i) => {
      const fn = doc.createElementNS(SVG_NS, `feFunc${channel}`);
      fn.setAttribute("type", "table");
      fn.setAttribute("tableValues", `${(shadow as number[])[i]} ${(highlight as number[])[i]}`);
      transfer.appendChild(fn);
    });
    composite = doc.createElementNS(SVG_NS, "feComposite");
    composite.setAttribute("in", "duo");
    composite.setAttribute("in2", "SourceGraphic");
    composite.setAttribute("operator", "arithmetic");
    composite.setAttribute("k1", "0");
    composite.setAttribute("k4", "0");
    filter.append(matrix, transfer, composite);
    host.appendChild(filter);
    doc.body.appendChild(host);
    counters.filters++;
  };
  const remove = () => {
    writer.release();
    if (host) {
      host.remove();
      host = composite = undefined;
      counters.filters--;
    }
  };
  const round = (n: number) => Math.round(n * 10000) / 10000;
  const effect = createProgressEffect(
    element,
    options,
    {
      name: "createDuotone",
      defaults: { duration: 600, easing: "standard" },
      arm: false,
      render(p) {
        const k = round(p * amount);
        if (forced || k <= 0) {
          writer.release();
          return;
        }
        if (!native) {
          writer.set("filter", `grayscale(${k})`);
          return;
        }
        build();
        composite?.setAttribute("k2", String(k));
        composite?.setAttribute("k3", String(round(1 - k)));
        writer.set("filter", `url(#${id})`);
      },
    },
    counters,
  );
  effect.onDestroy(remove);
  return effect.control;
}
