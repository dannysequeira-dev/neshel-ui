"use client";
import "@neshel-ui/animations/text.css";
import { WaveText } from "@neshel-ui/animations/text";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function T07Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <WaveText key={run} amplitude="0.25em" repeat={1} trigger="mount">
        A wave that ends
      </WaveText>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
