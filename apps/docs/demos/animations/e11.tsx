"use client";
import { Reveal, springIn } from "@neshel-ui/animations/entrance";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function E11Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-4">
      <Reveal
        preset={springIn}
        options={{ spring: { stiffness: 320, damping: 14 } }}
        replayKey={run}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        Overshoots, then rests
      </Reveal>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
