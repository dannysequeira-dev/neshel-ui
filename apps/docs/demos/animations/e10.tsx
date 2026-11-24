"use client";
import { fadeUp, Stagger } from "@neshel-ui/animations/entrance";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function E10Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-4">
      <Stagger
        preset={fadeUp}
        interval={90}
        order="start"
        replayKey={run}
        className="flex flex-wrap gap-3"
      >
        {["Plan", "Build", "Review", "Ship"].map((step) => (
          <div
            key={step}
            className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
          >
            {step}
          </div>
        ))}
      </Stagger>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
