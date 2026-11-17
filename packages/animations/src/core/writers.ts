/** Small writers shared by Phase 010 effects (internal). */

/** Write a channel value only when it changes; `undefined` clears (restores the baseline). */
export function propertyWriter(handle: { set(value: string): void; clear(): void }) {
  let last: string | undefined;
  return (value: string | undefined) => {
    if (value === last) return;
    last = value;
    if (value === undefined) handle.clear();
    else handle.set(value);
  };
}

/** Number formatted for a custom property (rounded, no exponent for small values). */
export const fixed = (value: number, digits = 3): string =>
  String(Math.round(value * 10 ** digits) / 10 ** digits);
