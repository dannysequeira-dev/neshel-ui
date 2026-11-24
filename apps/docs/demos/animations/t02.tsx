"use client";
import "@neshel-ui/animations/text.css";
import { Typewriter } from "@neshel-ui/animations/text";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function T02Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <Typewriter key={run} speed={30} caret="typing" trigger="mount">
        The complete sentence is accessible from the first frame.
      </Typewriter>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
