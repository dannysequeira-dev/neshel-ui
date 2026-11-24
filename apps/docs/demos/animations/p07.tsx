"use client";
import { Press, shake } from "@neshel-ui/animations/press";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function P07Example() {
  const [errors, setErrors] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <Press
        preset={shake}
        options={{ trigger: errors }}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        <p role="alert">{errors ? `Wrong code (attempt ${errors})` : "Enter your code"}</p>
      </Press>
      <Button onClick={() => setErrors(errors + 1)}>Submit a wrong code</Button>
    </div>
  );
}
