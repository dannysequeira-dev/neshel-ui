/**
 * Pose writer (Phase 013, internal to `./cinematic`): renders a small numeric pose on one element through
 * its Motion Host — one transform layer (composes with every other effect), one opacity contribution
 * (multiplies) and, only when the pose uses blur, an arbitrated `filter` claim. Identity parts are cleared
 * so an element at rest carries no contribution; `clear()` restores the ledger's baseline exactly.
 */
import {
  type ConflictPolicy,
  releaseChannels,
  requestChannels,
  setExclusive,
} from "../../core/arbiter.js";
import type { TransformLayer } from "../../core/compose.js";
import { type Claim, getMotionHost } from "../../core/host.js";
import { mix } from "../../core/interpolate.js";

export interface Pose {
  /** Translation in px. */
  x?: number;
  y?: number;
  /** Uniform scale. */
  scale?: number;
  /** Horizontal / vertical scale (multiply with `scale`). */
  scaleX?: number;
  scaleY?: number;
  /** Rotation in degrees (z axis). */
  rotate?: number;
  /** Opacity factor 0–1 (multiplies with the element's own opacity). */
  opacity?: number;
  /** Gaussian blur in px (`filter` channel, arbitrated). */
  blur?: number;
}

export type PoseKey = keyof Pose;
export const POSE_KEYS: readonly PoseKey[] = [
  "x",
  "y",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "opacity",
  "blur",
];
const IDENTITY: Required<Pose> = {
  x: 0,
  y: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  opacity: 1,
  blur: 0,
};

export const identityOf = (key: PoseKey): number => IDENTITY[key];

export type Styled = Element & { readonly style: CSSStyleDeclaration };

export interface PoseWriter {
  set(pose: Pose): void;
  clear(): void;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

export function mixPose(from: Pose, to: Pose, t: number, keys: readonly PoseKey[]): Pose {
  const out: Pose = {};
  for (const key of keys) out[key] = mix(from[key] ?? IDENTITY[key], to[key] ?? IDENTITY[key], t);
  return out;
}

export function createPoseWriter(
  target: Styled,
  options: { id: string; priority?: number; conflicts?: ConflictPolicy },
): PoseWriter {
  const host = getMotionHost(target);
  const key = Symbol(options.id);
  let claim: Claim | undefined;
  let layered = false;
  let faded = false;
  /** Last filter value: re-applied when a suspended claim is granted again (ADR 0022 §2). */
  let filter: string | undefined;

  function blur(value: number | undefined): void {
    filter = value === undefined || value <= 0.01 ? undefined : `blur(${round(value)}px)`;
    if (!filter) {
      if (claim) setExclusive(host, claim, "filter", undefined);
      return;
    }
    if (!claim) {
      const own: Claim = {
        id: options.id,
        priority: options.priority ?? 0,
        channels: ["filter"],
        onGrant: () => setExclusive(host, own, "filter", filter),
        onRevoke: () => {},
      };
      claim = own;
      requestChannels(host, own, options.conflicts);
    }
    setExclusive(host, claim, "filter", filter);
  }

  return {
    set(pose) {
      const layer: TransformLayer = {};
      let moved = false;
      if (pose.x !== undefined && Math.abs(pose.x) > 1e-3) {
        layer.translateX = round(pose.x);
        moved = true;
      }
      if (pose.y !== undefined && Math.abs(pose.y) > 1e-3) {
        layer.translateY = round(pose.y);
        moved = true;
      }
      if (pose.rotate !== undefined && Math.abs(pose.rotate) > 1e-3) {
        layer.rotateZ = round(pose.rotate);
        moved = true;
      }
      for (const name of ["scale", "scaleX", "scaleY"] as const) {
        const value = pose[name];
        if (value !== undefined && Math.abs(value - 1) > 1e-4) {
          layer[name] = Math.round(value * 10000) / 10000;
          moved = true;
        }
      }
      if (moved) {
        host.setLayer(key, layer);
        layered = true;
      } else if (layered) {
        host.setLayer(key, undefined);
        layered = false;
      }
      if (pose.opacity !== undefined && pose.opacity < 0.9999) {
        host.setOpacity(key, Math.max(0, Math.round(pose.opacity * 10000) / 10000));
        faded = true;
      } else if (faded) {
        host.setOpacity(key, undefined);
        faded = false;
      }
      if (pose.blur !== undefined || claim) blur(pose.blur);
    },
    clear() {
      if (layered) host.setLayer(key, undefined);
      if (faded) host.setOpacity(key, undefined);
      layered = faded = false;
      filter = undefined;
      if (claim) {
        releaseChannels(host, claim);
        claim = undefined;
      }
    },
  };
}
