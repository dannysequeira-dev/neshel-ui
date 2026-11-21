/**
 * S02 — Path morph and S04 — Icon morph (catalogue §11; contracts/svg-api.md, svg-geometry.md §3). Shapes
 * are compiled once under the strict policy (`exact` or `cubic`); the `d` attribute is written through the
 * attribute ledger in the scheduler's write phase (CSS `d` is not in WebKit). A new target interrupts and
 * continues from the shape currently rendered. Incompatible shapes throw (default) or, with
 * `incompatible: "swap"`, switch at the midpoint (documented fallback). `destroy()` restores the original `d`.
 * The icon is decorative; the control's accessible name and state stay the consumer's.
 */
import { animationsError } from "../core/errors.js";
import { createAttributeWriter } from "./engine/attributes.js";
import { counters } from "./engine/debug.js";
import { createSvgEffect, type ProgressControl, type SvgEffectOptions } from "./engine/effect.js";
import { lerpCommands, type MorphOptions, prepareMorphCommands } from "./engine/morph.js";
import { type PathCommand, serializePathData } from "./engine/path-data.js";

export interface PathMorphOptions
  extends Omit<SvgEffectOptions, "trigger" | "progress">,
    MorphOptions {
  /** The shapes (path data), all compatible with each other. */
  shapes: readonly string[];
  /** Index shown at creation (default 0; the path's `d` is not changed until a morph starts). */
  initial?: number;
  /** `"error"` (default) or `"swap"`. */
  incompatible?: "error" | "swap";
}

export interface PathMorphControl extends ProgressControl {
  /** Index of the target shape. */
  readonly index: number;
  /** Morph to a shape. */
  to(index: number): Promise<unknown>;
  /** Value track morphing from the current shape to `index` inside a C01 timeline. */
  trackTo(
    index: number,
    options?: { id?: string; duration?: number },
  ): ReturnType<ProgressControl["track"]>;
}

function compatible(a: readonly PathCommand[], b: readonly PathCommand[]): string | undefined {
  if (a.length !== b.length) return `command count differs (${a.length} vs ${b.length})`;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] as PathCommand;
    const y = b[i] as PathCommand;
    if (x.type !== y.type) return `command ${i}: ${x.type} vs ${y.type}`;
    if (x.type === "A" && y.type === "A" && (x.large !== y.large || x.sweep !== y.sweep))
      return `command ${i}: arc flags differ`;
  }
  return undefined;
}

/** S02 — morph a `<path>` between compatible shapes. */
export function createPathMorph(path: Element, options: PathMorphOptions): PathMorphControl {
  if (!path || path.nodeType !== 1 || path.localName !== "path")
    throw animationsError("createPathMorph", '"path" must be a <path> element.');
  const shapes = options?.shapes;
  if (!Array.isArray(shapes) || shapes.length < 2)
    throw animationsError("createPathMorph", '"shapes" must list at least two path data strings.');
  const normalize = options.normalize ?? "exact";
  if (normalize !== "exact" && normalize !== "cubic")
    throw animationsError("createPathMorph", `invalid normalize ${JSON.stringify(normalize)}.`);
  const precision = options.precision ?? 3;
  if (!Number.isInteger(precision) || precision < 0 || precision > 6)
    throw animationsError("createPathMorph", "precision must be an integer from 0 to 6.");
  const policy = options.incompatible ?? "error";
  if (policy !== "error" && policy !== "swap")
    throw animationsError("createPathMorph", `invalid incompatible ${JSON.stringify(policy)}.`);
  const compiled = shapes.map((d) => prepareMorphCommands(d, normalize));
  if (policy === "error") {
    for (let i = 1; i < compiled.length; i++) {
      const reason = compatible(compiled[0] as PathCommand[], compiled[i] as PathCommand[]);
      if (reason)
        throw animationsError("createPathMorph", `shapes 0 and ${i} are incompatible — ${reason}.`);
    }
  }
  let index = options.initial ?? 0;
  if (!Number.isInteger(index) || index < 0 || index >= shapes.length)
    throw animationsError("createPathMorph", '"initial" must be a shape index.');
  const attributes = createAttributeWriter(path, "createPathMorph");
  let from: readonly PathCommand[] = compiled[index] as PathCommand[];
  let target: readonly PathCommand[] = from;
  let current: readonly PathCommand[] = from;
  let swap = false;

  const effect = createSvgEffect(
    path,
    { ...options, trigger: "manual" },
    {
      name: "createPathMorph",
      defaults: { duration: 500, easing: "standard" },
      arm: false,
      render(progress) {
        if (swap) {
          current = progress < 0.5 ? from : target;
          attributes.set("d", serializePathData(current, precision));
          return;
        }
        current =
          progress <= 0 ? from : progress >= 1 ? target : lerpCommands(from, target, progress);
        counters.morphs++;
        attributes.set("d", serializePathData(current, precision));
      },
    },
  );

  function retarget(next: number): void {
    if (!Number.isInteger(next) || next < 0 || next >= shapes.length)
      throw animationsError("createPathMorph", `invalid shape index ${next}.`);
    from = current;
    target = compiled[next] as PathCommand[];
    const reason = compatible(from, target);
    if (reason && policy === "error")
      throw animationsError("createPathMorph", `incompatible shapes — ${reason}.`);
    swap = reason !== undefined;
    index = next;
  }

  effect.onDestroy(() => attributes.restore());
  const control = effect.control as PathMorphControl;
  Object.defineProperty(control, "index", { get: () => index, enumerable: true });
  control.to = (next) => {
    retarget(next);
    effect.driver.jump(0);
    effect.driver.play();
    return effect.driver.finished;
  };
  control.trackTo = (next, trackOptions = {}) => {
    retarget(next);
    effect.driver.jump(0);
    return effect.driver.track(trackOptions);
  };
  return control;
}

/** A compatible menu ↔ close pair (24×24 viewBox, three strokes each; the middle bar becomes a diagonal). */
export const menuCloseShapes = Object.freeze({
  menu: "M4 6L20 6M4 12L20 12M4 18L20 18",
  close: "M6 6L18 18M6 6L18 18M6 18L18 6",
});

export interface IconMorphOptions extends Omit<PathMorphOptions, "shapes" | "initial"> {
  /** Named compatible shapes (e.g. `menuCloseShapes`). */
  shapes: Readonly<Record<string, string>>;
  /** Initial state name (default: the first key). */
  state?: string;
}

export interface IconMorphControl extends ProgressControl {
  readonly state: PathMorphControl["state"];
  /** The current (target) state name. */
  readonly name: string;
  set(name: string): Promise<unknown>;
}

/** S04 — morph an icon path between named states. */
export function createIconMorph(path: Element, options: IconMorphOptions): IconMorphControl {
  const names = Object.keys(options?.shapes ?? {});
  if (names.length < 2)
    throw animationsError("createIconMorph", '"shapes" must name at least two shapes.');
  const initial = options.state ?? (names[0] as string);
  if (!names.includes(initial))
    throw animationsError("createIconMorph", `unknown state ${JSON.stringify(initial)}.`);
  const morph = createPathMorph(path, {
    ...options,
    shapes: names.map((name) => options.shapes[name] as string),
    initial: names.indexOf(initial),
    duration: options.duration ?? 350,
  });
  let name = initial;
  const control = morph as unknown as IconMorphControl;
  Object.defineProperty(control, "name", { get: () => name, enumerable: true });
  control.set = (next) => {
    if (!names.includes(next))
      throw animationsError("createIconMorph", `unknown state ${JSON.stringify(next)}.`);
    name = next;
    return morph.to(names.indexOf(next));
  };
  return control;
}
