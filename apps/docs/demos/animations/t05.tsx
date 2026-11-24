"use client";
import "@neshel-ui/animations/text.css";
import { NumberRoll } from "@neshel-ui/animations/text";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function T05Example() {
  const [value, setValue] = useState(1234.5);
  return (
    <div className="flex items-center gap-4">
      <p className="text-3xl">
        <NumberRoll value={value} locale="de-DE" format={{ style: "currency", currency: "EUR" }} />
      </p>
      <Button variant="outline" onClick={() => setValue(value + 987.6)}>
        Add
      </Button>
    </div>
  );
}
