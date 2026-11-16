/**
 * Development diagnostics shared by the engine. Never throws.
 *
 * Call sites guard development-only work with the literal expression
 * `typeof process !== "undefined" && process.env.NODE_ENV !== "production"`, which application
 * bundlers replace at build time, so warning code and strings are removed from production bundles.
 */

// Module-scoped declaration (no dependency on @types/node).
declare const process: { env: { NODE_ENV?: string } } | undefined;

/** Whether this is a production build/runtime (`process.env.NODE_ENV === "production"`). */
export function isProduction(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "production";
}

const warned = new Set<string>();

export function devWarnOnce(key: string, message: string): void {
  if (isProduction() || warned.has(key)) return;
  warned.add(key);
  console.warn(`[@neshel-ui/animations] ${message}`);
}

/** Short, stable description of an element for messages: `<div#id.class>`. */
export function describeElement(element: unknown): string {
  const node = element as { tagName?: string; id?: string; classList?: ArrayLike<string> };
  const tag = node.tagName?.toLowerCase() ?? "element";
  const id = node.id ? `#${node.id}` : "";
  const first = node.classList?.[0];
  return `<${tag}${id}${first ? `.${first}` : ""}>`;
}

const elementIds = new WeakMap<object, number>();
let nextElementId = 1;

/** Stable numeric key of an element (for once-per-element warnings). */
export function elementKey(element: object): number {
  let id = elementIds.get(element);
  if (id === undefined) {
    id = nextElementId++;
    elementIds.set(element, id);
  }
  return id;
}
