/**
 * Gesture controls (Phase 012; contracts/gesture-engine.md §7): a stable object the consumer wires to buttons
 * or commands — the non-gesture alternatives of WCAG 2.5.1 / 2.5.7. The attached effect binds its
 * implementation while it lives; calls without an implementation are ignored (development warning).
 */
import { devWarnOnce } from "../../core/dev.js";

declare const process: { env: { NODE_ENV?: string } } | undefined;

export interface GestureControls {
  moveBy(dx: number, dy: number): void;
  moveTo(x: number, y: number): void;
  snapTo(index: number): void;
  zoomBy(factor: number): void;
  zoomTo(scale: number): void;
  rotateBy(degrees: number): void;
  reset(): void;
  dismiss(): void;
  refresh(): void;
}

type Command = keyof GestureControls;
const COMMANDS: readonly Command[] = [
  "moveBy",
  "moveTo",
  "snapTo",
  "zoomBy",
  "zoomTo",
  "rotateBy",
  "reset",
  "dismiss",
  "refresh",
];

const BINDINGS = new WeakMap<object, Array<Partial<GestureControls>>>();

/** Create a controls object (one per controlled element; stable for its lifetime). */
export function createGestureControls(): GestureControls {
  const stack: Array<Partial<GestureControls>> = [];
  const controls: Record<string, (...args: number[]) => void> = {};
  for (const command of COMMANDS) {
    controls[command] = (...args) => {
      for (let i = stack.length - 1; i >= 0; i--) {
        const fn = stack[i]?.[command] as ((...a: number[]) => void) | undefined;
        if (fn) {
          fn(...args);
          return;
        }
      }
      if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
        devWarnOnce(
          `controls:${command}`,
          `gesture control "${command}" has no attached effect that implements it.`,
        );
      }
    };
  }
  BINDINGS.set(controls, stack);
  return Object.freeze(controls) as unknown as GestureControls;
}

export const isGestureControls = (value: unknown): value is GestureControls =>
  typeof value === "object" && value !== null && BINDINGS.has(value);

/** Bind an effect's implementation; returns the unbind function. */
export function bindControls(
  controls: GestureControls | undefined,
  implementation: Partial<GestureControls>,
): () => void {
  const stack = controls ? BINDINGS.get(controls) : undefined;
  if (!stack) return () => {};
  stack.push(implementation);
  return () => {
    const index = stack.lastIndexOf(implementation);
    if (index !== -1) stack.splice(index, 1);
  };
}
