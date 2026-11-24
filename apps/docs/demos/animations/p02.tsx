"use client";
import "@neshel-ui/animations/press.css";
import { Press, ripple } from "@neshel-ui/animations/press";
import { Button } from "@neshel-ui/components";

export default function P02Example() {
  return (
    <Press preset={ripple} asChild>
      <Button size="lg">Ripple from the pointer</Button>
    </Press>
  );
}
