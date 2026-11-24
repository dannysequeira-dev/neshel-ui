"use client";
import "@neshel-ui/animations/text.css";
import { TextReveal } from "@neshel-ui/animations/text";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function T01Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <TextReveal key={run} as="p" split="words" variant="fade-up" trigger="mount">
        Rooted in faith, built with hope.
      </TextReveal>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
