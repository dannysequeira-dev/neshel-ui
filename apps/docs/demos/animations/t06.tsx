"use client";
import "@neshel-ui/animations/text.css";
import { RotatingWords, type RotatingWordsControl } from "@neshel-ui/animations/text";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function T06Example() {
  const words = useRef<RotatingWordsControl | null>(null);
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-xl">
        Design systems that are{" "}
        <RotatingWords controlRef={words} words={["calm", "modular", "accessible"]} />
      </p>
      <Button variant="outline" onClick={() => words.current?.pause()}>
        Pause
      </Button>
    </div>
  );
}
