"use client";
import "@neshel-ui/animations/gpu.css";
import { Ripple, type RippleControl } from "@neshel-ui/animations/gpu";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";
import { picture } from "./picture";

export default function D06Example() {
  const ripple = useRef<RippleControl | null>(null);
  return (
    <div className="grid justify-items-start gap-3">
      <Ripple controlRef={ripple} className="w-80 max-w-full rounded-xl">
        <img src={picture("Water", 190, 230)} alt="Blue grid" width={640} height={400} />
      </Ripple>
      <Button variant="outline" onClick={() => ripple.current?.impact(0.5, 0.5)}>
        Drop at the centre
      </Button>
    </div>
  );
}
