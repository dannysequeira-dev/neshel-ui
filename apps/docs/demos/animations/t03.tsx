"use client";
import "@neshel-ui/animations/text.css";
import { ScrambleText } from "@neshel-ui/animations/text";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function T03Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <ScrambleText key={run} seed={3} trigger="mount">
        DETERMINISTIC DECODE
      </ScrambleText>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
