"use client";
import { NumberTick } from "@neshel-ui/animations/press";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function P09Example() {
  const [value, setValue] = useState(1280);
  return (
    <div className="flex items-center gap-4">
      <NumberTick value={value} locale="en-US" className="text-3xl font-semibold" />
      <Button variant="outline" onClick={() => setValue(value + 1375)}>
        Add sales
      </Button>
    </div>
  );
}
