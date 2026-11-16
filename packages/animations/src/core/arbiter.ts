/**
 * Exclusive-channel arbitration (ADR 0022; contracts/channels-and-arbitration.md §3–§4).
 *
 * Higher priority wins; ties keep the existing owner; losers wait (suspended) and resume when the
 * channels free, highest priority first and earliest claim on ties; multi-channel claims are
 * all-or-none. Reporting follows the conflict policy (`warn` / `error` / `silent`). Kept apart from
 * the style ledger (`host.ts`) so effects that only compose do not bundle it.
 */
import { describeElement, devWarnOnce, elementKey, isProduction } from "./dev.js";
import { animationsError } from "./errors.js";
import type { Claim, ClaimRecord, ExclusiveChannel, MotionHost } from "./host.js";

declare const process: { env: { NODE_ENV?: string } } | undefined;

export type ConflictPolicy = "warn" | "error" | "silent";

/** Conflict policy: explicit, else `warn` in development and `silent` in production. */
export function resolveConflictPolicy(policy: ConflictPolicy | undefined): ConflictPolicy {
  if (policy === undefined) return isProduction() ? "silent" : "warn";
  if (policy !== "warn" && policy !== "error" && policy !== "silent") {
    throw animationsError("conflicts", `invalid policy ${JSON.stringify(policy)}`);
  }
  return policy;
}

function report(
  host: MotionHost,
  policy: ConflictPolicy,
  loser: Claim,
  winner: Claim,
  channel: string,
) {
  if (policy === "silent") return;
  const message = `"${loser.id}" is suspended: "${channel}" on ${describeElement(host.element)} is owned by "${winner.id}" (priority ${winner.priority} vs ${loser.priority}).`;
  if (policy === "error") throw animationsError("conflict", message);
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    devWarnOnce(
      `conflict:${elementKey(host.element)}:${channel}:${loser.id}:${winner.id}`,
      message,
    );
  }
}

function grant(host: MotionHost, record: ClaimRecord): void {
  record.granted = true;
  for (const channel of record.claim.channels) {
    host.owners.set(channel, record);
    host.capture(channel);
  }
  host.capture("will-change");
}

function free(host: MotionHost, record: ClaimRecord): void {
  record.granted = false;
  for (const channel of record.claim.channels) {
    if (host.owners.get(channel) === record) {
      host.owners.delete(channel);
      host.values.delete(channel);
    }
  }
  host.schedule();
}

function resumeWaiting(host: MotionHost): void {
  const waiting = [...host.records.values()]
    .filter((record) => !record.granted)
    .sort((a, b) => b.claim.priority - a.claim.priority || a.seq - b.seq);
  for (const record of waiting) {
    if (record.claim.channels.every((channel) => !host.owners.has(channel))) {
      grant(host, record);
      record.claim.onGrant();
    }
  }
}

/** Request exclusive channels; `true` when granted now, `false` when waiting (suspended). */
export function requestChannels(host: MotionHost, claim: Claim, policy?: ConflictPolicy): boolean {
  const resolved = resolveConflictPolicy(policy);
  const existing = host.records.get(claim);
  if (existing) return existing.granted;
  for (const channel of claim.channels) {
    const owner = host.owners.get(channel);
    if (owner && owner.claim.priority >= claim.priority) {
      report(host, resolved, claim, owner.claim, channel);
      host.records.set(claim, { claim, seq: host.nextSeq(), granted: false });
      return false;
    }
  }
  const preempted = new Set<ClaimRecord>();
  for (const channel of claim.channels) {
    const owner = host.owners.get(channel);
    if (owner) {
      report(host, resolved, owner.claim, claim, channel);
      preempted.add(owner);
    }
  }
  const record: ClaimRecord = { claim, seq: host.nextSeq(), granted: false };
  host.records.set(claim, record);
  for (const owner of preempted) {
    free(host, owner);
    owner.claim.onRevoke();
  }
  grant(host, record);
  host.schedule();
  if (preempted.size > 0) resumeWaiting(host);
  return true;
}

/** Release a claim (granted or waiting); waiting claims may resume. */
export function releaseChannels(host: MotionHost, claim: Claim): void {
  const record = host.records.get(claim);
  if (!record) return;
  host.records.delete(claim);
  if (record.granted) {
    free(host, record);
    resumeWaiting(host);
  }
}

export function isGranted(host: MotionHost, claim: Claim): boolean {
  return host.records.get(claim)?.granted ?? false;
}

/** Write an exclusive channel; writes of claims that do not own it are discarded. */
export function setExclusive(
  host: MotionHost,
  claim: Claim,
  channel: ExclusiveChannel,
  value: string | undefined,
): void {
  if (host.owners.get(channel)?.claim !== claim) return;
  if (value === undefined) host.values.delete(channel);
  else host.values.set(channel, value);
  host.schedule();
}

/** The arbitration capability handed to the attachment lifecycle (see attach.ts). */
export const arbiter = {
  policy: resolveConflictPolicy,
  request: requestChannels,
  release: releaseChannels,
  isGranted,
  set: setExclusive,
};
export type Arbiter = typeof arbiter;
