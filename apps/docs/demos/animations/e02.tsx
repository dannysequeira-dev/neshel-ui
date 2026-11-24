"use client";
import { fadeSlide, fadeUp, Reveal } from "@neshel-ui/animations/entrance";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function E02Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-4">
      <Reveal
        preset={fadeUp}
        replayKey={run}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        The fadeUp preset
      </Reveal>
      <Reveal
        preset={fadeSlide}
        options={{ direction: "left", distance: 40 }}
        replayKey={run}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        40 px from the right
      </Reveal>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
