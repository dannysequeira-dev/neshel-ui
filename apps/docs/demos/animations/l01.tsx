"use client";
import { LayoutGroup, LayoutItem } from "@neshel-ui/animations/layout";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function L01Example() {
  const [order, setOrder] = useState(["A", "B", "C", "D"]);
  return (
    <div className="grid justify-items-start gap-3">
      <LayoutGroup>
        <ul className="flex gap-2">
          {order.map((item) => (
            <LayoutItem key={item} asChild>
              <li className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground">
                {item}
              </li>
            </LayoutItem>
          ))}
        </ul>
      </LayoutGroup>
      <Button
        variant="outline"
        onClick={() => setOrder(([head, ...rest]) => [...rest, head as string])}
      >
        Rotate
      </Button>
    </div>
  );
}
