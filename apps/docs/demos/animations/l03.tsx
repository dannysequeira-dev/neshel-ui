"use client";
import { AnimatedList } from "@neshel-ui/animations/layout";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function L03Example() {
  const [items, setItems] = useState([1, 2, 3]);
  return (
    <div className="grid max-w-sm gap-3">
      <AnimatedList className="grid gap-2">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-neshel-muted p-3">
            Item {item}
          </li>
        ))}
      </AnimatedList>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setItems([Math.max(0, ...items) + 1, ...items])}>
          Add
        </Button>
        <Button variant="outline" onClick={() => setItems(items.slice(1))}>
          Remove first
        </Button>
      </div>
    </div>
  );
}
