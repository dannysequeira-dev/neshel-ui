"use client";
import { FontAxes } from "@neshel-ui/animations/text";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function T10Example() {
  const [bold, setBold] = useState(false);
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-2xl">
        <FontAxes from={{ wght: 300 }} to={{ wght: 800 }} active={bold}>
          Variable weight
        </FontAxes>
      </p>
      <Button variant="outline" aria-pressed={bold} onClick={() => setBold(!bold)}>
        Bold
      </Button>
    </div>
  );
}
