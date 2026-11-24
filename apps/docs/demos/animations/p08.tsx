"use client";
import { nudge, Press } from "@neshel-ui/animations/press";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function P08Example() {
  const [count, setCount] = useState(0);
  return (
    <div className="flex items-center gap-4">
      <Press
        preset={nudge}
        options={{ trigger: count, angle: 10 }}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        Inbox ({count})
      </Press>
      <Button variant="outline" onClick={() => setCount(count + 1)}>
        New message
      </Button>
    </div>
  );
}
