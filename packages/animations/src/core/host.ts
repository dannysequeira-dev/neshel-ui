/**
 * Motion host (ADR 0022; contracts/channels-and-arbitration.md, contracts/style-ownership.md).
 *
 * One host per element is the only engine writer of the element's managed inline styles. This module
 * holds the **style ledger** and the composable channels:
 * - the original inline value and priority of each property are captured on first use, combined
 *   while animating (transform prefix, opacity factor, will-change union) and restored exactly on
 *   release; external inline changes become the new baseline; each property is written at most once
 *   per frame and only when its value changes;
 * - `transform` composes layers and `opacity` multiplies contributions.
 * Exclusive channels store their owners and values here, but the arbitration logic lives in
 * `arbiter.ts`, so effects that only compose (Tilt3D) do not bundle it.
 */
import { composeTransform, type TransformLayer } from "./compose.js";
import { describeElement, devWarnOnce, elementKey } from "./dev.js";
import { type FrameScheduler, getFrameScheduler } from "./scheduler.js";

declare const process: { env: { NODE_ENV?: string } } | undefined;

export const EXCLUSIVE_CHANNELS = [
  "translate",
  "rotate",
  "scale",
  "filter",
  "clip-path",
  "mask",
] as const;
export type ExclusiveChannel = (typeof EXCLUSIVE_CHANNELS)[number] | `--neshel-${string}`;

export function isExclusiveChannel(channel: unknown): channel is ExclusiveChannel {
  return (
    typeof channel === "string" &&
    ((EXCLUSIVE_CHANNELS as readonly string[]).includes(channel) ||
      /^--neshel-[a-z0-9-]+$/.test(channel))
  );
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

export interface ClaimRecord {
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

type Styled = { readonly style: CSSStyleDeclaration };

/** Engine-internal host (not exported from the package entry points). */
export interface MotionHost {
  readonly element: Styled;
  readonly layers: Map<symbol, TransformLayer>;
  readonly opacities: Map<symbol, number>;
  /** Exclusive claims (granted and waiting), owners per channel and owners' values. */
  readonly records: Map<Claim, ClaimRecord>;
  readonly owners: Map<string, ClaimRecord>;
  readonly values: Map<string, string>;
  readonly writes: number;
  nextSeq(): number;
  capture(property: string): void;
  schedule(): void;
  setLayer(key: symbol, layer: TransformLayer | undefined): void;
  setOpacity(key: symbol, value: number | undefined): void;
  /** Adopt `value` as the property's baseline (a completed animation hands over its end state). */
  commit(property: string, value: string): void;
  /** Write pending changes now (normally done in the scheduler's write phase). */
  flush(): void;
  /** Whether the ledger still holds captured properties (diagnostics). */
  holding(): boolean;
}

/** One host per element for the element's lifetime (ADR 0022); never replaced while the element lives. */
const hosts = new WeakMap<object, MotionHost>();

export function getMotionHost(
  element: Styled,
  scheduler: FrameScheduler = getFrameScheduler(),
): MotionHost {
  let host = hosts.get(element);
  if (!host) {
    host = createHost(element, scheduler);
    hosts.set(element, host);
  }
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
  function compute(property: string, state: PropState, composed: string): string | null {
    if (property === "transform") {
      if (composed === "none") return null;
      return state.base ? `${state.base} ${composed}` : composed;
    }
    if (property === "opacity") {
      if (opacities.size === 0) return null;
      let product = Number.parseFloat(state.base);
      if (!Number.isFinite(product)) product = 1;
      for (const value of opacities.values()) product *= value;
      return String(Math.round(Math.min(1, Math.max(0, product)) * 10000) / 10000);
    }
    if (property === "will-change") {
      const tokens = state.base
        .split(",")
        .map((token) => token.trim())
        .filter((token) => token && token !== "auto");
      const before = tokens.length;
      if (composed !== "none") tokens.push("transform");
      if (opacities.size > 0) tokens.push("opacity");
      for (const channel of owners.keys()) {
        // Custom properties, `touch-action` (Phase 012 gesture areas), `view-transition-*` (Phase 013
        // page transitions) and the Phase 016 structural 3D channels are not animated.
        if (
          values.has(channel) &&
          !/^(--|touch-action|view-transition|transform-style|backface-visibility|perspective|visibility|z-index)/.test(
            channel,
          )
        ) {
          tokens.push(channel);
        }
      }
      return tokens.length === before ? null : [...new Set(tokens)].join(", ");
    }
    return owners.has(property) ? (values.get(property) ?? null) : null;
  }

  function active(property: string): boolean {
    if (property === "transform") return layers.size > 0;
    if (property === "opacity") return opacities.size > 0;
    if (property === "will-change") return layers.size + opacities.size + owners.size > 0;
    for (const record of records.values()) {
      if (record.claim.channels.includes(property as ExclusiveChannel)) return true;
    }
    return false;
  }

  function flush(): void {
    scheduled = false;
    const composed = layers.size > 0 ? composeTransform(layers.values()) : "none";
    for (const [property, state] of [...props]) {
      // External inline modification since our last write: adopt it as the baseline (§5).
      if (state.written !== undefined) {
        const current = style.getPropertyValue(property);
        if (current !== state.written) {
          state.base = current;
          state.priority = style.getPropertyPriority(property);
          state.desired = state.written = undefined;
          if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
            devWarnOnce(
              `external:${elementKey(element)}:${property}`,
              `"${property}" on ${describeElement(element)} changed outside the engine; kept as the baseline to restore.`,
            );
          }
        }
      }
      const desired = compute(property, state, composed);
      if (desired === null) {
        if (state.written !== undefined || state.desired !== undefined) {
          if (state.base) style.setProperty(property, state.base, state.priority);
          else style.removeProperty(property);
          writes++;
        }
        if (active(property)) state.desired = state.written = undefined;
        else props.delete(property);
        continue;
      }
      if (desired === state.desired) continue; // no duplicate write
      style.setProperty(property, desired, state.priority);
      writes++;
      state.desired = desired;
      state.written = style.getPropertyValue(property);
    }
    // An idle host is NOT removed from the registry (issue #11): attachments and controllers keep the
    // host they were created with, so a replacement host would be a second ledger writing the same inline
    // properties, each adopting the other's writes as the external baseline (stale values restored). An
    // idle ledger holds nothing (every property was restored and dropped above); the WeakMap releases it
    // together with the element.
  }

  const host: MotionHost = {
    element,
    layers,
    opacities,
    records,
    owners,
    values,
    get writes() {
      return writes;
    },
    nextSeq: () => ++seq,
    capture,
    schedule,
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
    commit(property, value) {
      const state = capture(property);
      state.base = value;
      state.desired = state.written = undefined;
      style.setProperty(property, value, state.priority);
      writes++;
      schedule();
    },
    flush,
    holding: () => props.size > 0,
  };
  return host;
}
