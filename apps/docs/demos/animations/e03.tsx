"use client";
import { Reveal, scaleIn } from "@neshel-ui/animations/entrance";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function E03Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-4">
      <Reveal
        preset={scaleIn}
        options={{ from: 0.8 }}
        replayKey={run}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        Grows from 80 %
      </Reveal>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
