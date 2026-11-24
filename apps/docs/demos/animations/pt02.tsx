"use client";
import "@neshel-ui/animations/page-transitions.css";
import { SharedElement, usePageTransition } from "@neshel-ui/animations/page-transitions";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function PT02Example() {
  const [detail, setDetail] = useState(false);
  const transition = usePageTransition();
  return (
    <div className="grid justify-items-start gap-3">
      <SharedElement name="docs-photo" asChild>
        <div
          key={String(detail)}
          className={`rounded-xl bg-neshel-primary ${detail ? "h-40 w-72" : "h-16 w-24"}`}
        />
      </SharedElement>
      <Button onClick={() => transition.start(() => setDetail(!detail))}>
        {detail ? "Back to the list" : "Open the photo"}
      </Button>
    </div>
  );
}
