/**
 * Runtime prop validation mirroring the TypeScript contract for JavaScript consumers (ADR 0009 §6).
 * Pure; throws `NeshelComponentsError` during render on server and client alike.
 */
import { componentsError } from "./errors.js";

export const describe = (value: unknown): string =>
  typeof value === "string" ? JSON.stringify(value) : String(value);

export const present = (value: unknown): boolean => value !== undefined && value !== null;

/** A value from a closed list, or the fallback when absent. */
export function oneOf<T extends string>(
  component: string,
  prop: string,
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!present(value)) return fallback;
  if (!allowed.includes(value as T)) {
    throw componentsError(
      component,
      `invalid value ${describe(value)} for "${prop}"; expected one of: ${allowed.map(describe).join(", ")}.`,
    );
  }
  return value as T;
}

/** A boolean flag (`undefined`/`null` → false). */
export function flag(component: string, prop: string, value: unknown): boolean {
  if (!present(value)) return false;
  if (typeof value !== "boolean") {
    throw componentsError(
      component,
      `invalid value ${describe(value)} for "${prop}"; expected a boolean.`,
    );
  }
  return value;
}

/** Join class names, skipping empty and non-string values. */
export function cx(...classes: unknown[]): string {
  return classes.filter((item) => typeof item === "string" && item !== "").join(" ");
}
