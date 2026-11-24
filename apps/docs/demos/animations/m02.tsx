"use client";
import "@neshel-ui/animations/media.css";
import { BlurUpImage } from "@neshel-ui/animations/media";
import { Button } from "@neshel-ui/components";
import { useState } from "react";
import { picture } from "./picture";

export default function M02Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <BlurUpImage
        key={run}
        replay
        src={picture("Loaded", 20, 330)}
        alt="Warm gradient"
        width={320}
        height={200}
        placeholder="linear-gradient(135deg, #7c2d12, #831843)"
      />
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
