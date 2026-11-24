"use client";
import "@neshel-ui/animations/advanced.css";
import { RingCarousel, type RingControl } from "@neshel-ui/animations/advanced";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function D03Example() {
  const ring = useRef<RingControl | null>(null);
  return (
    <div className="grid gap-3">
      <RingCarousel
        label="Destinations"
        radius={240}
        controlRef={ring}
        className="h-48 w-full max-w-lg"
      >
        {["Lisbon", "Kyoto", "Quito", "Oslo", "Cusco"].map((city) => (
          <article
            key={city}
            className="h-28 w-36 rounded-xl bg-neshel-primary p-4 text-neshel-primary-foreground"
          >
            {city}
          </article>
        ))}
      </RingCarousel>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => ring.current?.previous()}>
          Previous
        </Button>
        <Button variant="outline" onClick={() => ring.current?.next()}>
          Next
        </Button>
      </div>
    </div>
  );
}
