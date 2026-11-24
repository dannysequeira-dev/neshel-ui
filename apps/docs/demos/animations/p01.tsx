"use client";
import { Press, pressScale } from "@neshel-ui/animations/press";
import { Button } from "@neshel-ui/components";

export default function P01Example() {
  return (
    <Press preset={pressScale} options={{ scale: 0.92 }} asChild>
      <Button>Press me</Button>
    </Press>
  );
}
