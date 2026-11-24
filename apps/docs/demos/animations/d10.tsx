"use client";
import "@neshel-ui/animations/gpu.css";
import { DepthParallax } from "@neshel-ui/animations/gpu";
import { useMemo } from "react";
import { depthMap, picture } from "./picture";

export default function D10Example() {
  const depth = useMemo(depthMap, []);
  return (
    <DepthParallax depth={depth} className="w-80 max-w-full rounded-xl">
      <img
        src={picture("Depth", 150, 200)}
        alt="Teal landscape with a raised disc"
        width={640}
        height={400}
      />
    </DepthParallax>
  );
}
