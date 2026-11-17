/**
 * Option validation shared by Phase 010 effects (same errors on the server and the client, ADR 0009 §6).
 * Pure; every message names the effect and the option.
 */
import { resolveDuration, resolveSpringPreset } from "./controls.js";
import type { DurationPreset, SpringPreset } from "./defaults.js";
import { type Easing, type EasingPreset, resolveEasing } from "./easing.js";
import { animationsError } from "./errors.js";
import { REDUCED_MOTION_VALUES, type ReducedMotion } from "./reduced-motion.js";
import type { SpringOptions } from "./spring.js";

const describe = (value: unknown) =>
  typeof value === "string" ? JSON.stringify(value) : String(value);

export interface Validator {
  fail(message: string): never;
  /** Plain-object options (or undefined). */
  options<T extends object>(value: T | undefined): Partial<T>;
  number(name: string, value: unknown, fallback: number, min: number, max: number): number;
  oneOf<T extends string>(name: string, value: unknown, allowed: readonly T[], fallback: T): T;
  flag(name: string, value: unknown, fallback: boolean): boolean;
  /** A CSS value for a custom property: non-empty, at most 200 characters, no `;`, `{` or `}`. */
  css(name: string, value: unknown, fallback: string): string;
  callback<F extends (...args: never[]) => unknown>(name: string, value: unknown): F | undefined;
  duration(name: string, value: unknown, fallback: number | DurationPreset): number;
  easing(value: unknown, fallback?: EasingPreset): Easing;
  spring(value: unknown, fallback: SpringOptions | SpringPreset): Required<SpringOptions>;
  reducedMotion(value: unknown): ReducedMotion;
  /** Anything usable as a change key (`trigger`, `replay`). */
  key(name: string, value: unknown): string | number | boolean | undefined;
}

export function validator(effect: string): Validator {
  const fail = (message: string): never => {
    throw animationsError(effect, message);
  };
  const invalid = (name: string, value: unknown, expected: string): never =>
    fail(`invalid value ${describe(value)} for "${name}"; expected ${expected}.`);
  return {
    fail,
    options(value) {
      if (value === undefined || value === null) return {};
      if (typeof value !== "object" || Array.isArray(value)) fail("options must be an object.");
      return value;
    },
    number(name, value, fallback, min, max) {
      if (value === undefined || value === null) return fallback;
      if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
        invalid(name, value, `a number from ${min} to ${max}`);
      }
      return value as number;
    },
    oneOf(name, value, allowed, fallback) {
      if (value === undefined || value === null) return fallback;
      if (!allowed.includes(value as never)) {
        invalid(name, value, `one of: ${allowed.map(describe).join(", ")}`);
      }
      return value as (typeof allowed)[number];
    },
    flag(name, value, fallback) {
      if (value === undefined || value === null) return fallback;
      if (typeof value !== "boolean") invalid(name, value, "a boolean");
      return value as boolean;
    },
    css(name, value, fallback) {
      if (value === undefined || value === null) return fallback;
      if (
        typeof value !== "string" ||
        value.trim() === "" ||
        value.length > 200 ||
        /[;{}]/.test(value)
      ) {
        invalid(name, value, "a CSS value (no ';', '{' or '}', at most 200 characters)");
      }
      return (value as string).trim();
    },
    callback(name, value) {
      if (value === undefined || value === null) return undefined;
      if (typeof value !== "function") invalid(name, value, "a function");
      return value as never;
    },
    duration(name, value, fallback) {
      try {
        const ms = resolveDuration((value ?? fallback) as number | DurationPreset);
        if (ms > 10_000) throw new RangeError("at most 10000 ms");
        return ms;
      } catch (error) {
        return fail(`invalid "${name}": ${(error as Error).message}.`);
      }
    },
    easing(value, fallback = "standard") {
      try {
        return resolveEasing((value ?? fallback) as Easing | EasingPreset);
      } catch (error) {
        return fail(`invalid "easing": ${(error as Error).message}.`);
      }
    },
    spring(value, fallback) {
      try {
        return resolveSpringPreset((value ?? fallback) as SpringOptions | SpringPreset);
      } catch (error) {
        return fail(`invalid "spring": ${(error as Error).message}.`);
      }
    },
    reducedMotion(value) {
      return this.oneOf("reducedMotion", value, REDUCED_MOTION_VALUES, "user");
    },
    key(name, value) {
      if (value === undefined || value === null) return undefined;
      if (!["string", "number", "boolean"].includes(typeof value)) {
        invalid(name, value, "a string, number or boolean");
      }
      return value as string | number | boolean;
    },
  };
}
