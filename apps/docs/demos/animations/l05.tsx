"use client";
import { Reflow } from "@neshel-ui/animations/layout";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function L05Example() {
  const [columns, setColumns] = useState(4);
  return (
    <div className="grid gap-3">
      <Reflow className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="rounded-lg bg-neshel-muted p-3 text-center">
            {index + 1}
          </div>
        ))}
      </Reflow>
      <Button
        variant="outline"
        onClick={() => setColumns(columns === 4 ? 2 : 4)}
        className="justify-self-start"
      >
        Change columns
      </Button>
    </div>
  );
}
