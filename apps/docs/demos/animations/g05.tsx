"use client";
import { motionValue } from "@neshel-ui/animations/core";
import { Gesture, springFollow } from "@neshel-ui/animations/gestures";
import { useMemo } from "react";

export default function G05Example() {
  const x = useMemo(() => motionValue(0), []);
  return (
    <div className="grid max-w-sm gap-4">
      <label className="grid gap-1">
        Target
        <input
          type="range"
          min={0}
          max={240}
          defaultValue={0}
          onChange={(event) => x.set(Number(event.currentTarget.value))}
        />
      </label>
      <Gesture
        preset={springFollow}
        options={{ x }}
        className="size-12 rounded-full bg-neshel-primary"
      />
    </div>
  );
}
