/**
 * Motion host (ADR 0022; contracts/channels-and-arbitration.md, contracts/style-ownership.md).
 *
 * One host per element is the only engine writer of the element's managed inline styles:
 * - channels: `transform` composes layers, `opacity` multiplies contributions, every other channel is
 *   exclusive (one owner, arbitrated by priority; ties keep the existing owner; losers wait and resume);
 * - style ledger: the original inline value and priority of each property are captured on first use,
 *   combined while animating (transform prefix, opacity factor, will-change union) and restored
 *   exactly on release; external inline changes become the new baseline; each property is written at
 *   most once per frame and only when its value changes.
 */
import { composeTransform, type TransformLayer } from "./compose.js";
import { describeElement, devWarnOnce, isProduction } from "./dev.js";
import { animationsError } from "./errors.js";
import { type FrameScheduler, getFrameScheduler } from "./scheduler.js";

export const EXCLUSIVE_CHANNELS = [
  "translate",
  "rotate",
  "scale",
  "filter",
  "clip-path",
  "mask",
] as const;
export type ExclusiveChannel = (typeof EXCLUSIVE_CHANNELS)[number] | `--neshel-${string}`;
export type ConflictPolicy = "warn" | "error" | "silent";

export function isExclusiveChannel(channel: unknown): channel is ExclusiveChannel {
  return (
    typeof channel === "string" &&
    ((EXCLUSIVE_CHANNELS as readonly string[]).includes(channel) ||
      /^--neshel-[a-z0-9-]+$/.test(channel))
  );
}

/** Conflict policy: explicit, else `warn` in development and `silent` in production. */
export function resolveConflictPolicy(policy: ConflictPolicy | undefined): ConflictPolicy {
  if (policy === undefined) return isProduction() ? "silent" : "warn";
  if (policy !== "warn" && policy !== "error" && policy !== "silent") {
    throw animationsError("conflicts", `invalid policy ${JSON.stringify(policy)}`);
  }
  return policy;
}

/** A request for exclusive channels (all granted or none). */
export interface Claim {
  readonly id: string;
  readonly priority: number;
  readonly channels: readonly ExclusiveChannel[];
  /** Called when a waiting claim is granted later. */
  onGrant(): void;
  /** Called when a granted claim loses its channels to a higher priority. */
  onRevoke(): void;
}

interface ClaimRecord {
  claim: Claim;
  seq: number;
  granted: boolean;
}

interface PropState {
  base: string;
  priority: string;
  /** Raw value last computed and written by the host (duplicate-write guard). */
  desired: string | undefined;
  /** Serialised value read back after the last write (external-change detection). */
  written: string | undefined;
}

export interface MotionHost {
  setLayer(key: symbol, layer: TransformLayer | undefined): void;
  setOpacity(key: symbol, value: number | undefined): void;
  /** Request exclusive channels; `true` when granted now, `false` when waiting. */
  request(claim: Claim, policy?: ConflictPolicy): boolean;
  release(claim: Claim): void;
  isGranted(claim: Claim): boolean;
  setExclusive(claim: Claim, channel: ExclusiveChannel, value: string | undefined): void;
  /** Adopt `value` as the property's baseline (a completed animation hands over its end state). */
  commit(property: string, value: string): void;
  /** Write pending changes now (normally done in the scheduler's write phase). */
  flush(): void;
  /** Engine-internal state, read by debug.ts only (kept out of bundles that do not import it). */
  readonly internals: HostInternals;
}

export interface HostInternals {
  readonly layers: ReadonlyMap<symbol, unknown>;
  readonly opacities: ReadonlyMap<symbol, number>;
  readonly records: ReadonlyMap<
    Claim,
    { readonly claim: Claim; readonly seq: number; readonly granted: boolean }
  >;
  readonly owners: ReadonlyMap<string, { readonly claim: Claim }>;
  readonly values: ReadonlyMap<string, string>;
  readonly writes: number;
}

type Styled = { readonly style: CSSStyleDeclaration };

const hosts = new WeakMap<object, MotionHost>();
const elementIds = new WeakMap<object, number>();
let nextElementId = 1;

