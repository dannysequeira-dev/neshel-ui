"use client";
import "@neshel-ui/animations/scroll.css";
import { StickyStack } from "@neshel-ui/animations/scroll";

export default function SP09Example() {
  return (
    <StickyStack top="5rem" offset="1rem" className="grid gap-6">
      {["First", "Second", "Third"].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground h-48"
        >
          {item}
        </div>
      ))}
    </StickyStack>
  );
}
