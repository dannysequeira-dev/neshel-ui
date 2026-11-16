"use client";
/** Motion values in React without re-renders (contracts/react-bindings.md §2). */
import { useEffect, useRef, useState } from "react";
import { type MotionValue, motionValue } from "../core/motion-value.js";

/** A motion value that is stable for the component's lifetime. */
export function useMotionValue(initial: number): MotionValue {
  const [value] = useState(() => motionValue(initial));
  return value;
}

/** Subscribe to a motion value without re-rendering; the latest listener is always called. */
export function useMotionValueEvent(value: MotionValue, listener: (current: number) => void): void {
  const latest = useRef(listener);
  latest.current = listener;
  useEffect(() => value.subscribe((current) => latest.current(current)), [value]);
}
