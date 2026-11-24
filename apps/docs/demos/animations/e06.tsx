"use client";
import { clipCircle, clipReveal, Reveal } from "@neshel-ui/animations/entrance";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function E06Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-4">
      <Reveal
        preset={clipReveal}
        options={{ direction: "right" }}
        replayKey={run}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        Inset from the left edge
      </Reveal>
      <Reveal
        preset={clipCircle}
        replayKey={run}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        Circle from the centre
      </Reveal>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
