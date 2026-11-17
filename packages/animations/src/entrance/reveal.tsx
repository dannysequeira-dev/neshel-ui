"use client";
/**
 * `<Reveal>` and `<Stagger>` (Phase 010; contracts/presets.md §4): the entrance primitives. A `<div>` (or,
 * with `asChild`, your own element) that plays an entrance preset when it mounts on the client and when
 * `replayKey` changes. Server markup is the element with its class only — content is visible without
 * JavaScript; while hydrating server markup the entrance does not replay by default (`appear="client"`).
 */
import type { HTMLAttributes, ReactNode, Ref } from "react";
import type { ConflictPolicy } from "../core/arbiter.js";
import type { MotionResult } from "../core/controls.js";
import type { PresetInput } from "../core/preset.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import {
  joinClass,
  presetEntries,
  renderHost,
  useFirstRenderHydrating,
  useHostRef,
} from "../react/motion-host.js";
import { useMotionPresets } from "../react/use-motion-presets.js";
import type { EntranceOptions } from "./factory.js";
import { type StaggerOrder, stagger } from "./stagger.js";

/** When the entrance plays on mount: client-only mounts (default), always, or never (replay only). */
export type RevealAppear = "client" | "always" | "never";

interface HostProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Apply the effect to the single child element instead of rendering a `<div>`. */
  asChild?: boolean;
  /** Conflict reporting for exclusive channels (default: warn in development). */
  conflicts?: ConflictPolicy;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface RevealProps<Options extends EntranceOptions, Resolved> extends HostProps {
  /** An entrance definition (`fadeIn`, `clipReveal`, …) or preset (`fadeUp`, `clipCircle`, …). */
  preset: PresetInput<Options, Resolved>;
  /** Options merged over the preset's options. */
  options?: NoInfer<Partial<Options>>;
  appear?: RevealAppear;
  /** Changing this value replays the entrance. */
  replayKey?: string | number;
}

function useAppear(appear: RevealAppear): boolean {
  const hydrating = useFirstRenderHydrating();
  return appear === "always" || (appear === "client" && !hydrating);
}

export function Reveal<Options extends EntranceOptions, Resolved>({
  preset,
  options,
  appear = "client",
  replayKey,
  asChild = false,
  conflicts,
  className,
  ref,
  children,
  ...rest
}: RevealProps<Options, Resolved>) {
  const [element, setRef] = useHostRef(ref);
  const play = useAppear(appear);
  const entries = presetEntries("Reveal", ["entrance"], preset, options, {
    appear: play,
    replay: replayKey,
  });
  useMotionPresets(element, entries, { conflicts });
  return renderHost(
    "Reveal",
    asChild,
    { ...rest, ref: setRef, className: joinClass("neshel-reveal", className) },
    children,
  );
}

export interface StaggerProps<Options extends EntranceOptions, Resolved> extends HostProps {
  /** Entrance applied to every element child. */
  preset: PresetInput<Options, Resolved>;
  options?: NoInfer<Partial<Options>>;
  /** Delay between children in ms (default 60). */
  interval?: number;
  order?: StaggerOrder;
  /** Upper bound of the total stagger in ms (default 900). */
  maxStagger?: number;
  /** Delay before the first child in ms (default 0). */
  delay?: number;
  reducedMotion?: ReducedMotion;
  appear?: RevealAppear;
  replayKey?: string | number;
  onFinish?: (status: MotionResult["status"]) => void;
}

export function Stagger<Options extends EntranceOptions, Resolved>({
  preset,
  options,
  interval,
  order,
  maxStagger,
  delay,
  reducedMotion,
  onFinish,
  appear = "client",
  replayKey,
  asChild = false,
  conflicts,
  className,
  ref,
  children,
  ...rest
}: StaggerProps<Options, Resolved>) {
  const [element, setRef] = useHostRef(ref);
  const play = useAppear(appear);
  useMotionPresets(
    element,
    [
      {
        effect: stagger,
        options: {
          preset,
          options,
          interval,
          order,
          maxStagger,
          delay,
          reducedMotion,
          onFinish,
          appear: play,
          replay: replayKey,
        },
      },
    ],
    { conflicts },
  );
  return renderHost(
    "Stagger",
    asChild,
    { ...rest, ref: setRef, className: joinClass("neshel-stagger", className) },
    children,
  );
}
