"use client";
import "@neshel-ui/animations/page-transitions.css";
import { RouteProgress } from "@neshel-ui/animations/page-transitions";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function PT07Example() {
  const [pending, setPending] = useState(false);
  const navigate = () => {
    setPending(true);
    setTimeout(() => setPending(false), 1500);
  };
  return (
    <div className="grid justify-items-start gap-3">
      <RouteProgress pending={pending} announce className="text-neshel-primary" />
      <Button onClick={navigate}>Slow navigation</Button>
    </div>
  );
}
