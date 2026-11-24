"use client";
import { motionValue } from "@neshel-ui/animations/core";
import { useVideoScrub } from "@neshel-ui/animations/media";
import { useMemo, useRef } from "react";

const base = process.env.NESHEL_DOCS_BASE_PATH ?? "";

export default function M06Example() {
  const video = useRef<HTMLVideoElement>(null);
  const progress = useMemo(() => motionValue(0), []);
  useVideoScrub(video, { progress });
  return (
    <div className="grid justify-items-start gap-3">
      <video
        ref={video}
        muted
        playsInline
        preload="auto"
        width={320}
        height={180}
        aria-label="Sample clip"
      >
        <source src={`${base}/animations/scrub.webm`} type="video/webm" />
        <source src={`${base}/animations/scrub.mp4`} type="video/mp4" />
      </video>
      <label className="grid gap-1">
        Position
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={0}
          onInput={(event) => progress.set(Number(event.currentTarget.value) / 100)}
        />
      </label>
    </div>
  );
}
