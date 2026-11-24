"use client";
import { Hover, magnetic } from "@neshel-ui/animations/hover";
import { Button } from "@neshel-ui/components";

export default function H04Example() {
  return (
    <div className="p-8">
      <Hover preset={magnetic} options={{ strength: 0.5, max: 24 }} asChild>
        <Button>Pulled towards the pointer</Button>
      </Hover>
    </div>
  );
}
