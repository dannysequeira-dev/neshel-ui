"use client";
/**
 * `useTilt3D(ref, options)`: attaches the Tilt3D controller to an element you render yourself
 * (contracts/tilt-3d.md §4). Options are validated during render, identically on the server and
 * the client; the controller is created after mount and destroyed on unmount. Changing options
 * never re-creates listeners and never re-renders on pointer movement.
 */
import { type RefObject, useEffect, useRef } from "react";
import { createTilt3D, type Tilt3DController } from "./controller.js";
import { resolveTilt3DOptions, type Tilt3DOptions } from "./options.js";

/** Stable key of the option values (option objects are usually re-created on every render). */
function optionsKey(options: Tilt3DOptions): string {
  const { spring, pointerTypes, ...rest } = options;
  return JSON.stringify([rest, spring ?? null, pointerTypes ?? null]);
}

export function useTilt3D(ref: RefObject<HTMLElement | null>, options: Tilt3DOptions = {}): void {
  resolveTilt3DOptions(options);
  const latest = useRef(options);
  latest.current = options;
  const controller = useRef<Tilt3DController | undefined>(undefined);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const instance = createTilt3D(element, latest.current);
    controller.current = instance;
    return () => {
      instance.destroy();
      controller.current = undefined;
    };
  }, [ref]);

  const key = optionsKey(options);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` captures every option value.
  useEffect(() => {
    controller.current?.update(latest.current);
  }, [key]);
}
