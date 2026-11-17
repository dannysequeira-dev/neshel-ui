/**
 * Stable key of option values (internal): functions and symbols by type, elements and `window` by
 * identity, objects with `toJSON` (e.g. a `ScrollProgress`) by their id. Used to decide whether an
 * attachment needs `update` (React bindings) or a timeline must be re-created (scroll effects).
 */
import { elementKey } from "./dev.js";

export function optionsKeyOf(value: unknown): string {
  try {
    return JSON.stringify(value ?? null, (_key, item) => {
      if (typeof item === "function" || typeof item === "symbol") return `[${typeof item}]`;
      if (typeof window !== "undefined" && item === window) return "[window]";
      if (item && typeof item === "object" && "nodeType" in item) {
        return `[element ${elementKey(item)}]`;
      }
      return item;
    });
  } catch {
    return String(Math.random()); // circular options: update on every render
  }
}
