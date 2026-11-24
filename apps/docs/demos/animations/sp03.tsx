"use client";
import "@neshel-ui/animations/scroll.css";
import { ScrollProgressBar } from "@neshel-ui/animations/scroll";
import { useState } from "react";

export default function SP03Example() {
  const [source, setSource] = useState<HTMLElement | null>(null);
  return (
    <div>
      <ScrollProgressBar source={source} position="static" className="text-neshel-primary" />
      <section
        ref={setSource}
        aria-label="Scrollable text"
        tabIndex={0}
        className="h-40 overflow-y-auto rounded-b-xl border border-neshel-border p-4"
      >
        {Array.from({ length: 12 }, (_, index) => (
          <p key={index} className="py-1">
            Paragraph {index + 1}
          </p>
        ))}
      </section>
    </div>
  );
}
