"use client";
import { LoadReveal } from "@neshel-ui/animations/media";
import { Button } from "@neshel-ui/components";
import { useState } from "react";
import { picture } from "./picture";

export default function M03Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <LoadReveal key={run} shape="circle" replay>
        <img src={picture("Revealed", 120, 180)} alt="Green gradient" width={320} height={200} />
      </LoadReveal>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
