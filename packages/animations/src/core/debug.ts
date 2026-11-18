/** Motion host diagnostics (unstable output; development and tests). */
import { peekMotionHost } from "./host.js";

export interface MotionDebugInfo {
  channels: Array<{
    channel: string;
    mode: "compose" | "multiply" | "exclusive";
    owner?: string;
    waiting: string[];
    contributions: number;
  }>;
  writes: number;
}

export function getMotionDebugInfo(element: object): MotionDebugInfo | undefined {
  const host = peekMotionHost(element);
  if (!host) return undefined;
  const { layers, opacities, records, owners, values, writes } = host;
  // An idle host (nothing contributed, claimed or held) reports like no host at all.
  if (layers.size + opacities.size + records.size === 0 && !host.holding()) return undefined;
  const channels: MotionDebugInfo["channels"] = [];
  if (layers.size > 0) {
    channels.push({
      channel: "transform",
      mode: "compose",
      waiting: [],
      contributions: layers.size,
    });
  }
  if (opacities.size > 0) {
    channels.push({
      channel: "opacity",
      mode: "multiply",
      waiting: [],
      contributions: opacities.size,
    });
  }
  const all = [...records.values()];
  const exclusive = new Set(all.flatMap((record) => record.claim.channels));
  for (const channel of [...exclusive].sort()) {
    const owner = owners.get(channel);
    channels.push({
      channel,
      mode: "exclusive",
      ...(owner ? { owner: owner.claim.id } : {}),
      waiting: all
        .filter((record) => !record.granted && record.claim.channels.includes(channel))
        .sort((a, b) => b.claim.priority - a.claim.priority || a.seq - b.seq)
        .map((record) => record.claim.id),
      contributions: owner && values.has(channel) ? 1 : 0,
    });
  }
  return { channels, writes };
}
