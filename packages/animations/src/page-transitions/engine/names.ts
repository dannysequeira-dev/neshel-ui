/**
 * Shared and persistent element names (PT02, PT08; contracts/page-transitions.md §3).
 *
 * Elements register under a stable name; names are written ONLY while a transition runs, through each
 * element's Motion Host as internal exclusive channels (`view-transition-name`, `view-transition-class`;
 * excluded from `will-change`) and flushed synchronously so the browser captures them. Uniqueness is
 * checked before every capture: duplicate names would abort the whole transition (research R1), so only
 * the first connected element of a name is named and the others are skipped with a development warning.
 */
import { releaseChannels, requestChannels, setExclusive } from "../../core/arbiter.js";
import { describeElement, devWarnOnce } from "../../core/dev.js";
import { animationsError } from "../../core/errors.js";
import { type Claim, type ExclusiveChannel, getMotionHost } from "../../core/host.js";

declare const process: { env: { NODE_ENV?: string } } | undefined;

type Styled = Element & { readonly style: CSSStyleDeclaration };

interface Entry {
  element: Styled;
  persist: boolean;
}

const registry = new Map<string, Entry[]>();
const NAME = /^[a-z][a-z0-9-]*$/;
const NAME_CHANNEL = "view-transition-name" as ExclusiveChannel;
const CLASS_CHANNEL = "view-transition-class" as ExclusiveChannel;

/** CSS `view-transition-name` of a registered name (prefixed so it never collides with the app's own). */
export const cssName = (name: string) => `neshel-${name}`;

export function validName(name: unknown): name is string {
  return typeof name === "string" && NAME.test(name);
}

/** Register an element under a shared name; returns the unregister function. */
export function registerSharedElement(
  element: Element,
  name: string,
  options: { persist?: boolean } = {},
): () => void {
  if (!validName(name)) {
    throw animationsError(
      "registerSharedElement",
      `invalid name ${JSON.stringify(name)}; expected lowercase letters, digits and hyphens.`,
    );
  }
  const entry: Entry = { element: element as Styled, persist: options.persist === true };
  const list = registry.get(name) ?? [];
  list.push(entry);
  registry.set(name, list);
  return () => {
    const current = registry.get(name);
    if (!current) return;
    const index = current.indexOf(entry);
    if (index >= 0) current.splice(index, 1);
    if (current.length === 0) registry.delete(name);
  };
}

/** The connected element that owns `name` now (first registered), and the skipped duplicates. */
function pick(name: string): { owner: Entry | undefined; skipped: Entry[] } {
  const connected = (registry.get(name) ?? []).filter((entry) => entry.element.isConnected);
  return { owner: connected[0], skipped: connected.slice(1) };
}

/** Snapshot of the current owners (connected, unique per name). */
export function currentOwners(): Map<string, Entry> {
  const owners = new Map<string, Entry>();
  for (const name of registry.keys()) {
    const { owner, skipped } = pick(name);
    if (!owner) continue;
    owners.set(name, owner);
    if (
      skipped.length > 0 &&
      typeof process !== "undefined" &&
      process.env.NODE_ENV !== "production"
    ) {
      devWarnOnce(
        `vt-duplicate:${name}`,
        `shared element name "${name}" is used by ${skipped.length + 1} connected elements; only ${describeElement(owner.element)} is named (${skipped.map((s) => describeElement(s.element)).join(", ")} skipped).`,
      );
    }
  }
  return owners;
}

/** A set of name/class writes for one transition; `release()` restores every element exactly. */
export interface NameWrites {
  write(element: Element, name: string | undefined, className: string | undefined): void;
  clear(element: Element): void;
  release(): void;
  readonly elements: ReadonlySet<Element>;
}

export function createNameWrites(id: string): NameWrites {
  const claims = new Map<Element, Claim>();
  return {
    get elements() {
      return new Set(claims.keys());
    },
    write(element, name, className) {
      const host = getMotionHost(element as Styled);
      let claim = claims.get(element);
      if (!claim) {
        claim = {
          id,
          priority: 0,
          channels: [NAME_CHANNEL, CLASS_CHANNEL],
          onGrant: () => {},
          onRevoke: () => {},
        };
        requestChannels(host, claim, "silent");
        claims.set(element, claim);
      }
      setExclusive(host, claim, NAME_CHANNEL, name);
      setExclusive(host, claim, CLASS_CHANNEL, className);
      host.flush();
    },
    clear(element) {
      const claim = claims.get(element);
      if (!claim) return;
      const host = getMotionHost(element as Styled);
      releaseChannels(host, claim);
      claims.delete(element);
      host.flush();
    },
    release() {
      for (const [element, claim] of claims) {
        const host = getMotionHost(element as Styled);
        releaseChannels(host, claim);
        host.flush();
      }
      claims.clear();
    },
  };
}
