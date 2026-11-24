"use client";
import "@neshel-ui/animations/layout.css";
import { Masonry } from "@neshel-ui/animations/layout";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function L10Example() {
  const [narrow, setNarrow] = useState(false);
  return (
    <div className="grid gap-3">
      <Masonry minColumnWidth={narrow ? 180 : 100} gap={10} style={{ maxWidth: 520 }}>
        {[60, 110, 80, 140, 70, 100].map((height) => (
          <div key={height} style={{ height }} className="rounded-lg bg-neshel-muted p-3">
            {height} px
          </div>
        ))}
      </Masonry>
      <Button variant="outline" onClick={() => setNarrow(!narrow)} className="justify-self-start">
        Change the column width
      </Button>
    </div>
  );
}
