"use client";
import "@neshel-ui/animations/text.css";
import { Highlight } from "@neshel-ui/animations/text";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function T08Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <p>
        Contrast is{" "}
        <Highlight key={run} trigger="mount">
          checked for you
        </Highlight>{" "}
        at build time.
      </p>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