export function getMotionHost(
  element: Styled,
  scheduler: FrameScheduler = getFrameScheduler(),
): MotionHost {
  const existing = hosts.get(element);
  if (existing) return existing;
  const host = createHost(element, scheduler);
  hosts.set(element, host);
  return host;
}

/** The element's host if one exists (never creates one). */
export function peekMotionHost(element: object): MotionHost | undefined {
  return hosts.get(element);
}

function createHost(element: Styled, scheduler: FrameScheduler): MotionHost {
  const style = element.style;
  const layers = new Map<symbol, TransformLayer>();
  const opacities = new Map<symbol, number>();
  const records = new Map<Claim, ClaimRecord>();
  const owners = new Map<string, ClaimRecord>();
  const values = new Map<string, string>();
  const props = new Map<string, PropState>();
  let seq = 0;
  let scheduled = false;
  let writes = 0;

  const elementKey = () => {
    let id = elementIds.get(element);
    if (id === undefined) {
      id = nextElementId++;
      elementIds.set(element, id);
    }
    return id;
  };

  function capture(property: string): PropState {
    let state = props.get(property);
    if (!state) {
      state = {
        base: style.getPropertyValue(property),
        priority: style.getPropertyPriority(property),
        desired: undefined,
        written: undefined,
      };
      props.set(property, state);
    }
    return state;
  }

  function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    scheduler.schedule(flush, "write");
  }

  /** Desired value of a property, or `null` to restore the baseline. */
  function compute(property: string, state: PropState): string | null {
    if (property === "transform") {
      if (layers.size === 0) return null;
      const composed = composeTransform(layers.values());
      if (composed === "none") return null;
      return state.base ? `${state.base} ${composed}` : composed;
    }
    if (property === "opacity") {
      if (opacities.size === 0) return null;
      let product = 1;
      for (const value of opacities.values()) product *= value;
      const parsed = Number.parseFloat(state.base);
      const base = Number.isFinite(parsed) ? parsed : 1;
      return String(Math.round(Math.min(1, Math.max(0, product * base)) * 10000) / 10000);
    }
    if (property === "will-change") {
      const tokens: string[] = [];
      if (layers.size > 0 && composeTransform(layers.values()) !== "none") tokens.push("transform");
      if (opacities.size > 0) tokens.push("opacity");
      for (const channel of owners.keys()) {
        if (values.has(channel) && !channel.startsWith("--")) tokens.push(channel);
      }
      if (tokens.length === 0) return null;
      const baseTokens = state.base
        .split(",")
        .map((token) => token.trim())
        .filter((token) => token && token !== "auto");
      return [...new Set([...baseTokens, ...tokens])].join(", ");
    }
    return owners.has(property) && values.has(property) ? (values.get(property) as string) : null;
  }

  function active(property: string): boolean {
    if (property === "transform") return layers.size > 0;
    if (property === "opacity") return opacities.size > 0;
    if (property === "will-change") return layers.size > 0 || opacities.size > 0 || owners.size > 0;
    return (
      owners.has(property) ||
      [...records.values()].some((r) => r.claim.channels.includes(property as ExclusiveChannel))
    );
  }

  function flush(): void {
    scheduled = false;
    for (const [property, state] of [...props]) {
      // External inline modification since our last write: adopt it as the baseline (§5).
      if (state.written !== undefined) {
        const current = style.getPropertyValue(property);
        if (current !== state.written) {
          state.base = current;
          state.priority = style.getPropertyPriority(property);
          state.desired = undefined;
          state.written = undefined;
          devWarnOnce(
            `external:${elementKey()}:${property}`,
            `"${property}" on ${describeElement(element)} changed outside the engine; kept as the baseline to restore.`,
          );
        }
      }
      const desired = compute(property, state);
      if (desired === null) {
        if (state.written !== undefined || state.desired !== undefined) {
          if (state.base) style.setProperty(property, state.base, state.priority);
          else style.removeProperty(property);
          writes++;
        }
        if (!active(property)) props.delete(property);
        else {
          state.desired = undefined;
          state.written = undefined;
        }
        continue;
      }
      if (desired === state.desired) continue; // no duplicate write
      style.setProperty(property, desired, state.priority);
      writes++;
      state.desired = desired;
      state.written = style.getPropertyValue(property);
    }
    if (
      props.size === 0 &&
      layers.size === 0 &&
      opacities.size === 0 &&
      records.size === 0 &&
      hosts.get(element) === host
    ) {
      hosts.delete(element);
    }
  }

  function report(policy: ConflictPolicy, loser: Claim, winner: Claim, channel: string): void {
    const message = `"${loser.id}" is suspended: "${channel}" on ${describeElement(element)} is owned by "${winner.id}" (priority ${winner.priority} vs ${loser.priority}).`;
    if (policy === "error") throw animationsError("conflict", message);
    if (policy === "warn") {
      devWarnOnce(`conflict:${elementKey()}:${channel}:${loser.id}:${winner.id}`, message);
    }
  }

  function grant(record: ClaimRecord): void {
    record.granted = true;
    for (const channel of record.claim.channels) {
      owners.set(channel, record);
      capture(channel);
    }
    capture("will-change");
  }

  function free(record: ClaimRecord): void {
    record.granted = false;
    for (const channel of record.claim.channels) {
      if (owners.get(channel) === record) {
        owners.delete(channel);
        values.delete(channel);
      }
    }
    schedule();
  }

  function resumeWaiting(): void {
    const waiting = [...records.values()]
      .filter((record) => !record.granted)
      .sort((a, b) => b.claim.priority - a.claim.priority || a.seq - b.seq);
    for (const record of waiting) {
      if (record.claim.channels.every((channel) => !owners.has(channel))) {
        grant(record);
        record.claim.onGrant();
      }
    }
  }

  const host: MotionHost = {
    setLayer(key, layer) {
      if (layer) {
        capture("transform");
        capture("will-change");
        layers.set(key, layer);
      } else if (!layers.delete(key)) return;
      schedule();
    },
    setOpacity(key, value) {
      if (value !== undefined) {
        if (!Number.isFinite(value)) throw new RangeError("opacity contribution must be finite");
        capture("opacity");
        capture("will-change");
        opacities.set(key, value);
      } else if (!opacities.delete(key)) return;
      schedule();
    },
    request(claim, policy) {
      const resolved = resolveConflictPolicy(policy);
      if (records.has(claim)) return records.get(claim)?.granted ?? false;
      // Blocking owners: equal or higher priority (ties keep the existing owner).
      for (const channel of claim.channels) {
        const owner = owners.get(channel);
        if (owner && owner.claim.priority >= claim.priority) {
          report(resolved, claim, owner.claim, channel);
          records.set(claim, { claim, seq: ++seq, granted: false });
          return false;
        }
      }
      // Lower-priority owners are preempted (all-or-none: they lose every channel).
      const preempted = new Set<ClaimRecord>();
      for (const channel of claim.channels) {
        const owner = owners.get(channel);
        if (owner) {
          report(resolved, owner.claim, claim, channel);
          preempted.add(owner);
        }
      }
      const record: ClaimRecord = { claim, seq: ++seq, granted: false };
      records.set(claim, record);
      for (const owner of preempted) {
        free(owner);
        owner.claim.onRevoke();
      }
      grant(record);
      schedule();
      if (preempted.size > 0) resumeWaiting();
      return true;
    },
    release(claim) {
      const record = records.get(claim);
      if (!record) return;
      records.delete(claim);
      if (record.granted) {
        free(record);
        resumeWaiting();
      }
    },
    isGranted(claim) {
      return records.get(claim)?.granted ?? false;
    },
    setExclusive(claim, channel, value) {
      const owner = owners.get(channel);
      if (!owner || owner.claim !== claim) return; // writes of suspended claims are discarded
      if (value === undefined) values.delete(channel);
      else values.set(channel, value);
      schedule();
    },
    commit(property, value) {
      const state = capture(property);
      state.base = value;
      state.desired = undefined;
      state.written = undefined;
      style.setProperty(property, value, state.priority);
      writes++;
      schedule();
    },
    flush,
    get internals() {
      return { layers, opacities, records, owners, values, writes };
    },
  };
  return host;
}
