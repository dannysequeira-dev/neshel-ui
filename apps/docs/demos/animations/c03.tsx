"use client";
import "@neshel-ui/animations/cinematic.css";
import { CameraStage, useCamera } from "@neshel-ui/animations/cinematic";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function C03Example() {
  const camera = useCamera();
  const places = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <div className="grid gap-3">
      <CameraStage
        label="Map"
        camera={camera}
        minZoom={0.25}
        className="h-64 rounded-xl border border-neshel-border"
      >
        <div className="grid w-[1000px] grid-cols-3 gap-10 p-10">
          {["North", "East", "South", "West", "Harbour", "Summit"].map((name, index) => (
            <button
              key={name}
              type="button"
              className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground h-40"
              ref={(node) => {
                places.current[index] = node;
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </CameraStage>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            const place = places.current[4];
            if (place) void camera.to({ focus: place });
          }}
        >
          Go to the harbour
        </Button>
        <Button variant="outline" onClick={() => void camera.to({ x: 500, y: 220, zoom: 0.3 })}>
          Overview
        </Button>
      </div>
    </div>
  );
}
