"use client";
import "@neshel-ui/animations/text.css";
import { GradientText } from "@neshel-ui/animations/text";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function T04Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-3xl font-bold">
        <GradientText key={run} color="#b45309" trigger="mount">
          A band of colour
        </GradientText>
      </p>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
