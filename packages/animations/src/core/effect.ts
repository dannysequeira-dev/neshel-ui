/**
 * Effect definitions, explicit registries and attachment (ADR 0021; contracts/effect-definition.md).
 * Definitions are frozen values; nothing registers at import time.
 */
import type { TransformLayer } from "./compose.js";
import { animationsError } from "./errors.js";
import {
  type Claim,
  type ConflictPolicy,
  type ExclusiveChannel,
  getMotionHost,
  isExclusiveChannel,
  resolveConflictPolicy,
} from "./host.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "./reduced-motion.js";
import { type FrameScheduler, getFrameScheduler } from "./scheduler.js";

export const FAMILIES = [
  "entrance",
  "hover",
  "press",
  "physics",
  "scroll-trigger",
  "scroll",
  "cinematic",
  "page",
  "layout",
  "text",
  "svg",
  "media",
  "ambient",
  "feedback",
  "3d",
] as const;
export type FamilyId = (typeof FAMILIES)[number];
export type EffectId = `${FamilyId}/${string}`;
export type ReducedBehaviour = "off" | "fade" | "instant" | "static" | "reduced";

export type ChannelClaim =
  | { channel: "transform"; mode: "compose" }
  | { channel: "opacity"; mode: "multiply" }
  | { channel: ExclusiveChannel; mode: "exclusive" };

export interface ChannelHandles {
  readonly transform: { set(layer: TransformLayer): void; clear(): void };
  readonly opacity: { set(value: number): void; clear(): void };
  exclusive(channel: ExclusiveChannel): { set(value: string): void; clear(): void };
}

export interface EffectContext<Resolved> {
  readonly element: Element & { readonly style: CSSStyleDeclaration };
  readonly options: Resolved;
  readonly channels: ChannelHandles;
  readonly scheduler: FrameScheduler;
  /** Whether motion must be reduced now (live). */
  readonly reduced: boolean;
  onReducedChange(listener: (reduced: boolean) => void): () => void;
}

export interface EffectInstance<Resolved> {
  update(options: Resolved): void;
  pause?(): void;
  resume?(): void;
  /** Must release every listener and frame task it created. */
  destroy(): void;
}

export interface EffectDefinition<Options, Resolved> {
  readonly id: EffectId;
  readonly family: FamilyId;
  readonly channels: readonly ChannelClaim[];
  readonly priority?: number;
  readonly reducedMotion: ReducedBehaviour;
  /** Validates options; throw `NeshelAnimationsError` for invalid input. */
  resolve(options: Options | undefined): Resolved;
  /** Reduced-motion policy carried by the options (e.g. Tilt3D's `reducedMotion` prop). */
  policy?(options: Resolved): ReducedMotion | undefined;
  setup(context: EffectContext<Resolved>): EffectInstance<Resolved>;
}

// biome-ignore lint/suspicious/noExplicitAny: registries hold definitions of any option types.
export type AnyEffectDefinition = EffectDefinition<any, any>;

const fail = (message: string): never => {
  throw animationsError("defineEffect", message);
};

export function defineEffect<Options, Resolved>(
  definition: EffectDefinition<Options, Resolved>,
): Readonly<EffectDefinition<Options, Resolved>> {
  const { id, family, channels, priority = 0, reducedMotion } = definition;
  if (!(FAMILIES as readonly string[]).includes(family))
    fail(`unknown family ${JSON.stringify(family)}`);
  if (typeof id !== "string" || !/^[a-z0-9-]+\/[a-z0-9][a-z0-9-]*$/.test(id)) {
    fail(`invalid id ${JSON.stringify(id)}; expected "family/name" in kebab-case`);
  }
  if (!id.startsWith(`${family}/`)) fail(`id "${id}" must start with its family "${family}/"`);
  if (!Number.isFinite(priority)) fail(`"${id}": priority must be a finite number`);
  if (!["off", "fade", "instant", "static", "reduced"].includes(reducedMotion)) {
    fail(`"${id}": invalid reducedMotion ${JSON.stringify(reducedMotion)}`);
  }
  if (!Array.isArray(channels)) fail(`"${id}": channels must be an array`);
  const seen = new Set<string>();
  for (const claim of channels) {
    const valid =
      (claim?.channel === "transform" && claim.mode === "compose") ||
      (claim?.channel === "opacity" && claim.mode === "multiply") ||
      (claim?.mode === "exclusive" && isExclusiveChannel(claim.channel));
    if (!valid) fail(`"${id}": invalid channel claim ${JSON.stringify(claim)}`);
    if (seen.has(claim.channel)) fail(`"${id}": channel "${claim.channel}" is claimed twice`);
    seen.add(claim.channel);
  }
  if (typeof definition.resolve !== "function" || typeof definition.setup !== "function") {
    fail(`"${id}": resolve and setup must be functions`);
  }
  return Object.freeze({ ...definition, priority, channels: Object.freeze([...channels]) });
}

export interface EffectRegistry {
  get(id: string): AnyEffectDefinition | undefined;
  has(id: string): boolean;
  list(family?: FamilyId): readonly AnyEffectDefinition[];
}

