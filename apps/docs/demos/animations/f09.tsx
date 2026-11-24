"use client";
import "@neshel-ui/animations/feedback.css";
import { motionValue } from "@neshel-ui/animations/core";
import { ProgressRing } from "@neshel-ui/animations/feedback";
import { useMemo } from "react";

export default function F09Example() {
  const progress = useMemo(() => motionValue(0.35), []);
  return (
    <div className="flex items-center gap-4">
      <ProgressRing label="Rendering" progress={progress} />
      <input
        type="range"
        aria-label="Ring progress"
        min={0}
        max={100}
        defaultValue={35}
        onInput={(event) => progress.set(Number(event.currentTarget.value) / 100)}
      />
    </div>
  );
}
