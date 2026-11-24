"use client";
import "@neshel-ui/animations/text.css";
import { TextMask } from "@neshel-ui/animations/text";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function T09Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <TextMask key={run} as="p" variant="rise" trigger="mount" className="max-w-[32ch]">
        Each line rises inside its own box, so nothing around it moves.
      </TextMask>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
