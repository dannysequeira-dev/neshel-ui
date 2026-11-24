"use client";
import "@neshel-ui/animations/cinematic.css";
import { Chapter, SceneChapters, SceneSegment } from "@neshel-ui/animations/cinematic";
import { fadeUp } from "@neshel-ui/animations/entrance";
import { useState } from "react";

export default function C02Example() {
  const [progress, setProgress] = useState(0.2);
  return (
    <div className="grid gap-4">
      <label className="grid gap-1">
        Progress (a ScrollScene provides it on a page)
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={progress}
          onChange={(event) => setProgress(Number(event.currentTarget.value))}
        />
      </label>
      <SceneChapters progress={progress} className="grid gap-3">
        <Chapter id="arrival">
          <SceneSegment
            effect={fadeUp}
            className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
          >
            Arrival
          </SceneSegment>
        </Chapter>
        <Chapter id="journey" weight={2}>
          <SceneSegment
            from={{ x: -120, opacity: 0 }}
            span={[0, 0.6]}
            className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
          >
            The journey lasts twice as long
          </SceneSegment>
        </Chapter>
      </SceneChapters>
    </div>
  );
}
