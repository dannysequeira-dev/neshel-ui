"use client";
/**
 * React bindings of the Background & Ambient family (Phase 015; contracts/ambient-api.md). Each component renders
 * `div.neshel-ambient` (positioned, its own stacking context) around optional children — the content stays above
 * the decoration and fully interactive — and attaches the engine after hydration (nothing moves before the
 * engine allows it). No React state per frame.
 */
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { useEngine } from "../react/use-engine.js";
import {
  type CanvasAmbientOptions,
  createParticles,
  createStarfield,
  type ParticlesOptions,
  type StarfieldOptions,
} from "./canvas.js";
import type { AmbientControl } from "./engine/ambient.js";
import { ambientMotion, registerToggle } from "./engine/registry.js";
import {
  createFloatingShapes,
  createPointerGlow,
  type FloatingShapesOptions,
  type PointerGlowOptions,
} from "./interactive.js";
import {
  type AuroraOptions,
  createAurora,
  createGradientShift,
  createGrain,
  createGridPattern,
  createMeshGradient,
  createWaves,
  type GradientShiftOptions,
  type GrainOptions,
  type GridPatternOptions,
  type MeshGradientOptions,
  type WavesOptions,
} from "./layers.js";

const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

type DivProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children?: ReactNode;
  controlRef?: RefObject<AmbientControl | null>;
};

const OPTION_KEYS = new Set([
  "duration",
  "reducedMotion",
  "trigger",
  "colors",
  "angle",
  "speed",
  "blobs",
  "intensity",
  "opacity",
  "scale",
  "jitter",
  "blend",
  "pattern",
  "cell",
  "lineWidth",
  "color",
  "direction",
  "fade",
  "amplitude",
  "layers",
  "wavelength",
  "position",
  "density",
  "max",
  "size",
  "links",
  "linkDistance",
  "mode",
  "twinkle",
  "seed",
  "fps",
  "maxDpr",
  "lowPower",
  "rotate",
  "period",
  "smoothing",
  "pointerTypes",
]);

function split<O>(props: Record<string, unknown>): [O, Record<string, unknown>] {
  const options: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (OPTION_KEYS.has(key)) {
      if (value !== undefined) options[key] = value;
    } else rest[key] = value;
  }
  return [options as O, rest];
}

function useAmbient<O>(
  props: DivProps & O,
  create: (el: HTMLDivElement, options: O) => AmbientControl,
  extraClass?: string,
) {
  const { children, controlRef, className, ...all } = props;
  const [options, rest] = split<O>(all as Record<string, unknown>);
  const ref = useRef<HTMLDivElement | null>(null);
  const handle = useEngine<HTMLDivElement, AmbientControl>(
    ref,
    (el) => create(el, options),
    options,
  );
  useClientLayoutEffect(() => {
    if (controlRef) controlRef.current = handle.current;
  });
  const classes = ["neshel-ambient", extraClass, className].filter(Boolean).join(" ");
  return (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  );
}

export type GradientShiftProps = DivProps & GradientShiftOptions;
/** B01 — gradient shift behind the children. */
export function GradientShift(props: GradientShiftProps) {
  return useAmbient(props, createGradientShift);
}
export type AuroraProps = DivProps & AuroraOptions;
/** B02 — aurora blobs behind the children. */
export function Aurora(props: AuroraProps) {
  return useAmbient(props, createAurora);
}
export type GrainProps = DivProps & GrainOptions;
/** B03 — grain overlay (static texture by default). */
export function Grain(props: GrainProps) {
  return useAmbient(props, createGrain);
}
export type ParticlesProps = DivProps & ParticlesOptions;
/** B04 — particle field on a decorative canvas. */
export function Particles(props: ParticlesProps) {
  return useAmbient(props, createParticles);
}
export type StarfieldProps = DivProps & StarfieldOptions;
/** B05 — starfield on a decorative canvas. */
export function Starfield(props: StarfieldProps) {
  return useAmbient(props, createStarfield);
}
export type GridPatternProps = DivProps & GridPatternOptions;
/** B06 — drifting grid or dots. */
export function GridPattern(props: GridPatternProps) {
  return useAmbient(props, createGridPattern);
}
export type MeshGradientProps = DivProps & MeshGradientOptions;
/** B07 — mesh gradient. */
export function MeshGradient(props: MeshGradientProps) {
  return useAmbient(props, createMeshGradient);
}
export type FloatingShapesProps = DivProps & FloatingShapesOptions;
/** B08 — the children are the shapes (mark purely visual shapes `aria-hidden`). */
export function FloatingShapes(props: FloatingShapesProps) {
  return useAmbient(props, createFloatingShapes, "neshel-floating-shapes");
}
export type PointerGlowProps = DivProps & PointerGlowOptions;
/** B09 — glow following the pointer behind the children. */
export function PointerGlow(props: PointerGlowProps) {
  return useAmbient(props, createPointerGlow);
}
export type WavesProps = DivProps & WavesOptions;
/** B10 — layered SVG waves. */
export function Waves(props: WavesProps) {
  return useAmbient(props, createWaves);
}

export type AmbientMotionToggleProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "onClick" | "aria-pressed"
> & {
  /** Visible label (default "Pause background motion"); `aria-pressed` reports the paused state. */
  label?: string;
};

const subscribe = (fn: () => void) => ambientMotion.subscribe(fn);
const getPaused = () => ambientMotion.paused;
const getServerPaused = () => false;

/** The page-level pause control for ambient motion (WCAG 2.2.2): a native toggle button. */
export function AmbientMotionToggle({
  label = "Pause background motion",
  className,
  ...rest
}: AmbientMotionToggleProps) {
  const paused = useSyncExternalStore(subscribe, getPaused, getServerPaused);
  useEffect(() => registerToggle(), []);
  return (
    <button
      type="button"
      className={["neshel-ambient-toggle", className].filter(Boolean).join(" ")}
      aria-pressed={paused}
      onClick={() => ambientMotion.toggle()}
      {...rest}
    >
      {label}
    </button>
  );
}

export type { CanvasAmbientOptions };
