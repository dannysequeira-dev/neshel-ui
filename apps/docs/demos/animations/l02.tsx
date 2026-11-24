"use client";
import "@neshel-ui/animations/layout.css";
import { AutoHeight } from "@neshel-ui/animations/layout";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function L02Example() {
  const [lines, setLines] = useState(1);
  return (
    <div className="grid max-w-sm gap-3">
      <AutoHeight className="rounded-xl border border-neshel-border px-4">
        {Array.from({ length: lines }, (_, index) => (
          <p key={index} className="py-2">
            Line {index + 1}
          </p>
        ))}
      </AutoHeight>
      <Button variant="outline" onClick={() => setLines(lines === 4 ? 1 : lines + 1)}>
        Change the content
      </Button>
    </div>
  );
}
