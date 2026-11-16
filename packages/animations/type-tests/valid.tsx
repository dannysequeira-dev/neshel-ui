// Positive type fixtures (pnpm typecheck).
import { useRef } from "react";
import { composeTransform, createFrameScheduler, type TransformLayer } from "../src/core/index.js";
import { createTilt3D, Tilt3D, type Tilt3DProps, useTilt3D } from "../src/hover/index.js";

const props: Tilt3DProps = { maxTilt: 12, axis: "x", spring: { stiffness: 200 }, id: "card" };

export function Valid() {
  const ref = useRef<HTMLElement>(null);
  useTilt3D(ref, { reducedMotion: "always", pointerTypes: ["mouse", "touch"] });
  return (
    <>
      <Tilt3D {...props} onClick={() => {}} className="card" />
      <Tilt3D asChild perspective={600} scale={1.03}>
        <a href="/pricing">Pricing</a>
      </Tilt3D>
      <Tilt3D ref={(node: HTMLDivElement | null) => node?.focus()} />
    </>
  );
}

const controller = createTilt3D(document.body, { focusTilt: false });
controller.update({ maxTilt: 5 });
controller.destroy();
const layer: TransformLayer = { rotateX: 1 };
composeTransform([layer]);
createFrameScheduler().schedule(() => true, "read");
