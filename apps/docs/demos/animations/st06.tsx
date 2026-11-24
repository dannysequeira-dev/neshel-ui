"use client";
import {
  type DirectionHeaderOptions,
  directionHeader,
  ScrollEffect,
} from "@neshel-ui/animations/scroll";
import { useState } from "react";

export default function ST06Example() {
  const [source, setSource] = useState<HTMLElement | null>(null);
  return (
    <section
      ref={setSource}
      aria-label="Scrollable article"
      tabIndex={0}
      className="h-56 overflow-y-auto rounded-xl border border-neshel-border"
    >
      {source ? (
        <ScrollEffect
          preset={directionHeader}
          options={{ source, offset: 40 } satisfies DirectionHeaderOptions}
          className="sticky top-0 z-10 bg-neshel-primary p-3 text-neshel-primary-foreground"
        >
          Hides while you scroll down
        </ScrollEffect>
      ) : null}
      {Array.from({ length: 14 }, (_, index) => (
        <p key={index} className="px-4 py-2">
          Paragraph {index + 1}
        </p>
      ))}
    </section>
  );
}
