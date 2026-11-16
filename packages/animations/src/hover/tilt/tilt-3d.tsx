"use client";
/**
 * `<Tilt3D>` (contracts/tilt-3d.md §1): a `<div>` (or, with `asChild`, your own single element)
 * that tilts in 3D under the pointer (inward by default) and springs back to rest. Server-rendered markup is only the
 * element with the `neshel-tilt` class; the effect starts after hydration.
 */
import { Slot } from "@radix-ui/react-slot";
import {
  Children,
  Fragment,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  type Ref,
  useCallback,
  useRef,
} from "react";
import { animationsError } from "../../core/errors.js";
import type { Tilt3DOptions } from "./options.js";
import { useTilt3D } from "./use-tilt-3d.js";

export interface Tilt3DProps
  extends Tilt3DOptions,
    Omit<HTMLAttributes<HTMLDivElement>, keyof Tilt3DOptions> {
  /** Apply the effect to the single child element instead of rendering a `<div>`. */
  asChild?: boolean;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

export function Tilt3D({
  maxTilt,
  perspective,
  scale,
  axis,
  reverse,
  spring,
  pointerTypes,
  focusTilt,
  reducedMotion,
  disabled,
  asChild = false,
  className,
  ref,
  children,
  ...rest
}: Tilt3DProps) {
  const element = useRef<HTMLDivElement | null>(null);
  useTilt3D(element, {
    maxTilt,
    perspective,
    scale,
    axis,
    reverse,
    spring,
    pointerTypes,
    focusTilt,
    reducedMotion,
    disabled,
  });
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      element.current = node;
      assignRef(ref, node);
    },
    [ref],
  );
  const classes = className ? `neshel-tilt ${className}` : "neshel-tilt";

  if (asChild) {
    if (!isValidElement(children) || children.type === Fragment) {
      const count = Children.count(children);
      const received = isValidElement(children)
        ? "a Fragment"
        : count === 1
          ? typeof children
          : `${count} children`;
      throw animationsError(
        "Tilt3D",
        `asChild expects exactly one React element child that accepts a ref and className (received ${received}).`,
      );
    }
    return (
      <Slot {...rest} ref={setRef} className={classes}>
        {children}
      </Slot>
    );
  }
  return (
    <div {...rest} ref={setRef} className={classes}>
      {children}
    </div>
  );
}
