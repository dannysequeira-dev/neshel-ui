/**
 * Effect attachment lifecycle (ADR 0021/0022; contracts/effect-definition.md §3).
 *
 * `attachWith(element, definition, options, config, arbiter)` runs resolve → claim → setup → update →
 * destroy. The exclusive-channel `arbiter` is passed in: `attachEffect` (effect.ts) passes the real one,
 * while definitions that only compose (`transform`/`opacity`, such as Tilt3D) may be attached without
 * it, so their bundles do not include arbitration code.
 */
import type { Arbiter, ConflictPolicy } from "./arbiter.js";
import type {
  ChannelHandles,
  EffectContext,
  EffectDefinition,
  EffectHandle,
  EffectInstance,
} from "./effect.js";
import { animationsError } from "./errors.js";
import { type Claim, type ExclusiveChannel, getMotionHost } from "./host.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "./reduced-motion.js";
import { getFrameScheduler } from "./scheduler.js";

export interface AttachConfig {
  conflicts?: ConflictPolicy;
  /** Overrides the definition's priority for this attachment. */
  priority?: number;
  /** Overrides the policy carried by the options. */
  reducedMotion?: ReducedMotion;
}

export function attachWith<Options, Resolved>(
  element: Element & { readonly style: CSSStyleDeclaration },
  definition: EffectDefinition<Options, Resolved>,
  options: Options | undefined,
  config: AttachConfig,
  arbiter: Arbiter | undefined,
): EffectHandle<Options> {
  const policy = arbiter?.policy(config.conflicts);
  let resolved = definition.resolve(options);
  const host = getMotionHost(element);
  const scheduler = getFrameScheduler();
  const key = Symbol(definition.id);
  const exclusive = definition.channels
    .filter((claim) => claim.mode === "exclusive")
    .map((claim) => claim.channel as ExclusiveChannel);
  if (exclusive.length > 0 && !arbiter) {
    throw animationsError(
      definition.id,
      "declares exclusive channels; attach it with attachEffect",
    );
  }
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
        set: (value) => arbiter?.set(host, claim, channel, value),
        clear: () => arbiter?.set(host, claim, channel, undefined),
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
  const granted = !arbiter || exclusive.length === 0 || arbiter.request(host, claim, policy);
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
      if (exclusive.length > 0) arbiter?.release(host, claim);
      throw error;
    }
  }

  return {
    get state() {
      if (destroyed) return "destroyed";
      if (arbiter && exclusive.length > 0 && !arbiter.isGranted(host, claim)) return "suspended";
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
      if (exclusive.length > 0) arbiter?.release(host, claim);
    },
  };
}