export function createEffectRegistry(definitions: readonly AnyEffectDefinition[]): EffectRegistry {
  const byId = new Map<string, AnyEffectDefinition>();
  for (const definition of definitions) {
    if (byId.has(definition.id)) {
      throw animationsError("createEffectRegistry", `duplicate effect id "${definition.id}"`);
    }
    byId.set(definition.id, definition);
  }
  const all = Object.freeze([...byId.values()]);
  return {
    get: (id) => byId.get(id),
    has: (id) => byId.has(id),
    list: (family) => (family ? all.filter((definition) => definition.family === family) : all),
  };
}

export type EffectState = "active" | "suspended" | "reduced" | "paused" | "destroyed";

export interface EffectHandle<Options> {
  readonly state: EffectState;
  update(options?: Options): void;
  pause(): void;
  resume(): void;
  /** Idempotent; releases channels (restoring styles) and every listener. */
  destroy(): void;
}

export interface AttachConfig {
  conflicts?: ConflictPolicy;
  /** Overrides the definition's priority for this attachment. */
  priority?: number;
  /** Overrides the policy carried by the options. */
  reducedMotion?: ReducedMotion;
}

export function attachEffect<Options, Resolved>(
  element: Element & { readonly style: CSSStyleDeclaration },
  definition: EffectDefinition<Options, Resolved>,
  options?: Options,
  config: AttachConfig = {},
): EffectHandle<Options> {
  const policy = resolveConflictPolicy(config.conflicts);
  let resolved = definition.resolve(options);
  const host = getMotionHost(element);
  const scheduler = getFrameScheduler();
  const key = Symbol(definition.id);
  const exclusive = definition.channels
    .filter((claim) => claim.mode === "exclusive")
    .map((claim) => claim.channel as ExclusiveChannel);
  const declared = new Set(definition.channels.map((claim) => claim.channel));
  let instance: EffectInstance<Resolved> | undefined;
  let paused = false;
  let destroyed = false;
  let systemReduced = prefersReducedMotion();
  const reducedListeners = new Set<(reduced: boolean) => void>();
  const reduced = () =>
    shouldReduceMotion(
      config.reducedMotion ?? definition.policy?.(resolved) ?? "user",
      systemReduced,
    );

  const guard = (channel: string) => {
    if (!declared.has(channel as never)) {
      throw animationsError(
        definition.id,
        `wrote "${channel}", which it did not declare in channels`,
      );
    }
  };
  const claim: Claim = {
    id: definition.id,
    priority: config.priority ?? definition.priority ?? 0,
    channels: exclusive,
    onGrant: () => {
      if (!destroyed) start();
    },
    onRevoke: () => stop(),
  };
  const channels: ChannelHandles = {
    transform: {
      set: (layer) => {
        guard("transform");
        host.setLayer(key, layer);
      },
      clear: () => host.setLayer(key, undefined),
    },
    opacity: {
      set: (value) => {
        guard("opacity");
        host.setOpacity(key, value);
      },
      clear: () => host.setOpacity(key, undefined),
    },
    exclusive: (channel) => {
      guard(channel);
      return {
        set: (value) => host.setExclusive(claim, channel, value),
        clear: () => host.setExclusive(claim, channel, undefined),
      };
    },
  };
  const context: EffectContext<Resolved> = {
    element,
    get options() {
      return resolved;
    },
    channels,
    scheduler,
    get reduced() {
      return reduced();
    },
    onReducedChange(listener) {
      reducedListeners.add(listener);
      return () => reducedListeners.delete(listener);
    },
  };

  function start(): void {
    instance = definition.setup(context);
    if (paused) instance.pause?.();
  }
  function stop(): void {
    instance?.destroy();
    instance = undefined;
    host.setLayer(key, undefined);
    host.setOpacity(key, undefined);
  }

  // Request first: the "error" policy throws before anything is subscribed or set up.
  const granted = exclusive.length === 0 || host.request(claim, policy);
  let last = reduced();
  const unsubscribe = subscribeReducedMotion((value) => {
    systemReduced = value;
    notify();
  });
  function notify(): void {
    const now = reduced();
    if (now === last) return;
    last = now;
    for (const listener of [...reducedListeners]) listener(now);
  }
  if (granted) {
    try {
      start();
    } catch (error) {
      // A throwing setup must not leave subscriptions, contributions or claims behind.
      unsubscribe();
      stop();
      if (exclusive.length > 0) host.release(claim);
      throw error;
    }
  }

  return {
    get state() {
      if (destroyed) return "destroyed";
      if (exclusive.length > 0 && !host.isGranted(claim)) return "suspended";
      if (paused) return "paused";
      return reduced() ? "reduced" : "active";
    },
    update(next) {
      if (destroyed) return;
      resolved = definition.resolve(next);
      instance?.update(resolved);
      notify();
    },
    pause() {
      if (destroyed || paused) return;
      paused = true;
      instance?.pause?.();
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      instance?.resume?.();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      reducedListeners.clear();
      stop();
      if (exclusive.length > 0) host.release(claim);
    },
  };
}
