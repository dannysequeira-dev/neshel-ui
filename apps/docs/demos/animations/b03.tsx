"use client";
import "@neshel-ui/animations/ambient.css";
import { Grain } from "@neshel-ui/animations/ambient";

export default function B03Example() {
  return (
    <Grain opacity={0.12} className="rounded-xl bg-neshel-muted p-12 text-neshel-foreground">
      One static texture, optional stepped jitter
    </Grain>
  );
}
