"use client";
import { Press, tapBounce } from "@neshel-ui/animations/press";
import { Button } from "@neshel-ui/components";

export default function P03Example() {
  return (
    <Press preset={tapBounce} options={{ strength: 0.5 }} asChild>
      <Button variant="outline">Tap me</Button>
    </Press>
  );
}
