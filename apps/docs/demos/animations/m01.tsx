"use client";
import "@neshel-ui/animations/media.css";
import { KenBurns, type ProgressControl } from "@neshel-ui/animations/media";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";
import { picture } from "./picture";

export default function M01Example() {
  const control = useRef<ProgressControl | null>(null);
  return (
    <div className="grid justify-items-start gap-3">
      <KenBurns
        controlRef={control}
        to={{ scale: 1.25, x: 0.6, y: -0.4 }}
        className="h-56 w-80 max-w-full rounded-xl"
      >
        <img src={picture("Ken Burns", 210, 260)} alt="Blue gradient" width={640} height={400} />
      </KenBurns>
      <Button variant="outline" onClick={() => control.current?.play()}>
        Play again
      </Button>
    </div>
  );
}
