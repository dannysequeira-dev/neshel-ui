"use client";
import { useTimeline } from "@neshel-ui/animations/cinematic";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function C01Example() {
  const first = useRef<HTMLDivElement>(null);
  const second = useRef<HTMLDivElement>(null);
  const timeline = useTimeline((tl) => {
    if (!first.current || !second.current) return;
    tl.add({ target: first.current, to: { x: 200 }, duration: 700 });
    tl.label("overlap", "-=300");
    tl.add({ target: second.current, to: { x: 200, rotate: 180 }, duration: 700 }, "overlap");
  }, []);
  return (
    <div className="grid gap-3">
      <div ref={first} className="h-8 w-12 rounded bg-neshel-primary" />
      <div ref={second} className="h-8 w-12 rounded bg-neshel-accent" />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => timeline.play()}>Play</Button>
        <Button variant="outline" onClick={() => timeline.pause()}>
          Pause
        </Button>
        <Button variant="outline" onClick={() => timeline.reverse()}>
          Reverse
        </Button>
        <Button variant="outline" onClick={() => timeline.seek(0.5)}>
          Seek 50 %
        </Button>
      </div>
    </div>
  );
}
