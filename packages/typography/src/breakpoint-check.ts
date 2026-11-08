/**
 * Breakpoint keys of responsive props (ADR 0010; contracts/breakpoints.md §3).
 * Shared verbatim by @neshel-ui/layout and @neshel-ui/typography (a drift test keeps the two
 * copies identical; neither package may depend on the other or on the private core package).
 *
 * - `isBreakpointKey`: the grammar every key must match (authoritative everywhere).
 * - `warnUnknownBreakpoint`: browser-only diagnostic against the names declared by the loaded
 *   Neshel stylesheet in `--neshel-breakpoints`. Never runs during SSR, never changes markup.
 */

const KEY = /^(?:base|2xl|[a-z][A-Za-z0-9]*)$/;

/** `base`, a default name or a configured name (`^[a-z][A-Za-z0-9]*$`). */
export function isBreakpointKey(key: string): boolean {
  return KEY.test(key);
}

let registry: ReadonlySet<string> | undefined;
const checked = new Set<string>();

function readRegistry(): ReadonlySet<string> | undefined {
  const root = globalThis.document?.documentElement;
  if (!root || typeof globalThis.getComputedStyle !== "function") return undefined;
  const raw = globalThis.getComputedStyle(root).getPropertyValue("--neshel-breakpoints");
  const names = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .split(/\s+/)
    .filter(Boolean);
  return names.length > 0 ? new Set(names) : undefined;
}

/**
 * Warn once per key when a well-formed breakpoint key is not declared by the loaded stylesheet.
 * Silent on the server, for `base`, and while no Neshel stylesheet declares its breakpoints.
 */
export function warnUnknownBreakpoint(source: string, key: string): void {
  if (key === "base" || checked.has(key) || typeof globalThis.window === "undefined") return;
  registry ??= readRegistry();
  if (!registry) return; // nothing to compare against yet; check again for later renders
  checked.add(key);
  if (registry.has(key)) return;
  console.warn(
    `${source}: breakpoint "${key}" is not defined by the loaded Neshel stylesheet (defined: ${[...registry].join(" ")}). Configure it in neshel.config.ts and run "neshel generate".`,
  );
}

/** Test hook: forget the cached registry and warnings. */
export function resetBreakpointCheck(): void {
  registry = undefined;
  checked.clear();
}
