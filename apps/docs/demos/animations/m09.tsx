"use client";
import "@neshel-ui/animations/media.css";
import { PixelDissolve } from "@neshel-ui/animations/media";
import { Button } from "@neshel-ui/components";
import { useState } from "react";
import { picture } from "./picture";

export default function M09Example() {
  const [index, setIndex] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <PixelDissolve index={index} cell={14} className="h-52 w-80 max-w-full">
        <img src={picture("A", 210, 260)} alt="Blue gradient" />
        <img src={picture("B", 20, 330)} alt="Warm gradient" />
      </PixelDissolve>
      <Button variant="outline" onClick={() => setIndex(1 - index)}>
        Dissolve
      </Button>
    </div>
  );
}
