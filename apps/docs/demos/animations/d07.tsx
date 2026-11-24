"use client";
import "@neshel-ui/animations/advanced.css";
import { Glitch, type GlitchControl } from "@neshel-ui/animations/advanced";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function D07Example() {
  const glitch = useRef<GlitchControl | null>(null);
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-3xl font-bold">
        <Glitch controlRef={glitch}>NESHEL SIGNAL</Glitch>
      </p>
      <Button variant="outline" onClick={() => glitch.current?.play()}>
        Play a burst
      </Button>
    </div>
  );
}
