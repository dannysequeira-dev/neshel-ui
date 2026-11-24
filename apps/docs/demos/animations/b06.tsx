"use client";
import "@neshel-ui/animations/ambient.css";
import { GridPattern } from "@neshel-ui/animations/ambient";

export default function B06Example() {
  return (
    <GridPattern
      pattern="dots"
      cell={24}
      className="rounded-xl bg-neshel-surface p-12 text-neshel-surface-foreground"
    >
      A seamless one-cell loop
    </GridPattern>
  );
}
