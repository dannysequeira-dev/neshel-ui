"use client";
import { blurIn, Reveal } from "@neshel-ui/animations/entrance";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function E05Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-4">
      <Reveal
        preset={blurIn}
        options={{ amount: 16, duration: 600 }}
        replayKey={run}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        Comes into focus
      </Reveal>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
