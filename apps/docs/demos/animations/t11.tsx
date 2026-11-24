"use client";
import "@neshel-ui/animations/text.css";
import { motionValue } from "@neshel-ui/animations/core";
import { LineReveal } from "@neshel-ui/animations/text";
import { useMemo } from "react";

export default function T11Example() {
  const source = useMemo(() => motionValue(1), []);
  return (
    <div className="grid gap-3">
      <label className="grid gap-1">
        Progress (pass a ScrollProgress on a page)
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          defaultValue={1}
          onChange={(event) => source.set(Number(event.currentTarget.value))}
        />
      </label>
      <LineReveal source={source} mode="scrub" className="max-w-[36ch]">
        The text family receives progress as a value and never imports the scroll family.
      </LineReveal>
    </div>
  );
}
