"use client";
import "@neshel-ui/animations/media.css";
import { Crossfade } from "@neshel-ui/animations/media";
import { Button } from "@neshel-ui/components";
import { useState } from "react";
import { picture } from "./picture";

export default function M08Example() {
  const [index, setIndex] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <Crossfade index={index} className="h-52 w-80 max-w-full">
        <img src={picture("One", 210, 260)} alt="Slide one" />
        <img src={picture("Two", 20, 330)} alt="Slide two" />
      </Crossfade>
      <Button variant="outline" onClick={() => setIndex(1 - index)}>
        Next slide
      </Button>
    </div>
  );
}
