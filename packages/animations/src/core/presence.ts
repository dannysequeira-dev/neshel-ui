/**
 * Presence state machine (Phase 012, shared from `src/core` since Phase 015 by `./layout` L08 and `./feedback` F06;
 * contracts/layout-engine.md §7, research R8). Framework-free and pure: it
 * merges successive keyed child lists, keeping removed keys in place as `exiting` until `remove(key,
 * generation)` confirms their exit, and turning re-added keys back to `present`. Timers, animations and focus
 * live in the caller (the React `<Presence>` item); every transition is idempotent, so a repeated `update`
 * with the same list (StrictMode double render) changes nothing.
 */

export type PresenceStatus = "present" | "exiting";

export interface PresenceEntry<T> {
  readonly key: string;
  readonly value: T;
  readonly status: PresenceStatus;
  /** Increments on every status change; `remove` only acts on the generation it was given. */
  readonly generation: number;
}

export interface Presence<T> {
  readonly entries: readonly PresenceEntry<T>[];
  /** Merge the next ordered children; returns whether anything changed. */
  update(next: ReadonlyArray<{ key: string; value: T }>): boolean;
  /** An exit finished: remove the key if it is still exiting in `generation`. */
  remove(key: string, generation: number): boolean;
  /** Remove every exiting entry at once (container unmount, hidden page). */
  flush(): boolean;
}

export function createPresence<T>(): Presence<T> {
  let entries: PresenceEntry<T>[] = [];

  return {
    get entries() {
      return entries;
    },
    update(next) {
      const previous = new Map(entries.map((entry) => [entry.key, entry]));
      const nextKeys = new Set<string>();
      let changed = false;
      const result: PresenceEntry<T>[] = [];
      for (const { key, value } of next) {
        if (nextKeys.has(key)) continue; // duplicate keys: the first wins (React warns separately)
        nextKeys.add(key);
        const old = previous.get(key);
        if (!old) {
          changed = true;
          result.push({ key, value, status: "present", generation: 0 });
        } else if (old.status === "exiting") {
          changed = true; // re-entry during an exit
          result.push({ key, value, status: "present", generation: old.generation + 1 });
        } else {
          if (old.value !== value) changed = true;
          result.push(old.value === value ? old : { ...old, value });
        }
      }
      // Keep removed keys at their position, after the nearest preceding key that is still rendered.
      entries.forEach((entry, index) => {
        if (nextKeys.has(entry.key)) return;
        let at = 0;
        for (let j = index - 1; j >= 0; j--) {
          const before = entries[j]?.key;
          const found = result.findIndex((item) => item.key === before);
          if (found !== -1) {
            at = found + 1;
            break;
          }
        }
        if (entry.status === "present") {
          changed = true;
          result.splice(at, 0, { ...entry, status: "exiting", generation: entry.generation + 1 });
        } else result.splice(at, 0, entry);
      });
      if (changed || result.length !== entries.length) entries = result;
      return changed;
    },
    remove(key, generation) {
      const index = entries.findIndex(
        (entry) =>
          entry.key === key && entry.status === "exiting" && entry.generation === generation,
      );
      if (index === -1) return false;
      entries = entries.filter((_, i) => i !== index);
      return true;
    },
    flush() {
      const kept = entries.filter((entry) => entry.status === "present");
      if (kept.length === entries.length) return false;
      entries = kept;
      return true;
    },
  };
}
