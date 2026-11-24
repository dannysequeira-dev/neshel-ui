"use client";
import "@neshel-ui/animations/cinematic.css";
import { Letterbox } from "@neshel-ui/animations/cinematic";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function C10Example() {
  const [active, setActive] = useState(false);
  return (
    <div className="grid gap-3">
      <Letterbox
        active={active}
        ratio={2.39}
        className="grid h-56 max-w-md place-items-center rounded-xl bg-neshel-muted"
      >
        The scene
      </Letterbox>
      <Button variant="outline" onClick={() => setActive(!active)} className="justify-self-start">
        Cinema bars
      </Button>
    </div>
  );
}
