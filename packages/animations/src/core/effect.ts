/**
 * Effect definitions, explicit registries and attachment (ADR 0021; contracts/effect-definition.md).
 * Definitions are frozen values; nothing registers at import time.
 */

import { arbiter } from "./arbiter.js";
import { type AttachConfig, attachWith } from "./attach.js";
import type { TransformLayer } from "./compose.js";
import { animationsError } from "./errors.js";
import { type ExclusiveChannel, isExclusiveChannel } from "./host.js";
import type { ReducedMotion } from "./reduced-motion.js";
import type { FrameScheduler } from "./scheduler.js";

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

/** `failed`: a resumed `setup()` threw; the attachment released everything and reported the error. */
export type EffectState = "active" | "suspended" | "reduced" | "paused" | "destroyed" | "failed";

export interface EffectHandle<Options> {
  readonly state: EffectState;
  update(options?: Options): void;
  pause(): void;
  resume(): void;
  /** Idempotent; releases channels (restoring styles) and every listener. */
  destroy(): void;
}

export type { AttachConfig } from "./attach.js";

/** Attach a definition to an element (full engine: composition and exclusive-channel arbitration). */
export function attachEffect<Options, Resolved>(
  element: Element & { readonly style: CSSStyleDeclaration },
  definition: EffectDefinition<Options, Resolved>,
  options?: Options,
  config: AttachConfig = {},
): EffectHandle<Options> {
  return attachWith(element, definition, options, config, arbiter);
}
