/**
 * Reduced-motion policy (contracts/accessibility.md, constitution IV).
 *
 * - `"user"` (default everywhere): follow `prefers-reduced-motion`.
 * - `"always"`: always use the reduced variant (e.g. an application-level "reduce motion" setting).
 * - `"never"`: ignore the preference. Reserved for motion essential to the meaning (WCAG 2.3.3);
 *   effects in this package never default to it.
 */

export type ReducedMotion = "user" | "always" | "never";

export const REDUCED_MOTION_VALUES: readonly ReducedMotion[] = ["user", "always", "never"];

const QUERY = "(prefers-reduced-motion: reduce)";

type MediaHost = { matchMedia?: (query: string) => MediaQueryList };

function mediaQuery(): MediaQueryList | undefined {
  const host = globalThis as MediaHost;
  return typeof host.matchMedia === "function" ? host.matchMedia(QUERY) : undefined;
}

/** Current OS/browser preference; `false` on the server or without `matchMedia`. */
export function prefersReducedMotion(): boolean {
  return mediaQuery()?.matches ?? false;
}

/** Whether motion must be reduced for `policy` given the system preference. */
export function shouldReduceMotion(policy: ReducedMotion, systemPrefersReduced: boolean): boolean {
  return policy === "always" || (policy === "user" && systemPrefersReduced);
}

/** Call `listener` whenever the preference changes; returns the unsubscribe function. */
export function subscribeReducedMotion(listener: (reduced: boolean) => void): () => void {
  const list = mediaQuery();
  if (!list) return () => {};
  const onChange = (event: MediaQueryListEvent) => listener(event.matches);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}
