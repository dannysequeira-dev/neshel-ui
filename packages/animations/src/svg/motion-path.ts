/**
 * S03 — Motion along a path (catalogue §11; contracts/svg-api.md, research R10). Native CSS Motion Path when
 * `offset-path: path()` is supported: `offset-path`, `offset-distance` and `offset-rotate` are internal host
 * channels (exact restoration) and the browser composes the offset transform with `translate`/`rotate`/
 * `scale`/`transform`. Fallback (`mode: "js"` or no support): the JS geometry places the element's centre on
 * the path through a host transform layer (composes with every other layer); the element's size is measured
 * once and on resize. Paths are in CSS px relative to the element's box. Reduced motion (`static`): no travel —
 * the element jumps to the target progress; repeats never run.
 */
import { createChannelWriter } from "../core/channel.js";
import { getMotionHost } from "../core/host.js";
import { getSvgSupport } from "./engine/debug.js";
import { createSvgEffect, type ProgressControl, type SvgEffectOptions } from "./engine/effect.js";
import { getPathGeometry } from "./engine/geometry.js";
import { parsePathData, serializePathData } from "./engine/path-data.js";

type Styled = Element & { readonly style: CSSStyleDeclaration };

export interface MotionPathOptions extends SvgEffectOptions {
  /** Path data in CSS px (element-relative), or a `<path>` whose `d` is used as is. */
  path: string | Element;
  /** `"auto"` (tangent; default), `"reverse"`, or a fixed angle in degrees. */
  rotate?: "auto" | "reverse" | number;
  /** `"auto"` (native when supported; default), `"native"` or `"js"`. */
  mode?: "auto" | "native" | "js";
  /** Extra runs (0–1000 or `Infinity`, explicit). */
  repeat?: number;
  /** Alternate direction on repeats. */
  yoyo?: boolean;
}

export interface MotionPathControl extends ProgressControl {
  /** `"native"` or `"js"` — the mechanism actually used. */
  readonly mode: "native" | "js";
}

export function createMotionPath(element: Element, options: MotionPathOptions): MotionPathControl {
  if (!element || element.nodeType !== 1)
    throw new TypeError("createMotionPath: element must be an element.");
  const input = options?.path;
  const d = typeof input === "string" ? input : (input as Element | undefined)?.getAttribute?.("d");
  if (typeof d !== "string" || d.trim() === "")
    throw new TypeError('createMotionPath: "path" must be path data or a <path>.');
  const normal = serializePathData(parsePathData(d), 3); // validates (controlled errors)
  const rotate = options.rotate ?? "auto";
  if (
    !(
      rotate === "auto" ||
      rotate === "reverse" ||
      (typeof rotate === "number" && Number.isFinite(rotate))
    )
  )
    throw new TypeError('createMotionPath: "rotate" must be "auto", "reverse" or a number.');
  const requested = options.mode ?? "auto";
  if (!["auto", "native", "js"].includes(requested))
    throw new TypeError(`createMotionPath: invalid mode ${JSON.stringify(requested)}`);
  const mode: "native" | "js" =
    requested === "js" || (requested === "auto" && !getSvgSupport().offsetPath) ? "js" : "native";
  const repeat = options.repeat ?? 0;
  if (
    !(
      repeat === Number.POSITIVE_INFINITY ||
      (Number.isInteger(repeat) && repeat >= 0 && repeat <= 1000)
    )
  )
    throw new TypeError('createMotionPath: "repeat" must be 0–1000 or Infinity.');

  const writer =
    mode === "native"
      ? createChannelWriter(
          element as Styled,
          ["offset-path", "offset-distance", "offset-rotate"],
          { id: "svg/motion-path" },
        )
      : undefined;
  const geometry = mode === "js" ? getPathGeometry(normal) : undefined;
  const key = Symbol("svg/motion-path");
  let size: { w: number; h: number } | undefined;
  let observer: ResizeObserver | undefined;
  const measure = () => {
    const el = element as HTMLElement;
    size = { w: el.offsetWidth ?? 0, h: el.offsetHeight ?? 0 };
  };

  const effect = createSvgEffect(element, options, {
    name: "createMotionPath",
    defaults: { duration: 1600, easing: "standard" },
    repeat,
    yoyo: options.yoyo === true,
    render(progress) {
      if (writer) {
        writer.set("offset-path", `path("${normal}")`);
        writer.set(
          "offset-rotate",
          rotate === "auto" ? "auto" : rotate === "reverse" ? "reverse" : `${rotate}deg`,
        );
        writer.set("offset-distance", `${Math.round(progress * 100000) / 1000}%`);
        return;
      }
      if (!geometry) return;
      if (!size) {
        measure();
        if (typeof ResizeObserver === "function") {
          observer = new ResizeObserver(() => measure());
          observer.observe(element);
        }
      }
      const point = geometry.pointAt(progress * geometry.length);
      const angle =
        rotate === "auto" ? point.angle : rotate === "reverse" ? point.angle + 180 : rotate;
      getMotionHost(element as Styled).setLayer(key, {
        translateX: Math.round((point.x - (size?.w ?? 0) / 2) * 1000) / 1000,
        translateY: Math.round((point.y - (size?.h ?? 0) / 2) * 1000) / 1000,
        rotateZ: Math.round(angle * 1000) / 1000,
      });
    },
  });
  effect.onDestroy(() => {
    writer?.release();
    observer?.disconnect();
    getMotionHost(element as Styled).setLayer(key, undefined);
  });
  const control = effect.control as MotionPathControl;
  Object.defineProperty(control, "mode", { value: mode, enumerable: true });
  return control;
}
