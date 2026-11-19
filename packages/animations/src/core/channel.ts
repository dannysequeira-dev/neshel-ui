/**
 * Channel writer (Phase 014, internal; ADR 0029 §4): writes one or more exclusive channels of an element
 * through its Motion Host — the style ledger captures the consumer's inline value on first use and restores
 * it exactly on release. Channels may be internal (`stroke-dashoffset`, `offset-path`, `font-weight`, …;
 * the Phase 012/013 pattern) or namespaced custom properties. The claim is requested lazily on the first
 * non-empty write; a claim granted later (arbitration) re-applies the last values.
 */
import { type ConflictPolicy, releaseChannels, requestChannels, setExclusive } from "./arbiter.js";
import { type Claim, type ExclusiveChannel, getMotionHost, type MotionHost } from "./host.js";

type Styled = { readonly style: CSSStyleDeclaration };

export interface ChannelWriter {
  /** Write (or clear with `undefined`) one of the writer's channels. */
  set(channel: string, value: string | undefined): void;
  /** Whether the claim currently owns its channels. */
  readonly granted: boolean;
  /** Release the claim (values restored to the ledger's baseline). Idempotent; a later `set` re-claims. */
  release(): void;
}

export interface ChannelWriterOptions {
  id: string;
  priority?: number;
  conflicts?: ConflictPolicy;
}

export function createChannelWriter(
  element: Styled,
  channels: readonly string[],
  options: ChannelWriterOptions,
): ChannelWriter {
  const values = new Map<string, string>();
  let host: MotionHost | undefined;
  let claim: Claim | undefined;
  let granted = false;

  function apply(): void {
    if (!host || !claim) return;
    for (const channel of channels) {
      setExclusive(host, claim, channel as ExclusiveChannel, values.get(channel));
    }
  }

  return {
    get granted() {
      return granted;
    },
    set(channel, value) {
      if (value === undefined) values.delete(channel);
      else values.set(channel, value);
      if (!claim) {
        if (value === undefined) return;
        host ??= getMotionHost(element);
        const own: Claim = {
          id: options.id,
          priority: options.priority ?? 0,
          channels: channels as readonly ExclusiveChannel[],
          onGrant: () => {
            granted = true;
            apply();
          },
          onRevoke: () => {
            granted = false;
          },
        };
        claim = own;
        granted = requestChannels(host, own, options.conflicts);
        if (granted) apply();
        return;
      }
      if (host && granted) setExclusive(host, claim, channel as ExclusiveChannel, value);
    },
    release() {
      values.clear();
      if (host && claim) releaseChannels(host, claim);
      claim = undefined;
      granted = false;
    },
  };
}
