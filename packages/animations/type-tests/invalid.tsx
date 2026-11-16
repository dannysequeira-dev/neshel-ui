// Negative type fixtures: each `@ts-expect-error` must be needed, or `pnpm typecheck` fails.
import { createFrameScheduler } from "../src/core/index.js";
import { Tilt3D, useTilt3D } from "../src/hover/index.js";

export function Invalid() {
  return (
    <>
      {/* @ts-expect-error axis is a closed list */}
      <Tilt3D axis="z" />
      {/* @ts-expect-error maxTilt is a number */}
      <Tilt3D maxTilt="10" />
      {/* @ts-expect-error unknown reduced-motion policy */}
      <Tilt3D reducedMotion="sometimes" />
      {/* @ts-expect-error unknown pointer type */}
      <Tilt3D pointerTypes={["finger"]} />
      {/* @ts-expect-error unknown spring option */}
      <Tilt3D spring={{ bounce: 1 }} />
    </>
  );
}

export function InvalidHook() {
  // @ts-expect-error the hook needs a ref
  useTilt3D(document.body);
  return null;
}

// @ts-expect-error unknown phase
createFrameScheduler().schedule(() => true, "paint");
