"use client";
import "@neshel-ui/animations/layout.css";
import { CrossFade } from "@neshel-ui/animations/layout";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

const slides = ["Short.", "A longer slide: the height follows the new content.", "Third slide."];

export default function L09Example() {
  const [index, setIndex] = useState(0);
  return (
    <div className="grid max-w-sm gap-3">
      <CrossFade swapKey={index} className="rounded-xl border border-neshel-border p-4">
        <p>{slides[index]}</p>
      </CrossFade>
      <Button variant="outline" onClick={() => setIndex((index + 1) % slides.length)}>
        Next
      </Button>
    </div>
  );
}
